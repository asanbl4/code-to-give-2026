"""Split a compound question into the questions it actually contains.

Pure and deterministic -- no model call, no I/O, no state. A visitor who asks
two things at once should be answered twice, and the only reliable way to get
two answers out of retrieval is to embed two questions: a compound question
embeds to a blend that matches everything mediocrely and nothing precisely.
Measured on 2026-08-01, "What is Love 21 and what does HK$500 fund?" scores
0.729 whole against 0.975 for its first half alone. See
docs/superpowers/specs/2026-08-01-multi-part-questions-design.md.

Rule-based rather than model-driven on purpose: this has to be offline-testable,
sub-millisecond, and maintainable by a five-person charity.

Returning a one-element list is the safe default and the common case. The caller
reads that as "not compound" and takes the ordinary path, so a bad split can
only ever cost the enhancement -- never a correct answer.
"""

import re

#: Beyond this, a question is rambling rather than compound. Four stacked
#: answers does not read as an answer, so we treat it as one question.
MAX_PARTS = 3

#: Guards against degenerate fragments ("a", "?"). The interrogative test below
#: does the real work; this only stops empty-ish noise reaching the index.
_MIN_PART_CHARS = 3

_TERMINATORS = re.compile(r"[?？。!！]+")

#: Deliberately short. Every addition risks splitting a noun phrase, and the
#: interrogative guard is what makes even these safe.
_CONJUNCTIONS = re.compile(r"\s+and\s+also\s+|\s+and\s+|、|，同時|和")

#: Terminal punctuation splits "what do you do? And can my child join?" into
#: parts, the second of which still starts with the conjunction. Left in place
#: it becomes part of the embedded text.
_LEADING_CONJUNCTION = re.compile(r"^(and\s+also\s+|and\s+|、|和)", re.IGNORECASE)

_INTERROGATIVE_EN = re.compile(
    r"\b(what|how|who|whom|whose|when|where|why|which|can|could|do|does|did|is|are|"
    r"was|were|should|will|would|may|tell)\b",
    re.IGNORECASE,
)
_INTERROGATIVE_ZH = re.compile(r"甚麼|什麼|如何|怎樣|怎麼|誰|幾時|哪|可以|是否|嗎|呢|多少|幾多")


def split_question(question: str) -> list[str]:
    """The questions inside `question`. One element means "not compound"."""
    stripped = question.strip()

    # Terminators come off first either way, so a part produced by a conjunction
    # is punctuation-free exactly like one produced by a full stop. Splitting
    # the raw text here would leave "what does HK$500 fund?" carrying its "?".
    parts = _clean(_TERMINATORS.split(stripped))
    if len(parts) < 2:
        parts = _clean(_split_on_conjunctions(parts[0] if parts else stripped))

    if len(parts) < 2 or len(parts) > MAX_PARTS:
        return [stripped]
    return parts


def _split_on_conjunctions(text: str) -> list[str]:
    """Split on 'and' only when both sides are themselves questions.

    "nutrition and dietetics" is one topic; "what do you do and can my child
    join" is two questions. The difference is not length -- it is whether each
    side asks something.
    """
    candidates = _clean(_CONJUNCTIONS.split(text))
    if len(candidates) < 2:
        return [text]
    if not all(_looks_interrogative(candidate) for candidate in candidates):
        return [text]
    return candidates


def _looks_interrogative(text: str) -> bool:
    return bool(_INTERROGATIVE_EN.search(text) or _INTERROGATIVE_ZH.search(text))


def _clean(parts: list[str]) -> list[str]:
    cleaned = []
    for part in parts:
        stripped = _LEADING_CONJUNCTION.sub("", part.strip()).strip()
        if len(stripped) >= _MIN_PART_CHARS:
            cleaned.append(stripped)
    return cleaned
