# Chatbot feature (backend)

A local assistant. The model answers, given the whole curated corpus as
reference. Medical and self-harm questions bypass the model entirely. Nothing
leaves the machine.

## Endpoint

    POST /api/chat   { "question": "...", "locale": "en"|"zh-Hant", "easy_read": false }

Returns `answer`, `route`, `sources`, `action`, `followups`, `locale`.

`route` says how the answer was produced:

| route | Meaning |
|---|---|
| `generated` | The model wrote it, given the whole corpus. The normal path. |
| `refused` | A medical or self-harm question. Staff-written text, verbatim, no model call. |
| `fallback` | Ollama was unavailable or returned nothing. The nearest curated entry, verbatim. |

## How it works

```
question
   -> embed, rank against the corpus
   -> is the TOP match a refusal entry, at or above CHATBOT_REFUSAL_CONFIDENCE?
         yes -> serve that entry verbatim. The model is never called.
         no  -> hand the model every non-refusal entry + the question
   -> model dead, slow or empty? serve the nearest curated entry instead
```

There is no confidence band, no answer floor and no question splitting. The
corpus is small enough to pass whole, and a model composing from all of it
handles "two things at once" without help.

**Only the top match can trigger a refusal.** Scanning the whole ranked list was
tried and shipped a real bug: some refusal entry scores above 0.55 for almost
any question, so "how can I help" was answered with "call 999". Measured
2026-08-01, a question that genuinely needs refusing ranks the refusal *first* —
including "what do you do and is my child autistic" (0.851) — while questions
that must not refuse sit 0.16–0.70 below.

## What this trades away

The model writes text visitors read, so **it can state things the corpus does
not contain.** This was a deliberate choice on 2026-08-01, taken knowing the
following, which was measured on the shipped configuration:

| Asked | Answered | Problem |
|---|---|---|
| can my son join if he is 12 | "Your son can join **regardless of age**" | Age eligibility is not in the corpus |
| can I visit and see a class | "You can visit Love 21's programmes to see classes" | Physical access to a venue serving vulnerable people |
| what is Love 21 | "90+ activities **weekly**" | The corpus says 90+ activity *types*, 7 days a week |

The prompt asks the model to say when it does not know, and it sometimes does —
"where are you located" correctly answered that no address is in the passages.
But that is a tendency, not a guarantee, and it varies run to run.

**Uncovered topics are where it invents.** Every fabrication above is a question
with no entry behind it. The mitigation is corpus coverage, not prompt wording:
a deliberately stricter prompt was tried on 2026-08-01 and made the "visiting"
fabrication worse.

Non-negotiable #8 forbids unverified statements in shipped copy. This
configuration does not enforce that — it relies on the prompt and on coverage.
Reverting is one commit; the safeguarding filter and the curated corpus are
untouched by it.

## Setup

    ollama pull bge-m3
    ollama pull qwen3:1.7b
    uv run python -m app.features.chatbot.build_index

**Both** models are needed: `bge-m3` embeds the question for the safeguarding
check, `CHATBOT_MODEL` (`qwen3:1.7b`) writes the answer.

`CHATBOT_ENABLED=false` in `backend/.env` switches the feature off entirely: the
endpoint 503s and the frontend omits the launcher. A teammate without Ollama
still gets a working site.

Restart uvicorn after editing `.env` — `--reload` watches `.py`, not `.env`.

## Demo day: warm the model first

Ollama unloads an idle model, and a cold load costs a few seconds. That is
handled — a slow embed degrades to lexical matching rather than failing — but it
wastes the good path on the one question someone is watching.

Ask the assistant a question in the browser before anyone is looking. That loads
both models through the app, which holds them for `CHATBOT_KEEP_ALIVE` (30m
default, well past Ollama's own 5m). Confirm with `ollama ps`. A cold first
answer measured ~7s against ~3.5s warm.

`ollama ps` must list **both** models at once. If loading one evicts the other
you are out of VRAM and every request will thrash:
embedding the question unloads the generation model, which reloads from scratch
and times out, so every answer degrades to `fallback`. Measured on a 4GB RTX 3050,
qwen3:**4b** (3.5GB) + bge-m3 (0.66GB) does exactly this; qwen3:**1.7b** (~1.4GB)
leaves room for both.

## Editing answers (for staff)

Everything visitors are told lives in `knowledge/*.yaml`. Each entry needs
English and 繁體中文, an Easy Read version of each, and a `source`.

**Numbers are not typed in.** Write `{{ hkd_per_class }}` and the value comes
from `content/impact-stats.yaml` at the repo root. An unknown token stops the
app from starting — which is the point: no number reaches a visitor without a
source behind it.

**After editing any YAML, rebuild the index:**

    uv run python -m app.features.chatbot.build_index

A test fails if you forget.

## Why it is built this way

Fine-tuning was considered and rejected — it encodes style rather than facts,
and makes ungrounded numbers *more* confident. See
`docs/superpowers/specs/2026-07-31-ai-chatbot-design.md`.

Refusals (medical, safeguarding) are ordinary corpus entries with
`is_refusal: true`. Because they are in the index they retrieve at high
confidence and short-circuit the model completely. Retrieval as the safety
filter beats asking a small local model to police itself.

Refusal entries are also withheld from generation context, and the confidence
floor is checked *before* the refusal short-circuit. Both are scars: the first
because "call 999 in an emergency" was being handed to the model as quotable
material for donation questions; the second because an off-topic question ranks
a refusal entry top by default, so "what is the weather in Tokyo" was answered
with the crisis text.

## Files

| File | Role |
|---|---|
| `knowledge/*.yaml` | The corpus. Content, no code. |
| `stats.py` | Resolves `{{ tokens }}` from `content/impact-stats.yaml`. |
| `corpus.py` | Loads and validates. Raises rather than shipping a bad entry. |
| `ollama.py` | The only module that talks to Ollama. |
| `index.py` / `build_index.py` | Trigger embeddings + staleness check. |
| `retrieval.py` | Cosine ranking; lexical fallback. Used for the safeguarding check and the fallback answer. |
| `language.py` | Answer in the language the question was written in. |
| `service.py` | Safeguarding filter, then the model. |
| `router.py` | `POST /api/chat`. |
