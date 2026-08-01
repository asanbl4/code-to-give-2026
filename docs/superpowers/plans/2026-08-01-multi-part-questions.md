# Multi-Part Questions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a visitor asks two things at once and both are covered by the corpus, answer both — instead of silently discarding all but the first.

**Architecture:** A compound question embeds to one blurred vector that matches everything mediocrely. A new pure `splitting.py` breaks the question into parts; `service.py` ranks each part concurrently and stitches the staff-written answers. Generation stays off — no model-authored text reaches a visitor.

**Tech Stack:** Python 3.12+, FastAPI, pydantic, pytest/anyio, uv. Frontend types in TypeScript (Next.js 16). Ollama `bge-m3` for embeddings only.

**Spec:** `docs/superpowers/specs/2026-08-01-multi-part-questions-design.md`

## Global Constraints

- **Generation stays off.** `chatbot_high_confidence == chatbot_low_confidence == 0.55` must not change. `test_shipped_thresholds_disable_generation` must stay green.
- **No new dependencies.** Standard library only (`re`, `asyncio`). Pure-Python cosine stays; no numpy.
- **Never assert new facts about the charity.** Task 4 adds *triggers* (ways of asking) only — never new answer text. Writing answers is Task 11 of the chatbot plan and remains out of scope.
- **Every failure path degrades to a written answer.** `service.answer_question` must not raise; the endpoint cannot 500.
- **Ruff clean:** `uv run ruff check .` (select E,F,I,UP — it wants `datetime.UTC`, not `timezone.utc`). Line length follows existing config.
- **`models.py` and `frontend/features/chatbot/types.ts` change together.** They carry a "keep in sync" comment.
- **Rebuild the index after any YAML edit:** `uv run python -m app.features.chatbot.build_index`. A test fails if you forget.
- All backend commands run from `backend/`.

---

### Task 1: Question splitting

Pure, offline, no I/O. Nothing else depends on it yet, so it lands standalone.

**Files:**
- Create: `backend/app/features/chatbot/splitting.py`
- Test: `backend/tests/test_chatbot_splitting.py`

**Interfaces:**
- Consumes: nothing.
- Produces: `split_question(question: str) -> list[str]`. Returns 2–3 parts when the question is confidently compound, otherwise a one-element list containing the stripped original. Callers treat a one-element list as "not compound".

**Design note — deviation from the spec, deliberate:** the spec proposed a *minimum length* guard to stop "nutrition and dietetics" fracturing. This implements an **interrogative-marker** guard instead: a conjunction only splits if *every* resulting side contains a question word. That targets the failure directly rather than by proxy — "運動和營養" ("sport and nutrition") is short *and* non-interrogative, but a long noun phrase would defeat a length guard while the interrogative check still holds. A 3-character floor remains as a cheap guard against degenerate empty fragments.

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/test_chatbot_splitting.py`:

```python
"""Splitting is pure, so these tests are pure -- no index, no Ollama, no app.

The load-bearing assertion is the negative one: anything not confidently
compound must come back as a single element, because that is what makes the
caller fall through to the existing, known-good path.
"""

import pytest

from app.features.chatbot.splitting import split_question


@pytest.mark.parametrize(
    "question",
    [
        "What is Love 21?",
        "where does my money go",
        "愛21是甚麼？",
        "",
        "   ",
    ],
)
def test_single_questions_are_not_split(question: str) -> None:
    assert len(split_question(question)) == 1


def test_splits_on_english_conjunction() -> None:
    parts = split_question("What is Love 21 and what does HK$500 fund?")
    assert parts == ["What is Love 21", "what does HK$500 fund"]


def test_splits_on_terminal_punctuation() -> None:
    parts = split_question("What is Love 21? What does HK$500 fund?")
    assert parts == ["What is Love 21", "What does HK$500 fund"]


def test_splits_chinese_on_terminal_punctuation() -> None:
    parts = split_question("愛21是甚麼？HK$500可以資助甚麼？")
    assert parts == ["愛21是甚麼", "HK$500可以資助甚麼"]


def test_does_not_split_a_noun_phrase() -> None:
    """'nutrition and dietetics' is one topic, not two questions."""
    assert split_question("tell me about nutrition and dietetics") == [
        "tell me about nutrition and dietetics"
    ]


def test_does_not_split_a_chinese_noun_phrase() -> None:
    assert split_question("運動和營養") == ["運動和營養"]


def test_both_sides_must_look_like_questions() -> None:
    """One interrogative side is not enough -- 'and' is usually not a joint."""
    assert split_question("what do you do and thanks for your help") == [
        "what do you do and thanks for your help"
    ]


def test_four_parts_are_treated_as_one_question() -> None:
    """Four stacked answers is not an answer. Cap and fall through."""
    question = "what is Love 21? who can join? how much is a class? is it free?"
    assert split_question(question) == [question]


def test_a_statement_half_does_not_split() -> None:
    """Both sides must ask something.

    "what do you do and I want to hurt myself" stays whole -- 'I want to hurt
    myself' contains no question word. That is safe rather than lucky: the
    whole question still ranks, and distress language retrieves refuse-distress
    at high confidence on the ordinary single-question path.
    """
    question = "what do you do and I want to hurt myself"
    assert split_question(question) == [question]


def test_a_leading_conjunction_is_stripped() -> None:
    """Terminator splitting leaves 'and' stranded at the front of part two."""
    assert split_question("what do you do? And can my child join?") == [
        "what do you do",
        "can my child join",
    ]


def test_parts_are_stripped_and_empty_fragments_dropped() -> None:
    parts = split_question("what do you do?  can my child join?  ")
    assert parts == ["what do you do", "can my child join"]
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `uv run pytest tests/test_chatbot_splitting.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.features.chatbot.splitting'`

- [ ] **Step 3: Write the implementation**

Create `backend/app/features/chatbot/splitting.py`:

```python
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

    parts = _clean(_TERMINATORS.split(stripped))
    if len(parts) < 2:
        parts = _clean(_split_on_conjunctions(stripped))

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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `uv run pytest tests/test_chatbot_splitting.py -v`
Expected: PASS, 15 tests (11 functions, 5 parametrised cases in the first).

- [ ] **Step 5: Run the full suite and lint**

Run: `uv run pytest && uv run ruff check .`
Expected: all pass. Nothing imports `splitting` yet, so no existing behaviour can have changed.

- [ ] **Step 6: Commit**

```bash
git add app/features/chatbot/splitting.py tests/test_chatbot_splitting.py
git commit -m "feat(chatbot): split compound questions into their parts

Pure and rule-based. A conjunction only splits when both sides are
themselves interrogative, so 'nutrition and dietetics' stays whole while
'what do you do and can my child join' becomes two questions.

Nothing calls this yet."
```

---

### Task 2: `sources` on the API boundary

A mechanical shape change with no behaviour change, landed on its own so Task 3's diff is pure routing. A composed answer genuinely has two sources; a one-element list beats a special case.

**Files:**
- Modify: `backend/app/features/chatbot/models.py:12` (Route), `:99-109` (ChatResponse)
- Modify: `backend/app/features/chatbot/service.py:155-194` (three response constructors)
- Modify: `backend/tests/test_chatbot_service.py:223,235,248,263`
- Modify: `frontend/features/chatbot/types.ts:6,26`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `ChatResponse.sources: list[Source]` replacing `source: Source | None`. `Route` gains the `"composed"` member. Task 3 constructs `ChatResponse(sources=[...])`.

- [ ] **Step 1: Update the response model**

In `backend/app/features/chatbot/models.py`, change line 12:

```python
Route = Literal["curated", "generated", "refused", "fallback", "composed"]
```

and in `ChatResponse`, replace the `source` field:

```python
    answer: str
    route: Route
    #: Every entry quoted in `answer`, in the order they appear. Empty for a
    #: generic refusal. A composed answer has one per part, which is why this
    #: is a list rather than the single source it used to be.
    sources: list[Source] = Field(default_factory=list)
    action: ResolvedAction | None = None
    followups: list[Followup] = Field(default_factory=list)
    locale: Locale
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `uv run pytest tests/test_chatbot_service.py -v`
Expected: FAIL — `AttributeError: 'ChatResponse' object has no attribute 'source'` in the four tests, plus pydantic errors from `service.py` still passing `source=`.

- [ ] **Step 3: Update the three response constructors**

In `backend/app/features/chatbot/service.py`, in `_generate`, replace the `source=` argument:

```python
        sources=[Source(entry_id=entry.id, label=entry.triggers(request.locale)[0])],
```

In `_from_entry`, the same replacement:

```python
        sources=[Source(entry_id=entry.id, label=entry.triggers(request.locale)[0])],
```

In `_refusal`, replace `source=None` with:

```python
        sources=[],
```

- [ ] **Step 4: Update the four test assertions**

In `backend/tests/test_chatbot_service.py`, replace each:

- line 223: `assert response.sources == [], "an off-topic question must not cite the distress entry"`
- line 235: `assert response.sources == []`
- line 248: `assert response.sources != []`
- line 263: `assert response.sources != []`

- [ ] **Step 5: Run the backend tests**

Run: `uv run pytest && uv run ruff check .`
Expected: PASS, same test count as before this task.

- [ ] **Step 6: Update the frontend types**

In `frontend/features/chatbot/types.ts`, line 6:

```typescript
export type Route = "curated" | "generated" | "refused" | "fallback" | "composed";
```

and in `ChatResponse`, line 26:

```typescript
  sources: Source[];
```

- [ ] **Step 7: Verify the frontend still typechecks**

Run from `frontend/`: `npx tsc --noEmit && npm run lint`
Expected: PASS. No component reads `response.source` — it is referenced only in `types.ts` — so nothing else needs touching.

- [ ] **Step 8: Commit**

```bash
git add backend/app/features/chatbot/models.py backend/app/features/chatbot/service.py backend/tests/test_chatbot_service.py frontend/features/chatbot/types.ts
git commit -m "refactor(chatbot): a response cites a list of sources

A composed answer quotes two entries, so one nullable source no longer
fits. One-element lists beat a special case. Adds the 'composed' route
member ahead of the routing that emits it. No behaviour change."
```

---

### Task 3: Compound routing

The substance. Ranks each part concurrently, stitches the curated answers, and falls through to today's path whenever the split does not earn its keep.

**Files:**
- Modify: `backend/app/config.py:86` (add setting after `chatbot_low_confidence`)
- Modify: `backend/app/features/chatbot/service.py` (imports, `answer_question`, new helpers, new constants)
- Modify: `backend/.env.example`
- Modify: `backend/app/features/chatbot/README.md` (route table)
- Test: `backend/tests/test_chatbot_service.py`

**Interfaces:**
- Consumes: `splitting.split_question(question) -> list[str]` (Task 1); `ChatResponse(sources=[...])` and the `"composed"` route (Task 2).
- Produces: no new public surface. `answer_question(request) -> ChatResponse` keeps its signature.

**Ambiguity resolved here:** the spec asks for "the highest-scoring accepted part's action" *and* "the Contact action when a part is rejected". Those collide, and CONTEXT.md §8 allows one primary action. **Contact wins when any part was rejected** — the unanswered half is the more useful next step. Otherwise the top entry's action.

- [ ] **Step 1: Add the threshold setting**

In `backend/app/config.py`, immediately after `chatbot_low_confidence` (line 86):

```python
    # Acceptance test for ONE PART of a compound question -- deliberately not a
    # reuse of chatbot_low_confidence, which is too low to be safe here.
    #
    # Measured part scores on 2026-08-01 (6 entries), sorted:
    #   1.000 0.979 0.975 0.961 0.718 0.692 | 0.663 0.643 0.600
    # The 0.643 is "How do I volunteer?" matching donate-monthly-or-one-off
    # with a +0.012 gap -- volunteering has no entry at all. It outranks two
    # genuine matches, so no pure score cut separates noise from signal on a
    # corpus this small, and the top-1/top-2 gap does not either (genuine
    # matches produced +0.629 and +0.029 alike).
    #
    # 0.70 is therefore conservative on purpose: a genuine part below it gets
    # the contact line instead of a wrong answer, which is the right way to
    # fail. Re-measure once the corpus grows.
    chatbot_part_confidence: float = 0.70
```

- [ ] **Step 2: Document the setting**

In `backend/.env.example`, alongside the other `CHATBOT_` entries:

```
# Cosine score one part of a two-part question must reach to be answered.
# Higher than CHATBOT_LOW_CONFIDENCE on purpose -- see app/config.py.
CHATBOT_PART_CONFIDENCE=0.70
```

- [ ] **Step 3: Write the failing tests**

Append to `backend/tests/test_chatbot_service.py`:

```python
def _force_scores_by_part(monkeypatch, table: dict[str, tuple[str, float]]) -> None:
    """Pin retrieval per question string.

    Compound routing ranks the whole question AND each part, so the single
    `_force_score` helper above cannot express it -- every call would return
    the same entry. Keys are matched exactly against the text being ranked.
    """
    from app.features.chatbot.corpus import load_corpus

    corpus = {entry.id: entry for entry in load_corpus()}

    async def fake_rank(question, vector_index, entries):
        if question not in table:
            return []
        entry_id, score = table[question]
        return [(corpus[entry_id], score)]

    monkeypatch.setattr(service.retrieval, "rank", fake_rank)


@pytest.mark.anyio
async def test_compound_question_answers_both_halves(monkeypatch, fake_ollama) -> None:
    _force_scores_by_part(
        monkeypatch,
        {
            "What is Love 21 and what does HK$500 fund?": ("about-what-is-love21", 0.72),
            "What is Love 21": ("about-what-is-love21", 0.97),
            "what does HK$500 fund": ("donate-what-500-funds", 0.91),
        },
    )

    response = await service.answer_question(
        ChatRequest(question="What is Love 21 and what does HK$500 fund?")
    )

    assert response.route == "composed"
    assert [source.entry_id for source in response.sources] == [
        "about-what-is-love21",
        "donate-what-500-funds",
    ]
    assert "\n\n" in response.answer
    assert not fake_ollama.generate_calls, "composing must not call the model"


@pytest.mark.anyio
async def test_a_refusal_in_any_part_dominates(monkeypatch, fake_ollama) -> None:
    """Answering the innocuous half buries the half that matters."""
    _force_scores_by_part(
        monkeypatch,
        {
            "what do you do and is my child autistic?": ("about-what-is-love21", 0.60),
            "what do you do": ("about-what-is-love21", 0.97),
            "is my child autistic": ("refuse-medical-advice", 0.88),
        },
    )

    response = await service.answer_question(
        ChatRequest(question="what do you do and is my child autistic?")
    )

    assert response.route == "refused"
    assert [source.entry_id for source in response.sources] == ["refuse-medical-advice"]
    assert "Love 21 is a Hong Kong charity" not in response.answer
    assert not fake_ollama.generate_calls


@pytest.mark.anyio
async def test_two_parts_hitting_one_entry_answer_once(monkeypatch, fake_ollama) -> None:
    _force_scores_by_part(
        monkeypatch,
        {
            "what do you do and who are you?": ("about-what-is-love21", 0.80),
            "what do you do": ("about-what-is-love21", 0.97),
            "who are you": ("about-what-is-love21", 0.95),
        },
    )

    response = await service.answer_question(
        ChatRequest(question="what do you do and who are you?")
    )

    assert len(response.sources) == 1
    assert response.answer.count("Love 21 is a Hong Kong charity") == 1


@pytest.mark.anyio
async def test_an_uncovered_part_is_named_not_dropped(monkeypatch, fake_ollama) -> None:
    """The bug being fixed is the silent drop. Say the half went unanswered."""
    _force_scores_by_part(
        monkeypatch,
        {
            "what do you do and how do I volunteer?": ("about-what-is-love21", 0.63),
            "what do you do": ("about-what-is-love21", 0.97),
            "how do I volunteer": ("donate-monthly-or-one-off", 0.64),  # below 0.70
        },
    )

    response = await service.answer_question(
        ChatRequest(question="what do you do and how do I volunteer?")
    )

    assert [source.entry_id for source in response.sources] == ["about-what-is-love21"]
    assert "get in touch" in response.answer.lower()
    assert response.action is not None
    assert response.action.href == "/contact", "the unanswered half is the useful next step"


@pytest.mark.anyio
async def test_no_acceptable_part_falls_back_to_the_whole_question(
    monkeypatch, fake_ollama
) -> None:
    _force_scores_by_part(
        monkeypatch,
        {
            "what do you do and how do I volunteer?": ("about-what-is-love21", 0.80),
            "what do you do": ("about-what-is-love21", 0.40),
            "how do I volunteer": ("donate-monthly-or-one-off", 0.30),
        },
    )

    response = await service.answer_question(
        ChatRequest(question="what do you do and how do I volunteer?")
    )

    assert response.route == "curated", "falls through to today's path"
    assert [source.entry_id for source in response.sources] == ["about-what-is-love21"]


@pytest.mark.anyio
async def test_degraded_ranking_skips_the_compound_path(monkeypatch, fake_ollama) -> None:
    """Lexical scores occupy a different range; 0.70 would reject everything."""
    monkeypatch.setattr(service.index, "load_index", lambda: None)

    response = await service.answer_question(
        ChatRequest(question="what do you do and who can join?")
    )

    assert response.route in {"fallback", "refused"}
    assert response.route != "composed"


@pytest.mark.anyio
async def test_single_questions_are_unaffected(monkeypatch, fake_ollama) -> None:
    _force_score(monkeypatch, "donate-what-500-funds", 0.92)

    response = await service.answer_question(ChatRequest(question="where does my money go"))

    assert response.route == "curated"
    assert len(response.sources) == 1
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `uv run pytest tests/test_chatbot_service.py -v -k "compound or refusal_in_any or one_entry or uncovered_part or acceptable_part or degraded_ranking"`
Expected: FAIL — routes come back `curated` with one source, because nothing splits yet.

- [ ] **Step 5: Add the imports and the trailing-line constants**

In `backend/app/features/chatbot/service.py`, add `import asyncio` above `import logging`, and add `splitting` to the feature import:

```python
from app.features.chatbot import index, ollama, retrieval, splitting
```

Then, after `_REFUSAL_FALLBACK_ZH`:

```python
# Appended when a compound question had a part we could not answer. The bug this
# feature fixes is the *silent* drop, so a half that goes unanswered is named.
# The visitor's own words are not quoted back -- repeating a question we failed
# on reads as a taunt.
_PARTIAL_TAIL_EN = (
    "I couldn't answer the rest of your question. Please get in touch and "
    "someone will come back to you."
)
_PARTIAL_TAIL_ZH = "你問題的其餘部分我未能解答。請聯絡我們，同事會回覆你。"
```

- [ ] **Step 6: Rewrite `answer_question` to rank parts concurrently**

Replace the body of `answer_question` above the `if not ranked:` guard:

```python
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
        (ranked, degraded), part_results = results[0], results[1:]

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
    ...
```

Everything from `entry, score = ranked[0]` onward is unchanged.

- [ ] **Step 7: Add the composition helpers**

Add to `backend/app/features/chatbot/service.py`, after `_generate`:

```python
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
        # innocuous half of "what do you do and I want to hurt myself" buries
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
    answer = "\n\n".join(
        entry.answer(request.locale, request.easy_read) for entry, _ in accepted
    )
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
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `uv run pytest tests/test_chatbot_service.py -v`
Expected: PASS, including every pre-existing test. If `test_shipped_thresholds_disable_generation` fails, the thresholds were touched — revert that.

- [ ] **Step 9: Run the full suite and lint**

Run: `uv run pytest && uv run ruff check .`
Expected: all pass.

- [ ] **Step 10: Update the feature README route table**

In `backend/app/features/chatbot/README.md`, add a row to the route table after `curated`:

```markdown
| `composed` | Two halves of one question, each a staff-written answer, stitched. No model call. |
```

and after the table, a short paragraph:

```markdown
A question that asks two things at once is split into parts and each part is
retrieved separately, because a compound question embeds to one blurred vector:
"What is Love 21 and what does HK$500 fund?" scores 0.729 as a whole and 0.975
for its first half alone. Parts must clear `CHATBOT_PART_CONFIDENCE` (0.70,
higher than the ordinary floor) to be answered; a part below it is named as
unanswered rather than dropped. A refusal in any part decides the whole
response. This adds no model call — `composed` answers are staff-written text
in both halves.
```

- [ ] **Step 11: Commit**

```bash
git add app/config.py .env.example app/features/chatbot/service.py app/features/chatbot/README.md tests/test_chatbot_service.py
git commit -m "feat(chatbot): answer both halves of a two-part question

A compound question embedded to one blurred vector, retrieval returned one
mediocre match, and every half but the first was silently dropped. Parts are
now ranked concurrently and their curated answers stitched.

A refusal in any part dominates the response; an unanswerable part is named
rather than dropped; a degraded (lexical) ranking skips the path entirely,
because Jaccard scores do not share a range with cosine. No model call is
added -- both halves are staff-written text."
```

---

### Task 4: Trigger enrichment and recalibration

`chatbot_part_confidence` at 0.70 rejects genuine parts, because entries lack triggers phrased the way people ask. Adding triggers asserts no new fact — only new ways of asking about approved answers.

**Files:**
- Modify: `backend/app/features/chatbot/knowledge/donating.yaml`
- Modify: `backend/app/features/chatbot/knowledge/about.yaml`
- Modify: `backend/app/features/chatbot/build_index.py:18` (`_PROBES`)
- Regenerate: `backend/app/features/chatbot/index.json`

**Interfaces:**
- Consumes: `chatbot_part_confidence` from Task 3.
- Produces: no code surface. A larger index and possibly a retuned threshold.

- [ ] **Step 1: Add triggers to the donation entry**

In `backend/app/features/chatbot/knowledge/donating.yaml`, under `donate-what-500-funds`, extend the trigger lists. **Do not touch any answer text.**

```yaml
  triggers_en:
    - "where does my money go"
    - "what does my donation pay for"
    - "how much should I give"
    - "what will my donation do"
    - "what does HK$500 fund"
    - "how much does a class cost"
    - "is there a fee for classes"
  triggers_zh:
    - "捐款用在哪裡"
    - "我的捐款如何運用"
    - "應該捐多少"
    - "HK$500可以資助甚麼"
    - "一堂課要多少錢"
    - "課程要收費嗎"
```

The two "cost"/"fee" triggers are safe: the existing answer already states that programmes are free to members, so it answers the visitor-cost reading as well as the donor reading.

- [ ] **Step 2: Add triggers to the about entry**

In `backend/app/features/chatbot/knowledge/about.yaml`, under `about-what-is-love21`:

```yaml
  triggers_en:
    - "what is Love 21"
    - "what does Love 21 do"
    - "tell me about this charity"
    - "who are you"
    - "what do you do"
```

- [ ] **Step 3: Rebuild the index**

Run: `uv run python -m app.features.chatbot.build_index`
Expected: reports more than 44 triggers and writes `index.json`.

- [ ] **Step 4: Verify the corpus and index tests pass**

Run: `uv run pytest tests/test_chatbot_corpus.py tests/test_chatbot_index.py -v`
Expected: PASS. A staleness test fails if the index was not rebuilt.

- [ ] **Step 5: Add the compound parts to the probe list**

In `backend/app/features/chatbot/build_index.py`, extend `_PROBES` (line 18) with the parts this feature depends on, so the threshold stays measurable rather than remembered:

```python
    ("en", "What is Love 21?"),
    ("en", "what does HK$500 fund"),
    ("en", "how much does a class cost"),
    ("en", "what do you do"),
    ("en", "who can join"),
    ("en", "how do I volunteer"),
    ("zh-Hant", "愛21是甚麼"),
    ("zh-Hant", "HK$500可以資助甚麼"),
```

Keep the existing probes; append these.

- [ ] **Step 6: Measure and decide the threshold**

Run: `uv run python -m app.features.chatbot.build_index --scores`

Read the output and apply exactly this rule:

- `how do I volunteer` is the **noise probe** — volunteering has no entry, so whatever it scores is the floor of what noise reaches. Call that `N`.
- The other seven are **genuine** probes. Call the lowest `G`.
- If `G > N`, set `chatbot_part_confidence` to the midpoint, rounded to two decimals: `round((G + N) / 2, 2)`.
- If `G <= N` (they still overlap), **leave it at 0.70** and record the measured numbers in the config comment. Do not lower it to admit `G` — that would admit `N` too.

Update the measured-scores comment in `config.py` with the new numbers either way, replacing the 2026-08-01 figures.

- [ ] **Step 7: Run the full suite and lint**

Run: `uv run pytest && uv run ruff check .`
Expected: all pass.

- [ ] **Step 8: Verify against the real stack**

With Ollama running (`ollama ps` should list `bge-m3`), start the backend and ask the four questions this feature exists for:

```bash
uv run uvicorn app.main:app --reload --port 8000
```

Then from a second terminal, using **httpx rather than curl** — piping Chinese through curl on Git Bash mangles the UTF-8 and makes zh questions look like they miss:

```bash
uv run python -c "
import httpx
for q in [
    'What is Love 21 and what does HK\$500 fund?',
    'Who can join and how much does a class cost?',
    'what do you do and can my child join',
    'what do you do and I want to hurt myself',
]:
    r = httpx.post('http://127.0.0.1:8000/api/chat', json={'question': q}, timeout=30).json()
    print(q, '->', r['route'], [s['entry_id'] for s in r['sources']])
"
```

Expected: the first three return `composed` with two distinct sources; the fourth returns `refused` citing `refuse-distress` only. If any of the first three return `curated` with one source, the parts scored below `chatbot_part_confidence` — record the actual scores from Step 6 rather than lowering the threshold to force a pass.

- [ ] **Step 9: Commit**

```bash
git add app/features/chatbot/knowledge/ app/features/chatbot/index.json app/features/chatbot/build_index.py app/config.py
git commit -m "feat(chatbot): triggers for how people actually ask about cost

'What does HK\$500 fund?' scored 0.526 against the entry that answers it,
because no trigger contained 'HK\$500' or 'cost'. Adds paraphrase triggers
to two entries and the compound-question parts to the probe list, so
CHATBOT_PART_CONFIDENCE stays measured rather than remembered.

No answer text changed -- these are new ways of asking about facts already
approved, not new claims."
```

---

## Self-Review

**Spec coverage:**

| Spec section | Task |
|---|---|
| 1. `splitting.py` | Task 1 |
| 2. Routing — refusal domination, accept, compose, degraded short-circuit | Task 3 |
| 3. `chatbot_part_confidence` | Task 3 step 1, recalibrated in Task 4 step 6 |
| 4. Trigger enrichment | Task 4 |
| 5. API shape (`composed`, `sources`) | Task 2 |
| 6. Tests | Tasks 1, 3 |
| Generation stays off | Global constraint; asserted by the untouched `test_shipped_thresholds_disable_generation` |

**Deviations from the spec, both deliberate and flagged at their task:**
1. Task 1 replaces the spec's minimum-length conjunction guard with an interrogative-marker guard — it targets "nutrition and dietetics" directly instead of by proxy.
2. Task 3 resolves the spec's action collision: Contact wins when any part was rejected.

**Type consistency:** `split_question(str) -> list[str]` is defined in Task 1 and called in Task 3 step 6. `ChatResponse.sources: list[Source]` is defined in Task 2 and constructed in Task 3 step 7. `Route`'s `"composed"` member is added in Task 2 and emitted in Task 3. `_compose` and `_compose_followups` are defined and called within Task 3. `_CONTACT_ACTION`, `_from_entry`, `_resolve`, `_rank` and `settings` all pre-exist in `service.py`.

**Placeholder scan:** clean — every code step carries the actual code, and Task 4 step 6 specifies an arithmetic rule rather than "tune the threshold".
