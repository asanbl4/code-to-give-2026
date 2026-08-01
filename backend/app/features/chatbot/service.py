"""Confidence routing: the one place a score is compared to a threshold.

    score >= high  -> the curated answer, verbatim, no model call
    low <= s < high -> the model composes, strictly from retrieved passages
    score < low    -> refuse generically, and offer a person

Two properties are load-bearing and are asserted in the tests:

* above the floor, an `is_refusal` entry short-circuits before any generation,
  so medical and safeguarding questions can never be answered by a small local
  model. Below the floor the *generic* refusal is used instead, so an off-topic
  question is not served the safeguarding entry it happened to rank nearest;
* every failure path degrades to a written answer. This function does not
  raise, so the endpoint cannot 500.
"""

import asyncio
import logging

from app.config import get_settings
from app.features.chatbot import index, ollama, retrieval, splitting
from app.features.chatbot.corpus import load_corpus
from app.features.chatbot.models import (
    Action,
    ChatRequest,
    ChatResponse,
    Entry,
    Followup,
    Locale,
    ResolvedAction,
    Source,
)
from app.features.chatbot.ollama import OllamaUnavailable

logger = logging.getLogger(__name__)

settings = get_settings()

SYSTEM_PROMPT_EN = """You are the help assistant for Love 21 Foundation, a Hong Kong charity \
for the Down syndrome, autistic and neurodiverse community.

Rules you must follow:
- Answer ONLY using the reference passages given. If they do not contain the answer, say you \
do not know and suggest contacting the team.
- Never invent statistics, dates, prices or names. If a number is not in the passages, do not \
give a number.
- Never suggest donating to a named individual. Donations support programmes.
- Never give medical, diagnostic or therapeutic advice.
- Write plainly and warmly, in short sentences. Two or three sentences is usually enough.
- Lead with what people can do. Never use pity framing.
- Reply in English."""

SYSTEM_PROMPT_ZH = SYSTEM_PROMPT_EN.replace(
    "- Reply in English.",
    "- Reply in Traditional Chinese (繁體中文), never Simplified.",
)

_REFUSAL_FALLBACK_EN = (
    "I'm not sure about that one. Our team can help — please get in touch and "
    "someone will come back to you."
)
_REFUSAL_FALLBACK_ZH = "這個問題我不太確定。我們的團隊可以幫忙——請聯絡我們，同事會回覆你。"

# Appended when a compound question had a part we could not answer. The bug this
# feature fixes is the *silent* drop, so a half that goes unanswered is named.
# The visitor's own words are not quoted back -- repeating a question we failed
# on reads as a taunt.
_PARTIAL_TAIL_EN = (
    "I couldn't answer the rest of your question. Please get in touch and "
    "someone will come back to you."
)
_PARTIAL_TAIL_ZH = "你問題的其餘部分我未能解答。請聯絡我們，同事會回覆你。"

_CONTACT_ACTION = Action(
    label_en="Contact our team",
    label_zh="聯絡我們的團隊",
    href="/contact",
)


async def answer_question(request: ChatRequest) -> ChatResponse:
    """Route one question. Never raises."""
    entries = {entry.id: entry for entry in load_corpus()}
    vector_index = index.load_index()

    parts = splitting.split_question(request.question)

    if len(parts) > 1:
        # One gather, not one round trip per part: four sequential embeds would
        # quadruple the latency of the exact questions this feature exists for.
        results = await asyncio.gather(
            _rank(request.question, vector_index, entries),
            *(_rank(part, vector_index, entries) for part in parts),
        )
        (ranked, degraded), part_results = results[0], list(results[1:])

        # Lexical fallback scores are Jaccard bigram overlap, which occupies a
        # completely different range from cosine -- a correct lexical match
        # rarely reaches chatbot_part_confidence at all. Applying it there would
        # silently reject every part, or invite someone to "fix" that by
        # lowering the threshold for both paths. Degrade to one good answer.
        if not degraded:
            composed = _compose(part_results, request, entries)
            if composed is not None:
                return composed
    else:
        ranked, degraded = await _rank(request.question, vector_index, entries)

    if not ranked:
        return _refusal(request.locale, route="refused")

    entry, score = ranked[0]

    # The confidence floor comes first, including for refusal entries. Every
    # question the corpus does not cover ranks *something* top, and the refusal
    # entries attract off-topic text: "what is the weather in Tokyo" ranked
    # refuse-distress top at 0.427 on the real index. Serving that entry
    # verbatim told a visitor asking about the weather to call 999, which reads
    # as broken and cheapens the answer for the person who actually needs it.
    if score < settings.chatbot_low_confidence:
        return _refusal(request.locale, route="fallback" if degraded else "refused")

    # Above the floor, refusals win over the remaining thresholds: a medical
    # question that happens to score mid-band must still never reach the model.
    if entry.is_refusal:
        return _from_entry(entry, request, entries, route="refused")

    if degraded:
        return _from_entry(entry, request, entries, route="fallback")

    if score >= settings.chatbot_high_confidence:
        return _from_entry(entry, request, entries, route="curated")

    return await _generate(entry, ranked, request, entries)


async def _rank(
    question: str,
    vector_index: index.VectorIndex | None,
    entries: dict[str, Entry],
) -> tuple[list[tuple[Entry, float]], bool]:
    """(ranked entries, degraded). Degraded means no embeddings were available."""
    if vector_index is None:
        logger.warning("No index.json; using lexical retrieval")
        return retrieval.rank_lexically(question, entries), True

    try:
        return await retrieval.rank(question, vector_index, entries), False
    except OllamaUnavailable as exc:
        logger.warning("Embedding unavailable, using lexical retrieval: %s", exc)
        return retrieval.rank_lexically(question, entries), True


async def _generate(
    entry: Entry,
    ranked: list[tuple[Entry, float]],
    request: ChatRequest,
    entries: dict[str, Entry],
) -> ChatResponse:
    """Compose from the top passages, falling back to the best curated answer.

    Refusal entries are withheld from the context. The corpus is small enough
    that they land in the top few for almost any question, and handing the model
    "call 999 in an emergency" as reference material for a donation question
    invites it to blend crisis wording into an ordinary answer. The prompt
    discourages that; excluding the text removes the possibility. `entry` is
    ranked[0] and never a refusal here -- those short-circuit above -- so this
    can never empty the context.
    """
    passages = "\n\n".join(
        f"[{candidate.id}]\n{candidate.answer(request.locale, request.easy_read)}"
        for candidate, _ in ranked[:4]
        if not candidate.is_refusal
    )
    system = SYSTEM_PROMPT_EN if request.locale == "en" else SYSTEM_PROMPT_ZH
    user = f"Reference passages:\n\n{passages}\n\nVisitor's question: {request.question}"

    try:
        answer = await ollama.generate(system, user)
    except OllamaUnavailable as exc:
        logger.warning("Generation failed, serving the curated answer: %s", exc)
        return _from_entry(entry, request, entries, route="fallback")

    if not answer:
        return _from_entry(entry, request, entries, route="fallback")

    return ChatResponse(
        answer=answer,
        route="generated",
        sources=[Source(entry_id=entry.id, label=entry.triggers(request.locale)[0])],
        action=_resolve(entry.action, request.locale),
        followups=build_followups(entry, entries, request.locale),
        locale=request.locale,
    )


def _compose(
    part_results: list[tuple[list[tuple[Entry, float]], bool]],
    request: ChatRequest,
    entries: dict[str, Entry],
) -> ChatResponse | None:
    """Stitch the parts we can answer. None means "use the whole question".

    Returning None rather than a half-answer is what makes splitting safe: a
    bad split costs the enhancement, never a correct answer.
    """
    accepted: list[tuple[Entry, float]] = []
    seen: set[str] = set()
    rejected = False

    for ranked, _ in part_results:
        if not ranked:
            rejected = True
            continue
        entry, score = ranked[0]

        # A refusal in ANY part decides the whole response. Answering the
        # innocuous half of "what do you do and is my child autistic" buries
        # the response that matters underneath a charity blurb.
        if entry.is_refusal and score >= settings.chatbot_low_confidence:
            return _from_entry(entry, request, entries, route="refused")

        if entry.is_refusal or score < settings.chatbot_part_confidence:
            rejected = True
            continue
        if entry.id in seen:
            continue
        seen.add(entry.id)
        accepted.append((entry, score))

    if not accepted:
        return None

    accepted.sort(key=lambda pair: pair[1], reverse=True)
    answer = "\n\n".join(entry.answer(request.locale, request.easy_read) for entry, _ in accepted)
    if rejected:
        tail = _PARTIAL_TAIL_EN if request.locale == "en" else _PARTIAL_TAIL_ZH
        answer = f"{answer}\n\n{tail}"

    # One primary action per screen (CONTEXT.md 8). When a part went
    # unanswered, reaching a person beats the top entry's own link.
    action = (
        _CONTACT_ACTION.resolve(request.locale)
        if rejected
        else _resolve(accepted[0][0].action, request.locale)
    )

    return ChatResponse(
        answer=answer,
        route="composed" if len(accepted) > 1 else "curated",
        sources=[
            Source(entry_id=entry.id, label=entry.triggers(request.locale)[0])
            for entry, _ in accepted
        ],
        action=action,
        followups=_compose_followups(accepted, entries, request.locale),
        locale=request.locale,
    )


def _compose_followups(
    accepted: list[tuple[Entry, float]],
    entries: dict[str, Entry],
    locale: Locale,
) -> list[Followup]:
    """Authored next questions across every entry quoted, minus what we answered."""
    answered = {entry.id for entry, _ in accepted}
    followups: list[Followup] = []
    seen: set[str] = set()

    for entry, _ in accepted:
        for followup_id in entry.followups:
            if followup_id in answered or followup_id in seen:
                continue
            target = entries.get(followup_id)
            if target is None:
                continue
            triggers = target.triggers(locale)
            if not triggers:
                continue
            seen.add(followup_id)
            followups.append(Followup(label=triggers[0], question=triggers[0]))
            if len(followups) == 3:
                return followups
    return followups


def _from_entry(
    entry: Entry,
    request: ChatRequest,
    entries: dict[str, Entry],
    route: str,
) -> ChatResponse:
    return ChatResponse(
        answer=entry.answer(request.locale, request.easy_read),
        route=route,  # type: ignore[arg-type]
        sources=[Source(entry_id=entry.id, label=entry.triggers(request.locale)[0])],
        action=_resolve(entry.action, request.locale),
        followups=build_followups(entry, entries, request.locale),
        locale=request.locale,
    )


def _resolve(action: Action | None, locale: Locale) -> ResolvedAction | None:
    """Pick the label for this locale. The browser receives one, never both."""
    return None if action is None else action.resolve(locale)


def _refusal(locale: Locale, route: str) -> ChatResponse:
    return ChatResponse(
        answer=_REFUSAL_FALLBACK_EN if locale == "en" else _REFUSAL_FALLBACK_ZH,
        route=route,  # type: ignore[arg-type]
        sources=[],
        action=_CONTACT_ACTION.resolve(locale),
        followups=[],
        locale=locale,
    )


def build_followups(entry: Entry, entries: dict[str, Entry], locale: Locale) -> list[Followup]:
    """Authored next questions, resolved to their first trigger phrase.

    Authored rather than generated: the suggested path through the site stays
    deliberate instead of being improvised by a small local model.
    """
    followups: list[Followup] = []
    for followup_id in entry.followups:
        target = entries.get(followup_id)
        if target is None:
            continue
        triggers = target.triggers(locale)
        if not triggers:
            continue
        followups.append(Followup(label=triggers[0], question=triggers[0]))
    return followups
