# AGENTS.md

Next.js frontend + FastAPI backend, wired together, plus a Supabase/Postgres
connector and one domain table (`participants`). No auth yet.

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
| `backend/app/db.py` | The only place a Supabase client is built. |
| `backend/app/routers/` | One module per resource. |
| `backend/app/schemas/` | Pydantic models for what crosses the API boundary. |
| `backend/tests/` | pytest, offline. `FakeDb` stands in for PostgREST. |
| `backend/pyproject.toml` | Dependencies, ruff and pytest config. |
| `supabase/migrations/` | Schema history. One `.sql` file per applied migration. |
| `frontend/app/` | App Router pages. |
| `backend/.env` | Gitignored. `CORS_ORIGINS`, `SUPABASE_*`. |
| `frontend/.env.local` | Gitignored. `NEXT_PUBLIC_API_URL`. |
| `docs/superpowers/specs/` | Dated design docs. History, not current state. |

As this grows, split `app/main.py` into `app/routers/<resource>.py` and register
each router in `main.py` — one module per resource.

## How the two connect

`frontend/app/page.tsx` is a Server Component. It fetches
`${NEXT_PUBLIC_API_URL}/api/hello` at request time and renders either the
response or a red box naming the failure. That red box is the connection status:
break the wiring and the page says so.

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

`participants` departs from that skill's owner-scoped pattern on purpose: it is
public editorial content, so the policy is "anyone reads published *and*
consented rows" and there is no write policy at all. Writes require the service
role via `get_admin_db`.

Two invariants the database enforces rather than trusting callers to remember:
consent cannot be recorded without a timestamp, and a row cannot be published
without consent.

Migrations are applied through the Supabase MCP tools; save a copy of every
applied migration into `supabase/migrations/<version>_<name>.sql` so the schema
has a history in git.

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
