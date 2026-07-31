# Chatbot feature (backend)

A local, grounded assistant. Answers come from a curated bilingual corpus, not
from the model's own knowledge. Nothing leaves the machine.

## Endpoint

    POST /api/chat   { "question": "...", "locale": "en"|"zh-Hant", "easy_read": false }

Returns `answer`, `route`, `source`, `action`, `followups`, `locale`.

`route` says how the answer was produced:

| route | Meaning |
|---|---|
| `curated` | Strong match. A staff-written answer, returned verbatim. No model call. |
| `generated` | Moderate match. The model composed from retrieved passages. |
| `refused` | Weak match, or a refusal entry. Offers a person instead. |
| `fallback` | Ollama was unavailable. Lexical matching, curated text. |

## Setup

    ollama pull qwen3:4b
    ollama pull bge-m3
    uv run python -m app.features.chatbot.build_index

`CHATBOT_ENABLED=false` in `backend/.env` switches the feature off entirely: the
endpoint 503s and the frontend omits the launcher. A teammate without Ollama
still gets a working site.

**If the machine struggles on the day**, drop to the smaller model — no code
change, and answers stay grounded because the corpus does the factual work:

    ollama pull qwen3:1.7b
    # backend/.env
    CHATBOT_MODEL=qwen3:1.7b

Then restart uvicorn. `--reload` watches `.py`, not `.env`.

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
filter beats asking a 4B model to police itself.

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
