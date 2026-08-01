# AGENTS.md

Next.js frontend + FastAPI backend, wired together, plus a Supabase/Postgres
connector and the `participants` / `photos` / `photo_faces` domain tables. Staff
authenticate with a Supabase magic link; roles live in `public.user_roles`.

`frontend/AGENTS.md` also applies inside `frontend/`. Read it: this is Next.js
16, which renamed several conventions, and your training data is likely stale.

## Commands

```bash
# Backend (from backend/)
uv sync
uv run uvicorn app.main:app --reload --port 8000
uv run ruff check . && uv run ruff format .
uv run pytest

# Frontend (from frontend/)
npm install
npm run dev                   # port 3000
npm run build                 # includes typecheck
npm run lint
npx tsc --noEmit              # typecheck alone, faster than a full build
```

Both must be running for the page to render anything but an error.

## Layout

| Path | Holds |
|---|---|
| `backend/app/main.py` | App setup: CORS, `/health`, `/api/hello`, router registration. |
| `backend/app/config.py` | Settings read from the environment, cached. |
| `backend/app/db.py` | The only place a Supabase client is built. Anonymous, per-caller, and service-role. |
| `backend/app/auth.py` | JWT verification (authentication) and the staff-role gate (authorization). |
| `backend/app/routers/` | One module per resource. |
| `backend/app/schemas/` | Pydantic models for what crosses the API boundary. |
| `backend/app/features/<name>/` | Self-contained features: `chatbot/`, `instagram/`. Register the router in `main.py`. |
| `backend/app/features/chatbot/knowledge/` | The corpus. Content, no code — staff edit this. |
| `backend/tests/` | pytest, offline. `FakeDb` stands in for PostgREST. |
| `backend/pyproject.toml` | Dependencies, ruff and pytest config. |
| `content/impact-stats.yaml` | Every number on the site, with a source. Referenced as `{{ tokens }}`. |
| `supabase/migrations/` | Schema history. One `.sql` file per applied migration. |
| `frontend/app/` | **Routes only.** A `page.tsx` composes primitives and feature components; it does not define them. |
| `frontend/components/ui/` | The design system. Button, Card, Section, Field, RadioCard, Tabs, ProgressBar, StatCard, Tag, Toggle, Icon, PageIntro. |
| `frontend/components/layout/` | Site chrome: `PageShell` (header + main + footer), and `navigation.ts` — the one list of nav links. |
| `frontend/components/vendor/` | Third-party components copied in (reactbits.dev). Not ours, not on the token system. |
| `frontend/features/<name>/` | One folder per feature: `components/`, `data.ts`, `types.ts`. |
| `frontend/lib/` | `api.ts` (public shapes + `API_URL`), `admin.ts` (admin client, bearer token), `supabase/` (browser + server clients), `roles.ts`, `format.ts`, `cn.ts`. |
| `frontend/proxy.ts` | Refreshes the Supabase session per request. Next 16 renamed `middleware` to `proxy`. |
| `backend/.env` | Gitignored. `CORS_ORIGINS`, `SUPABASE_*`. |
| `frontend/.env.local` | Gitignored. `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_*`. |
| `docs/superpowers/specs/` | Dated design docs. History, not current state. |

As this grows, split `app/main.py` into `app/routers/<resource>.py` and register
each router in `main.py` — one module per resource.

## Frontend conventions

Three rules, and the codebase already got expensive once for breaking all three.

**Colour comes from `app/globals.css`, never from a Tailwind palette.** Use
`ink`, `ink-soft`, `paper`, `surface`, `surface-deep`, `edge`, `signal`,
`signal-deep`, `signal-soft`, `highlight`, `highlight-soft`, `positive`,
`positive-soft`, `danger`, `danger-soft`. A literal `text-zinc-950` or
`border-orange-200` in a diff is a bug: it is how the site ended up with five
palettes, one per contributor. Every token is contrast-checked — see the comment
in that file before changing a value.

**Reach for `components/ui` before writing markup.** If you are about to type
`rounded-2xl border bg-white p-6`, you want `<Card>`. Buttons, form fields,
tabs, progress bars and status pills all exist. Extend the primitive rather than
forking it.

**Never restate focus styles.** `globals.css` declares one 3px `signal` ring for
every interactive element. A per-component `focus-visible:outline-2` overrides
it with something thinner, which is what nine components used to do.

Shared components live in `components/`; anything specific to one feature lives
in `features/<name>/components/`. `app/` holds routes and nothing else.

## How the two connect

`frontend/app/stories/page.tsx` is a Server Component. It calls `loadStories()`
in `lib/api.ts`, which fetches `${NEXT_PUBLIC_API_URL}/api/photos` and
`/api/participants` at request time and returns an `error` string instead of
throwing. The page renders that string in a red card. That card is the
connection status: break the wiring and the page says so.

(The landing page at `app/page.tsx` reaches the backend only through
`features/instagram`, and is otherwise static content.)

Because that fetch runs server-side in Node rather than in the browser, CORS is
not involved in it. CORS *is* involved the moment you fetch from a Client
Component, so keep `CORS_ORIGINS` correct regardless.

## Environment

`backend/.env` and `frontend/.env.local` are gitignored and must stay that way.
Only the `.example` files are tracked — add every new variable to the matching
`.example` file in the same commit.

The Supabase variables may be left blank: the app boots without them and only
the database-backed routes return 503. That keeps a fresh clone runnable.

Use `127.0.0.1`, not `localhost`, in `NEXT_PUBLIC_API_URL`. Node may resolve
`localhost` to `::1`, which uvicorn does not bind by default; you get a
connection refused that looks like the backend is down when it isn't.

`NEXT_PUBLIC_` is a real prefix with real consequences — those values are inlined
into the browser bundle. Never put a secret behind one.

## Database

Supabase project `fastapi-supabase-template` (`gxvxhsflrghnewfwycag`).

**Authorization lives in Postgres, not in Python.** Routers query through
`get_db`, which uses the publishable key, so RLS policies decide what comes
back. A router does not re-filter for visibility — duplicating a policy in
Python is how the two silently drift apart.

Before adding any table, read `.claude/skills/adding-an-rls-table`. A table
without RLS is readable by anyone holding the publishable key, and that key
ships in the browser bundle.

**Roles and auth.** Staff sign in with a Supabase magic link; there is no admin
token. Identity and permission are deliberately separate: `app/auth.py` verifies
the JWT signature against the project JWKS, then reads `public.user_roles`
through the caller's own RLS-scoped client. A role claim inside a token grants
nothing.

Roles are `admin`, `editor`, `supporter`, and they live in `user_roles` rather
than on `profiles` — `profiles_update_own` lets a user edit their own profile
row, so a `profiles.role` column would be a one-PATCH self-promotion. Neither
`user_roles` nor `role_allowlist` has a write policy, so only the service role
grants a role. `role_allowlist` maps an email to a role and is applied by an
`auth.users` trigger on first sign-in, which is how someone is authorised before
their account exists. See README > Admin access.

`participants` departs from that skill's owner-scoped pattern on purpose: it is
public editorial content, so the policy is "anyone reads published *and*
consented rows" and there is no write policy at all. Writes require the service
role via `get_admin_db`.

Two invariants the database enforces rather than trusting callers to remember:
consent cannot be recorded without a timestamp, and a row cannot be published
without consent.

Migrations are applied through the Supabase MCP tools; save a copy of every
applied migration into `supabase/migrations/<version>_<name>.sql` so the schema
has a history in git. This slipped once: three migrations from the original auth
work were applied and never committed, which is why `profiles` existed for two
days with no file explaining it. The three files are now backfilled and marked
as reconstructed. Check `supabase_migrations.schema_migrations` against the
directory if the schema ever looks unfamiliar.

## Face recognition

`app/faces.py` is the only module that imports cv2. OpenCV **YuNet** (MIT)
detects, **SFace** (Apache 2.0) embeds to 128 dimensions, and pgvector matches
in Postgres. Everything runs in-process: no image or face leaves the server.

Do not swap in InsightFace. Its code is MIT but its pretrained models
(`buffalo_l`, `antelopev2`) are licensed for non-commercial research only.

Models live in `backend/models/`, are gitignored, and are fetched by
`uv run python scripts/fetch_models.py`. When they are absent, detection returns
nothing and the admin tool falls back to manual tagging rather than failing.

Two gotchas that cost real time:

- SFace needs `recognizer.alignCrop(image, row)` with YuNet's **whole 15-value
  detection row** (box, five landmarks, score). Cropping the bounding box
  yourself yields embeddings that silently match nothing.
- The match threshold is cosine **0.363**, the figure OpenCV documents for
  SFace. pgvector's `<=>` is cosine *distance*, so the SQL compares `1 - (a <=> b)`.

Recognition only ever *suggests*. Everything an upload creates is `status =
'suggested'`, and RLS never exposes those. A human confirms each tag; that is
the safeguard, not a UI nicety.

## Chatbot

`POST /api/chat` → `answer`, `route`, `sources`, `action`, `followups`, `locale`.
Everything runs against a local Ollama; nothing leaves the machine.

```
question → embed, rank against the corpus
   → is the TOP match a refusal entry, at or above CHATBOT_REFUSAL_CONFIDENCE?
        yes → serve that entry verbatim. The model is never called.
        no  → hand the model every non-refusal entry + the question
   → model dead, slow or empty? serve the nearest curated entry instead
```

`route` is `generated` (normal), `refused` (medical or self-harm — staff wording,
verbatim) or `fallback` (Ollama unreachable, nearest curated entry).

Setup: `ollama pull bge-m3 && ollama pull qwen3:1.7b`, then
`uv run python -m app.features.chatbot.build_index`. **Rebuild the index after
editing any `knowledge/*.yaml`** — a test fails if you forget.
`CHATBOT_ENABLED=false` 503s the endpoint and drops the launcher, so a teammate
without Ollama still gets a working site.

Four things that cost real time:

- **Only the top match may refuse.** Scanning the ranked list for any refusal
  above the floor was tried and shipped a bug: some refusal scores above 0.55
  for almost any question, so "how can I help" answered "call 999".
- **`think: false` is a trap.** It does not stop qwen3 reasoning, it stops Ollama
  *separating* it, so chain-of-thought lands in `message.content`. Omit it.
- **`ollama ps` must list both models at once.** On a 4GB GPU, qwen3:**4b**
  (3.5GB) + bge-m3 (0.66GB) evict each other and every answer degrades to
  `fallback`. qwen3:**1.7b** (~1.4GB) fits.
- **Numbers are never typed into the corpus.** Write `{{ hkd_per_class }}` and
  the value comes from `content/impact-stats.yaml`. An unknown token stops the
  app booting, which is the point.

**The model writes text visitors read, so it can state things the corpus does
not contain.** Measured on the shipped config, it told a parent their son "can
join regardless of age" and a visitor they "can visit Love 21's programmes to
see classes" — neither is in the corpus, and both concern access. Every
fabrication so far has been on a topic with no entry behind it, so coverage is
the mitigation, not prompt wording: a stricter prompt was tried and made it
worse. This is a deliberate trade made on 2026-08-01, not an oversight.

## Tests

`uv run pytest` from `backend/`. They run offline — `FakeDb` in
`tests/conftest.py` imitates the PostgREST query builder, and `get_db` is
replaced through `dependency_overrides`. Extend `FakeQuery` when a router uses
a builder method it doesn't implement yet.

These cover routing, wiring, and serialization. **They do not exercise RLS** —
`FakeDb` has no policy engine. Verify policies against a real project.

## Known noise

- **Node 20.13.1** is below the 20.19+ that `eslint-visitor-keys` asks for.
  Everything works; npm warns on install. Node 22 silences it.
- **`npm audit` reports 12 high-severity findings**, all inside Next 16's own
  dependency tree. The only fix npm offers downgrades Next several major
  versions. Leave them until upstream patches.

## Scope

Prefer deleting over adding. If you add a demo endpoint to verify something,
delete it before you finish.
