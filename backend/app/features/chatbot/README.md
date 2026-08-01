# Chatbot feature (backend)

A local, grounded assistant. Answers come from a curated bilingual corpus, not
from the model's own knowledge. Nothing leaves the machine.

## Endpoint

    POST /api/chat   { "question": "...", "locale": "en"|"zh-Hant", "easy_read": false }

Returns `answer`, `route`, `source`, `action`, `followups`, `locale`.

`route` says how the answer was produced:

| route | Meaning |
|---|---|
| `curated` | Match at or above the threshold. A staff-written answer, verbatim. No model call. |
| `composed` | Two halves of one question, each a staff-written answer, stitched. No model call. |
| `refused` | Below the threshold, or a refusal entry. Offers a person instead. |
| `fallback` | Ollama was unavailable. Lexical matching, curated text. |
| `generated` | The model composed from retrieved passages. **Off by default** — see below. |

A question that asks two things at once is split into parts and each part is
retrieved separately, because a compound question embeds to one blurred vector:
"What is Love 21 and what does HK$500 fund?" scores 0.729 as a whole and 0.975
for its first half alone. Parts must clear `CHATBOT_PART_CONFIDENCE` (0.70,
higher than the ordinary floor) to be answered; a part below it is named as
unanswered rather than dropped. A refusal in any part decides the whole
response. This adds no model call — `composed` answers are staff-written text
in both halves.

## Why generation is switched off

`CHATBOT_HIGH_CONFIDENCE` and `CHATBOT_LOW_CONFIDENCE` are both `0.55`. Equal
thresholds leave no middle band, so every answer is either a staff-written entry
verbatim or a refusal. **The model never writes a word a visitor reads.**

This is not a limitation we ran out of time to fix. Measured against qwen3:1.7b
on 2026-08-01, generation invented an institutional commitment on *every*
question the corpus does not cover:

| Question | What the model answered | In the corpus? |
|---|---|---|
| can I bring my company team to help | "We welcome company teams to support our programmes!" | No |
| can I visit and see a class | "You can visit our centres to observe our programmes and meet people with Down syndrome" | No |
| can my son join if he is 12 | "Yes, your son can join if he is 12" | No |
| is there a waiting list | "There's no waiting list mentioned in the reference passages" | Leaks the prompt |

The second is not merely wrong. It is a claim about physical access to vulnerable
people, made by a charity, invented by a 1.7-billion-parameter model. A
deliberately stricter prompt made that one *worse*, and the wording varied run to
run, so the same question could be safe once and unsafe the next time.

Non-negotiable #8 forbids unverified statements in shipped copy. Equal thresholds
are how that is enforced rather than hoped for.

**Retrieval still does the semantic work.** bge-m3 embeddings decide which human
answer fits a question phrased in a way no one anticipated, in either language.
The model chooses; it does not speak.

To re-open the band, raise `CHATBOT_HIGH_CONFIDENCE` above
`CHATBOT_LOW_CONFIDENCE`. The generation path is intact and tested. Do it only
with a larger model **and** a corpus broad enough that a mid-band score means
"phrased differently", not "not covered" — the fabrications above all came from
gaps, and the corpus is still 6 seed entries. A test fails if you widen the band,
so this stays a decision rather than a tweak.

## Setup

    ollama pull bge-m3
    uv run python -m app.features.chatbot.build_index

`bge-m3` is the only model the app calls while generation is off. `CHATBOT_MODEL`
(`qwen3:1.7b`) is unused until the band is re-opened; pull it only then.

`CHATBOT_ENABLED=false` in `backend/.env` switches the feature off entirely: the
endpoint 503s and the frontend omits the launcher. A teammate without Ollama
still gets a working site.

Restart uvicorn after editing `.env` — `--reload` watches `.py`, not `.env`.

## Demo day: warm the model first

Ollama unloads an idle model, and a cold load costs a few seconds. That is
handled — a slow embed degrades to lexical matching rather than failing — but it
wastes the good path on the one question someone is watching.

Ask the assistant a question in the browser before anyone is looking. That loads
bge-m3 through the app, which holds it for `CHATBOT_KEEP_ALIVE` (30m default,
well past Ollama's own 5m). Confirm with `ollama ps`.

If you re-open the generated band, `ollama ps` must list **both** models at once.
If loading one evicts the other you are out of VRAM and every request will thrash:
embedding the question unloads the generation model, which reloads from scratch
and times out, so `generated` can never succeed. Measured on a 4GB RTX 3050,
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
| `retrieval.py` | Cosine ranking; lexical fallback. |
| `service.py` | Confidence routing. |
| `router.py` | `POST /api/chat`. |
