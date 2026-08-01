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

import logging

from app.config import get_settings
from app.features.chatbot import index, ollama, retrieval
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

_CONTACT_ACTION = Action(
    label_en="Contact our team",
    label_zh="聯絡我們的團隊",
    href="/contact",
)


async def answer_question(request: ChatRequest) -> ChatResponse:
    """Route one question. Never raises."""
    entries = {entry.id: entry for entry in load_corpus()}
    vector_index = index.load_index()

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
        source=Source(entry_id=entry.id, label=entry.triggers(request.locale)[0]),
        action=_resolve(entry.action, request.locale),
        followups=build_followups(entry, entries, request.locale),
        locale=request.locale,
    )


def _from_entry(
    entry: Entry,
    request: ChatRequest,
    entries: dict[str, Entry],
    route: str,
) -> ChatResponse:
    return ChatResponse(
        answer=entry.answer(request.locale, request.easy_read),
        route=route,  # type: ignore[arg-type]
        source=Source(entry_id=entry.id, label=entry.triggers(request.locale)[0]),
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
        source=None,
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
