# Answering multi-part questions

**Status:** design, approved 2026-08-01
**Feature:** `backend/app/features/chatbot`
**Supersedes nothing.** Generation stays off — see the closing section.

## The problem

A visitor asks two things at once:

> "What is Love 21 and what does HK$500 fund?"

Both halves have a staff-written answer in the corpus. `service.answer_question`
takes `ranked[0]`, returns it verbatim, and silently discards the other half.
The visitor is never told a second question was asked.

## Why generation is not the fix

The obvious remedy — re-open the confidence band so the model composes an answer
from both passages — was measured on 2026-08-01 against the live index and
rejected. Routing keys off the **top-1 score**, not off whether the question is
compound, so widening the band to `high = 0.75` fixes compound questions only
when their top score happens to land in the 0.55–0.75 window:

| Question | top-1 | Route at `high=0.75` | Second half |
|---|---|---|---|
| What is Love 21 and what does HK$500 fund? | 0.729 | generated | answered |
| Who can join and how much does a class cost? | 0.717 | generated | answered |
| what do you do and can my child join | 0.894 | curated | **still dropped** |
| Tell me about the charity and monthly or once | 0.840 | curated | **still dropped** |

Half the cases are untouched, and which half is decided by score placement
rather than by anything meaningful. Generation would also reopen the fabrication
documented in the feature README, on exactly the questions the corpus does not
cover.

## The actual defect

A compound question is embedded as **one** vector. The result is a blend that
matches everything mediocrely and nothing precisely. Splitting the question and
embedding each part restores sharp top-1 scores (measured, same index):

| Question | Whole | Split into parts |
|---|---|---|
| What is Love 21 and what does HK$500 fund? | 0.729 | 0.975 / 0.526 |
| Who can join and how much does a class cost? | 0.717 | 0.961 / 0.600 |
| what do you do and can my child join | 0.894 | 0.718 / 1.000 |
| 愛21是甚麼？HK$500可以資助甚麼？ | 0.774 | 0.979 / 0.663 |

The blur also actively endangers the naive fix. On *"what do you do and can my
child join"*, `refuse-medical-advice` ranks **second at 0.614** — above the 0.55
floor. Concatenating everything above the floor would splice "we can't give
medical advice" into a friendly introduction.

## Design

### 1. `splitting.py`

One pure function. No I/O, no model call, no state.

```python
split_question(question: str) -> list[str]
```

Deterministic and rule-based rather than model-driven: it must be
offline-testable, sub-millisecond, and maintainable by a five-person charity
(CONTEXT.md §12). Rules, applied in order:

1. Split on terminal punctuation `?` `？` `。` `!` `！`. Handles
   `"愛21是甚麼？HK$500可以資助甚麼？"` in either language.
2. Then split on ` and ` / `和` / `，同時`, **only if both sides clear a minimum
   length guard** — ≥2 words for English, ≥3 characters for Chinese. Without the
   guard, "nutrition and dietetics" fractures into two useless fragments.
3. Cap at 3 parts. A question with four clauses is not well served by four
   stacked answers; treat it as one question.
4. Anything not confidently splittable returns `[question]`.

**Load-bearing property:** when `split_question` returns one element, the caller
takes today's code path unchanged. Single-part questions cannot regress, and the
existing test suite is the guard that they haven't.

### 2. Routing in `service.py`

Splitting only ever adds. The whole-question ranking is still computed, because
it is the fallback when the split yields nothing usable. Whole plus up to three
parts are embedded concurrently under one `asyncio.gather`, keeping latency at
roughly today's 0.7s rather than 4× it.

```
parts = split_question(question)
if len(parts) == 1:
    -> existing path, unchanged

rank(whole) and rank(part) for each part, concurrently

0. DEGRADED SHORT-CIRCUIT
   If ranking degraded to lexical (no index, or Ollama down), abandon the
   compound path and use the whole-question path. See below.

1. REFUSAL DOMINATES
   If any part retrieves a refusal entry at or above chatbot_low_confidence,
   return that refusal alone and stop.

2. ACCEPT
   Keep parts whose top entry scores >= chatbot_part_confidence.
   Deduplicate by entry id.

3. COMPOSE
   >= 2 accepted -> route "composed"; join curated answers with "\n\n"
      1 accepted -> route "curated", that entry alone
      0 accepted -> fall back to the whole-question path (today's behaviour)
```

**The degraded short-circuit is not an optimisation.** `rank_lexically` scores
Jaccard overlap of character bigrams, which occupies a completely different range
from cosine similarity — a correct lexical match rarely reaches 0.70 at all.
Applying `chatbot_part_confidence` to lexical scores would reject every part and
silently disable the feature, or worse, invite someone to "fix" it by lowering
the threshold for both paths. When Ollama is unavailable, compound questions
degrade to today's single-answer behaviour, which is a real answer rather than a
wrong one.

**Refusal domination** is deliberate and conservative. *"What do you do and I
want to hurt myself"* returns the distress entry **only**. Burying a crisis
response beneath a charity blurb is worse than not answering the first half.

**Deduplication** matters at this corpus size: *"what do you do and who are
you"* resolves both parts to `about-what-is-love21`, and emitting it twice reads
as broken.

**No silent drops.** Discarding a half-question is the bug being fixed, so if one
or more parts are rejected, the composed answer carries one authored bilingual
trailing sentence plus the Contact action. New constants alongside
`_REFUSAL_FALLBACK_EN` / `_ZH`; the visitor's rejected sub-question is not quoted
back.

**Action:** the highest-scoring accepted part's action, and only that one —
CONTEXT.md §8 asks for one primary action per screen.

**Followups:** union across accepted entries, deduplicated, capped at 3, and
excluding entries already answered in this response.

### 3. `chatbot_part_confidence` — a new threshold, not a reuse

`chatbot_low_confidence` (0.55) is not a valid acceptance test for parts. Sorted,
the measured part scores are:

```
1.000  0.979  0.975  0.961  0.718  0.692  0.663  0.643  0.600
                                    ^            ^
                                genuine       NOISE
```

The 0.643 is *"How do I volunteer?"* matching `donate-monthly-or-one-off` with a
+0.012 gap to second — volunteering has no entry at all. It outranks two genuine
matches (0.600, 0.692). **On a six-entry corpus no pure score cut separates
noise from genuine matches.** The gap between top-1 and top-2 does not separate
them either: genuine matches produced gaps of +0.629, +0.353, +0.320 and +0.589
but also +0.061, +0.066 and +0.029, which straddle the noise case.

Therefore `chatbot_part_confidence` defaults to **0.70** — conservative on
purpose. A genuine part below it receives the contact line instead of a wrong
answer. That is the correct direction to fail.

This deliberately drops parts that should qualify, which is addressed next.

### 4. Trigger enrichment

*"What does HK$500 fund?"* scores 0.526 against `donate-what-500-funds` — its
own topic — because not one of that entry's triggers contains "HK$500" or
"cost". Adding paraphrase triggers to the four existing answerable entries lifts
these scores without touching any answer text.

This is **not** Task 11. Task 11 is out of scope because writing new answers
means asserting facts about a real charity. Adding triggers asserts no new fact;
it adds ways of asking about facts already approved. The distinction is what
makes this safe to do without staff input.

Recalibrate `chatbot_part_confidence` against re-measured scores once the
triggers land, the same way 0.55 was originally derived.

### 5. API shape

- `Route` gains `"composed"` — `models.py` and
  `frontend/features/chatbot/types.ts` must change together.
- `source: Source | None` becomes `sources: list[Source]`. A composed answer
  genuinely has two sources, and a one-element list beats a special case.
  Single-source routes emit a one-element list; refusals emit an empty one.

No frontend layout work: `ChatTranscript.tsx` already renders the answer under
`whitespace-pre-line`, so `"\n\n"` becomes a real paragraph break. The
components that read `response.source` need updating to `sources`.

### 6. Tests

- `splitting.py`: pure offline unit tests — terminal punctuation in both
  languages, the conjunction guard, "nutrition and dietetics" staying whole, the
  3-part cap, and the unsplittable-returns-one-element case.
- Service, via the existing `stub_index` fixture: refusal domination, dedupe to
  a single answer, 0-accepted falling back to today's response, a 2-part compose
  carrying both answers with one action and merged followups, and a compound
  question under the degraded path returning today's single answer.
- The entire existing suite runs unchanged. It is the regression guard for
  single-part questions.
- `test_shipped_thresholds_disable_generation` stays green, untouched.

## What this does not fix

A genuinely uncovered part still latches onto an unrelated entry —
*"How do I volunteer?"* → `donate-monthly-or-one-off` at 0.643.
`chatbot_part_confidence` holds it below acceptance, so it is not answered
wrongly, but it is not answered at all. Only corpus coverage fixes that, and the
SDD ledger already records it as the highest-value unblock.

## Generation stays off

`chatbot_high_confidence == chatbot_low_confidence == 0.55` is untouched by this
work. Every word a visitor reads is still staff-written, verbatim. The demo line
about deliberately not letting a small model speak for people with intellectual
disabilities survives intact — and now compound questions get answered too.
