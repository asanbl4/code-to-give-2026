"""Answer a question: safeguarding filter, then the model.

    medical / self-harm question -> the staff-written refusal, verbatim
    everything else              -> the model, given the whole corpus

Deliberately simple. There is no confidence routing, no threshold band and no
question splitting: the whole corpus is small enough to hand the model in one
prompt, and a model composing from all of it handles "two things at once"
without any help from us.

Two properties are load-bearing and are asserted in the tests:

* medical and self-harm questions never reach the model. That check runs first,
  on its own embedding pass over the refusal entries alone, so no ranking
  decision can route around it;
* every failure path still degrades to a written answer. If the model is slow,
  dead or empty, the nearest curated entry is served instead. This function does
  not raise, so the endpoint cannot 500.

WHAT THIS TRADES AWAY, on purpose and at the user's direction (2026-08-01):
the model now writes text a visitor reads, so it can state things the corpus
does not contain. Measured against qwen3:1.7b, uncovered questions produced
invented institutional commitments -- "you can visit our centres to observe our
programmes and meet people with Down syndrome" among them. The prompt asks for
grounding and the corpus is fuller than it was, but neither is a guarantee.
Questions with no entry (locations, opening hours, fees) are where it will
invent. See the feature README.
"""

import logging

from app.config import get_settings
from app.features.chatbot import index, language, ollama, retrieval
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
- Answer using the reference passages below. They are everything the charity has \
confirmed. If they do not contain the answer, say plainly that you do not know and \
suggest contacting the team -- do not guess.
- Never invent statistics, dates, prices, addresses, opening hours or names. If a \
detail is not in the passages, say you do not have it.
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
    # Correct the locale once, here, so every path below -- the refusal, the
    # generated answer and the curated fallback -- speaks the language asked in.
    request = request.model_copy(
        update={"locale": language.resolve_locale(request.question, request.locale)}
    )

    entries = {entry.id: entry for entry in load_corpus()}
    vector_index = index.load_index()

    ranked, degraded = await _rank(request.question, vector_index, entries)

    # SAFEGUARDING FIRST. A medical or self-harm question is answered by a
    # person's words, never by a 1.7B model. This is checked before anything
    # else so no later branch can route around it.
    refusal = _safeguarding_match(ranked)
    if refusal is not None:
        return _from_entry(refusal, request, entries, route="refused")

    # Ollama is unreachable: there is nothing to generate with, so serve the
    # nearest written answer rather than failing.
    if degraded:
        if not ranked:
            return _refusal(request.locale, route="fallback")
        return _from_entry(ranked[0][0], request, entries, route="fallback")

    return await _generate(ranked, request, entries)


def _safeguarding_match(ranked: list[tuple[Entry, float]]) -> Entry | None:
    """The refusal entry to serve, if any: the TOP match, and only the top.

    Scanning the whole ranked list for any refusal above the floor was tried
    first and is badly wrong -- some refusal entry sits above 0.55 for almost
    any question, so "how can I help" was answered with "call 999". Measured
    2026-08-01, the refusal is *top-ranked* in every question that should
    refuse, including the compound "what do you do and is my child autistic"
    (0.851), and sits 0.16-0.70 below top in every question that should not.

    The floor still matters: "what is the weather in Tokyo" ranks
    refuse-distress top at 0.427, and answering that with crisis text reads as
    broken and cheapens the answer for whoever actually needs it.
    """
    if not ranked:
        return None
    entry, score = ranked[0]
    if entry.is_refusal and score >= settings.chatbot_refusal_confidence:
        return entry
    return None


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
    ranked: list[tuple[Entry, float]],
    request: ChatRequest,
    entries: dict[str, Entry],
) -> ChatResponse:
    """Answer from the whole corpus, falling back to the nearest curated entry.

    Refusal entries are withheld from the context. Handing the model "call 999
    in an emergency" as quotable material for a donation question invites it to
    blend crisis wording into an ordinary answer; the safeguarding check above
    already owns those questions entirely.
    """
    passages = "\n\n".join(
        f"[{entry.id}]\n{entry.answer(request.locale, request.easy_read)}"
        for entry in entries.values()
        if not entry.is_refusal
    )
    system = SYSTEM_PROMPT_EN if request.locale == "en" else SYSTEM_PROMPT_ZH
    user = f"Reference passages:\n\n{passages}\n\nVisitor's question: {request.question}"

    try:
        answer = await ollama.generate(system, user)
    except OllamaUnavailable as exc:
        logger.warning("Generation failed, serving the curated answer: %s", exc)
        answer = ""

    if not answer:
        if not ranked:
            return _refusal(request.locale, route="fallback")
        return _from_entry(ranked[0][0], request, entries, route="fallback")

    # The nearest entry is cited as the source and supplies the action. It is
    # what the answer is most likely drawn from, but the model saw everything,
    # so this is a pointer rather than a provenance claim.
    nearest = ranked[0][0] if ranked else None

    return ChatResponse(
        answer=answer,
        route="generated",
        sources=[]
        if nearest is None
        else [Source(entry_id=nearest.id, label=nearest.triggers(request.locale)[0])],
        action=None if nearest is None else _resolve(nearest.action, request.locale),
        followups=build_followups(nearest, entries, request.locale),
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


def build_followups(
    entry: Entry | None, entries: dict[str, Entry], locale: Locale
) -> list[Followup]:
    """Authored next questions, resolved to their first trigger phrase.

    Authored rather than generated: the suggested path through the site stays
    deliberate instead of being improvised by a small local model.
    """
    if entry is None:
        return []

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
