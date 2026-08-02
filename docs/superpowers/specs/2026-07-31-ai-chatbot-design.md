# AI assistant — grounded, local-only visitor helper

**Date:** 2026-07-31
**Status:** Designed, not implemented

## Goal

A helper that guides visitors through Love 21's purpose, programmes,
volunteering and donation process, answering in English or Traditional Chinese.
Everything runs on the demo laptop — no hosted model, no network call leaving
the machine.

It answers, and it can hand the user a labelled button that opens the right page
with state pre-filled. It never submits anything on a visitor's behalf.

## Constraints that shaped this

From `local/CONTEXT.md` §1. These are not preferences; where they conflicted
with the obvious design, they won.

| # | Constraint | Consequence here |
|---|---|---|
| 1 | Accessibility is the product | Panel spec in "Frontend" below is a requirement list, not aspirations |
| 2 | No autoplay, honour `prefers-reduced-motion` | No slide-in; no token streaming |
| 4 | Every icon carries a text label | Launcher reads "Ask for help"; no icon-only control |
| 5 | Full EN / 繁體中文 parity | Both locales hand-written in the corpus; never machine-translated at request time |
| 8 | No unverified statistics | Numbers are tokens resolved from `impact-stats`; unattributable content is excluded |
| 10 | No member content without consent | Corpus contains no member names, photos or quotes |
| 11 | Dignity framing | Donation answers frame person → programme → money, never person → money |

Hardware is the other hard constraint: RTX 3050 Laptop (~4 GB VRAM), 15 GB
system RAM, shared during the demo with Next.js, FastAPI, a browser and screen
sharing.

## Fine-tuning: rejected

Considered and dropped, for three reasons.

Fine-tuning encodes style, not facts — and every question here is a factual one
about a specific charity. Facts belong in an editable file, not in weights that
must be retrained when staff change a number.

It worsens the primary failure mode. Non-negotiable #8 exists because the impact
figures already conflict across four sources (`CONTEXT.md` §4). A fine-tuned
model produces fluent, confident, ungrounded numbers.

It does not fit the schedule, and would still need retrieval underneath it for
the facts.

The replacement is grounding: retrieve curated content, constrain the model to
it, cite the source, and refuse when retrieval is weak.

## Approaches considered

| | Approach | Verdict |
|---|---|---|
| A | Grounded generation — retrieve top-k, LLM writes the answer | Flexible, but a 4B model drifts from sources, and a drifted answer about donations is a real harm |
| B | Semantic FAQ — retrieve top-1, return it verbatim | Hallucination structurally impossible, but cannot merge two facts |
| **C** | **B as the floor, A as the polish — route on retrieval confidence** | **Chosen** |

C keeps the most-demoed questions on the verbatim path, degrades to B when
Ollama is unavailable, and makes the guardrails architectural rather than
prompt-based — a generator that only ever sees four retrieved passages cannot
invent a statistic, whatever the system prompt says.

## Models

| Role | Model | Why |
|---|---|---|
| Generation | `qwen3:4b` (Q4_K_M, ~2.6 GB) | Fits 4 GB VRAM with context to spare; strongest small open model on Traditional Chinese |
| Embedding | `bge-m3` | Multilingual — lets a 繁中 question match English source content, which lexical search cannot do |
| Escape hatch | `qwen3:1.7b` | Documented swap if the laptop struggles on the day |

Qwen3 is a hybrid reasoning model. **Thinking mode must be explicitly
disabled**, or every answer carries an extra 10–20s of latency.

An 8B model was rejected: ~5 GB at Q4 spills out of VRAM into system RAM and
collapses throughput exactly when the machine is busiest.

## Architecture

```
Browser (client component)
   │  POST /api/chat  { question, locale, easy_read }
   ▼
router.py ──► service.py
                 │
                 ├─1─► retrieval.py ──► ollama.embed(question) ──► Ollama :11434
                 │           └──► cosine vs index.json ──► ranked entries
                 │
                 ├─2─► route on top score:
                 │       ≥ 0.75 ──► curated answer, verbatim       (no LLM call)
                 │       0.45–0.75 ──► ollama.generate(top-k)      (qwen3:4b)
                 │       < 0.45 ──► refusal + human handoff
                 │
                 └─3─► ChatResponse { answer, route, source, action, followups }
```

Thresholds live in `config.py` (`CHATBOT_HIGH_CONFIDENCE`,
`CHATBOT_LOW_CONFIDENCE`) so they are tunable without a code change.

### Layout

Follows the `app/features/<name>/` pattern established by the Instagram
feature — self-contained, owns its content — not the `routers/` + `schemas/`
split.

```
backend/app/features/chatbot/
  knowledge/          about.yaml programmes.yaml volunteering.yaml
                      donating.yaml visiting.yaml
  models.py           Pydantic request/response shapes
  corpus.py           load + validate YAML; resolve stat tokens
  index.py            build/load embeddings; corpus-hash staleness check
  retrieval.py        embed → cosine → ranked (Entry, score)
  ollama.py           async httpx client: embed(), generate()
  service.py          confidence routing
  router.py           POST /api/chat
  build_index.py      CLI: rebuild index.json
  index.json          committed
  README.md

frontend/features/chatbot/
  types.ts  api.ts
  components/  ChatLauncher.tsx ChatPanel.tsx ChatTranscript.tsx
               SuggestedQuestions.tsx
```

`ollama.py` is the only module that knows Ollama exists, mirroring `app/db.py`
being the only place a Supabase client is built. Swapping inference backends
touches one file.

## Corpus

```yaml
- id: donate-what-500-funds
  tags: [donating]
  triggers_en: ["where does my money go", "what does my donation pay for"]
  triggers_zh: ["捐款用在哪裡", "我的捐款如何運用"]
  answer_en: >
    HK${{ hkd_per_class }} funds one class for up to {{ class_capacity }}
    members — a coach, the space, and the equipment. All Love 21 programmes are
    free to members, so gifts go to the programme, not to an individual.
  answer_zh: >
    港幣{{ hkd_per_class }}元可資助一堂課，最多{{ class_capacity }}位成員參與……
  easy_read_en: >
    HK${{ hkd_per_class }} pays for one class. Up to {{ class_capacity }} people can join.
  easy_read_zh: >
    港幣{{ hkd_per_class }}元可以支付一堂課。最多{{ class_capacity }}人可以參加。
  action:
    label_en: "See what your gift funds"
    label_zh: "看看你的捐款可以做甚麼"
    href: "/donate?amount=500&frequency=monthly"
  followups: [donate-monthly-vs-one-off, donate-tax-receipt]
  source: client-provided
```

Full field set: `id`, `tags`, `triggers_en`, `triggers_zh`, `answer_en`,
`answer_zh`, `easy_read_en`, `easy_read_zh`, `action` (optional), `followups`
(optional), `source`, `is_refusal` (optional, default `false`).

**`followups` are authored, not generated** — a list of other entry ids. The API
resolves each to its `triggers_en[0]` / `triggers_zh[0]` as the button label and
question. Authoring them keeps the suggested path through the site deliberate
rather than whatever a 4B model improvises, and validation rejects an id that
does not exist.

**Numbers are tokens.** `{{ hkd_per_class }}` resolves from the impact-stats
file at load. `corpus.py` refuses to start on an unresolvable token, which turns
#8 into a boot failure rather than a rule to remember. The unreconciled figures
from `CONTEXT.md` §9 then get fixed in one file.

`CONTEXT.md` §4 specifies `content/impact-stats.{json,yaml}` but it does not
exist yet, and the frontend will need it too. **This feature creates it at
`content/impact-stats.yaml` in the repo root**, read by the backend at load and
importable by the frontend later — one file, both halves, per §4's "one file"
rule. Each stat carries `key`, `value`, `label_en`, `label_zh`, `source`,
`as_of`, `confidence`. Seeded with the client's deck figures at
`confidence: client-provided, pending reconciliation`. If a teammate has already
created it by implementation time, use theirs and do not add a second.

**`source` is mandatory** — `client-provided` / `staff-confirmed` /
`annual-report-2023-24`. Unattributable content stays out of the corpus.

**Refusals are corpus entries, not prompt instructions.** Medical, therapeutic
and diagnostic questions get entries with `is_refusal: true` and triggers such
as "is my child autistic". Being in the index, they retrieve at high confidence
and never reach the LLM. A safeguarding/distress entry works the same way.
Retrieval as the safety filter is stronger than asking a 4B model to police
itself.

Target ~35 entries across the five files.

## Contract

```jsonc
// POST /api/chat
{ "question": "how can my company help?", "locale": "zh-Hant", "easy_read": false }

// 200
{
  "answer": "…",
  "route": "curated",        // curated | generated | refused | fallback
  "source": { "entry_id": "volunteer-corporate", "label": "Corporate volunteering" },
  "action": { "label": "Go to corporate volunteering", "href": "/volunteer/corporate" },
  "followups": [ { "label": "How many people can come?", "question": "…" } ],
  "locale": "zh-Hant"
}
```

`route` is exposed deliberately, matching Instagram's `source: live | fixture`.
It drives the "answering from saved answers" note and is demonstrable: *this
answer came verbatim from a file a staff member wrote.*

### Deliberate omissions

**Single-turn.** No conversation history. Coreference resolution ("what about
*Saturdays*?") is poor on a 4B model and would cost a day. `followups` gives the
experience of a conversation while the backend stays stateless and testable —
and suggested next steps serve this audience better than a blank prompt.

**No token streaming.** Streaming into an `aria-live` region makes screen
readers re-announce partial text, against the definition-of-done item "names
announced once, not twice". A "Thinking…" state then one complete render is
simpler code *and* better accessibility.

## Frontend

The panel is a **Client Component**, so this is the app's first browser-side
fetch. Every fetch until now (Instagram, participants) ran server-side in Node,
where CORS is not involved. `CORS_ORIGINS` becomes load-bearing here.

The floating-panel pattern was chosen over an inline block for recognisability
and for presence on the donate page. It carries an accessibility cost that this
spec pays explicitly:

| Requirement | Implementation |
|---|---|
| Text-labelled launcher (#4) | Pill reading "Ask for help"; icon `aria-hidden` |
| Usable at 200% zoom | Panel goes full-screen below `37.5em`. An `em` breakpoint catches a 600px phone *and* a 1200px desktop at 200% zoom in one rule |
| Escape + focus return | Escape closes, focus returns to launcher. Non-modal on desktop (no focus trap); modal only when full-screen |
| Announced once | Answer renders complete into `aria-live="polite" aria-atomic="true"` |
| No motion (#2) | No transition under `prefers-reduced-motion: reduce` |
| CTA never buried | Page carries bottom padding equal to the launcher |
| Easy Read / locale (#5) | Reads `data-easy-read` and `lang` from `<html>`, set by the accessibility toolbar (`CONTEXT.md` §6.1). The bot inherits site settings rather than owning its own |

## Error handling

Loud at boot, graceful at runtime.

| Condition | Behaviour |
|---|---|
| Invalid corpus (missing locale, unresolvable token, bad `href`) | App refuses to boot, naming the entry id |
| Ollama unreachable | Lexical fallback: case-folded token overlap against every entry's trigger phrases, best match wins, same low-confidence floor applies. `route: "fallback"`; quiet note in panel. The suggested-question buttons are exact trigger matches, so they keep working with no model running |
| Generation exceeds 20s | Abandoned; top curated answer returned instead |
| Backend unreachable | Written apology + "Talk to a person" contact link. Never a raw error string |
| Question over 500 chars | Rejected client- and server-side |

The degradation ladder matches the repo's existing habit: Instagram serves
fixtures without a token, `get_db` returns 503 without credentials, the app
boots regardless. **The bot never returns a 500.**

## Testing

Offline, mirroring `FakeDb` standing in for PostgREST. A `FakeOllama` returning
canned vectors and completions, injected via `dependency_overrides`.

- Each confidence band routes correctly
- A refusal entry produces **no** LLM call (asserted on the fake)
- Timeout falls back rather than raising
- Ollama raising yields `route: "fallback"` and a 200
- Every entry: both locales, both Easy Read variants, a `source`, a valid `href`
- Every `followups` id resolves to a real entry
- Every `{{ token }}` resolves against `impact-stats.yaml`
- `index.json` corpus hash matches the YAML on disk — editing an entry without
  rebuilding fails CI rather than silently serving a stale index

The frontend gets a manual keyboard-and-axe checklist rather than jsdom
assertions. With three days left, this panel needs a human tabbing through it
more than it needs a unit test.

## Configuration

Added to `backend/.env.example` in the same commit as `config.py`:

```
# false hides the launcher and makes /api/chat return 503. The rest of the
# site is unaffected -- same shape as the Supabase variables being blank.
CHATBOT_ENABLED=true
OLLAMA_HOST=http://127.0.0.1:11434
CHATBOT_MODEL=qwen3:4b
CHATBOT_EMBED_MODEL=bge-m3
CHATBOT_HIGH_CONFIDENCE=0.75
CHATBOT_LOW_CONFIDENCE=0.45
CHATBOT_TIMEOUT_SECONDS=20
```

Read through `get_settings()`. Never `os.getenv` directly.

`CHATBOT_ENABLED=false` is the kill switch: the frontend omits the launcher
entirely rather than rendering one that errors, and the endpoint 503s. This is
the "pull the feature five minutes before the demo" lever, and it keeps a fresh
clone runnable for a teammate who has not installed Ollama.

`OLLAMA_HOST` uses `127.0.0.1`, not `localhost`, for the same reason
`NEXT_PUBLIC_API_URL` does — Node and Python may resolve `localhost` to `::1`,
which Ollama does not bind by default.

## Risk: the corpus is the critical path

The engineering is roughly a day. The corpus is not engineering — ~35 entries ×
(EN + 繁中 + two Easy Read variants) is several hours of writing, and the 繁中
needs someone who reads Traditional Chinese. A 4B model's translation is not
good enough to ship against #5 on a Cantonese-first charity's site.

If no one on the team writes 繁中, the design changes: ship English-only with a
visible "Chinese coming soon" rather than machine-translated Chinese. That
decision should be made on 2026-08-01 at the latest, not discovered on the 2nd.

## Open questions

1. Who writes the 繁體中文 entries? (Blocking — see above.)
2. Which `impact-stats` figures are authoritative? Inherits `CONTEXT.md` §9 Q1;
   the corpus cannot resolve its tokens until this is settled.
3. What is the "Talk to a person" contact — an email, a phone number, a form?
   Needed for the refusal and safeguarding entries.
