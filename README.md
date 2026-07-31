## Architecture

```
Browser ──1── Next.js Server Component (app/page.tsx)
                  │
                  └──2── fetch(${NEXT_PUBLIC_API_URL}/api/hello)
                            │
                            └──3── FastAPI returns JSON
                                      │
   ◀──────────4. rendered HTML ───────┘
```

The fetch happens on the server, during the render — not in the browser. The
page ships already containing the backend's answer.

## Layout

```
backend/               FastAPI
  app/main.py          CORS, /health, /api/hello, router registration
  app/config.py        settings from the environment
  app/db.py            the only place a Supabase client is built
  app/routers/         one module per resource
  app/schemas/         Pydantic models for the API boundary
  tests/               pytest, offline
  pyproject.toml       deps + ruff/pytest config
supabase/migrations/   schema history, one .sql per applied migration
frontend/              Next.js 16 App Router, React 19, Tailwind v4, TypeScript
  app/page.tsx         fetches the backend and renders the result
docs/                  design docs
```

## Setup

Both env files are gitignored. Copy the examples:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
```

The defaults work for local development. The database routes additionally need
`SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in `backend/.env`, from the
Supabase dashboard under Project Settings → API keys. Leave them blank and the
app still runs — `/api/participants` returns 503 and nothing else changes, so a
fresh clone is never broken by a missing key.

### Run it

```bash
# Terminal 1
cd backend && uv sync && uv run uvicorn app.main:app --reload --port 8000

# Terminal 2
cd frontend && npm install && npm run dev
```

Open <http://localhost:3000>. A green box reading **Hello from FastAPI** means
both halves are talking. A red box names what went wrong.

## API

| Route | Returns |
|---|---|
| `GET /health` | `{"status": "ok", "database": true}` — `database` reports configuration, not reachability |
| `GET /api/hello` | `{"message": "Hello from FastAPI"}` |
| `GET /api/participants` | Published participants, in display order |
| `GET /api/participants/{slug}` | One participant; 404 if unknown *or* unpublished |

<http://127.0.0.1:8000/docs> has interactive docs, generated from the route
signatures.

## Database

The `participants` table holds featured member stories for the `/stories` page.

Authorization is enforced by Postgres, not Python. Routers query through
`get_db`, which carries the publishable key, and RLS decides what comes back —
so `list_participants` has no visibility filter in it. The policy is:

- **read** — anyone, but only rows that are both published and consented
- **write** — no policy at all, so only the service role (`get_admin_db`) can
  insert or update. That is the door the staff admin tool will use.

Two rules are constraints rather than conventions: consent cannot be recorded
without a timestamp, and a row cannot be published without consent. Unpublishing
someone is one boolean, and a story cannot go live by accident.

Adding a table? Read `.claude/skills/adding-an-rls-table` first. A table without
RLS is readable by anyone with the publishable key, which is in the browser
bundle.

## Environment

| Variable | Where | Purpose |
|---|---|---|
| `CORS_ORIGINS` | `backend/.env` | Comma-separated origins allowed to call the API from a browser. |
| `SUPABASE_URL` | `backend/.env` | Project URL. |
| `SUPABASE_PUBLISHABLE_KEY` | `backend/.env` | Key for RLS-enforced access. |
| `SUPABASE_SECRET_KEY` | `backend/.env` | Service role. Bypasses RLS. Server-side only. |
| `NEXT_PUBLIC_API_URL` | `frontend/.env.local` | Where the frontend looks for the backend. |

Anything prefixed `NEXT_PUBLIC_` is inlined into the browser bundle. Never put a
secret behind one.