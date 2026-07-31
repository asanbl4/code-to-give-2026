# AGENTS.md

Next.js frontend + FastAPI backend, wired together and nothing else. No
database, no auth, no demo domain models. A starting point — build on it.

`frontend/AGENTS.md` also applies inside `frontend/`. Read it: this is Next.js
16, which renamed several conventions, and your training data is likely stale.

## Commands

```bash
# Backend (from backend/)
uv sync
uv run uvicorn app.main:app --reload --port 8000
uv run ruff check . && uv run ruff format .

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
| `backend/app/main.py` | The whole API: CORS, `/health`, `/api/hello`. |
| `backend/pyproject.toml` | Dependencies and ruff config. |
| `frontend/app/` | App Router pages. |
| `backend/.env` | Gitignored. `CORS_ORIGINS`. |
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

Use `127.0.0.1`, not `localhost`, in `NEXT_PUBLIC_API_URL`. Node may resolve
`localhost` to `::1`, which uvicorn does not bind by default; you get a
connection refused that looks like the backend is down when it isn't.

`NEXT_PUBLIC_` is a real prefix with real consequences — those values are inlined
into the browser bundle. Never put a secret behind one.

## Tests

There are none yet. If you add behavior worth trusting, add `backend/tests/`
with pytest and wire it into `pyproject.toml`. Don't let the backend grow a
second real endpoint without one.

## Known noise

- **Node 20.13.1** is below the 20.19+ that `eslint-visitor-keys` asks for.
  Everything works; npm warns on install. Node 22 silences it.
- **`npm audit` reports 12 high-severity findings**, all inside Next 16's own
  dependency tree. The only fix npm offers downgrades Next several major
  versions. Leave them until upstream patches.

## Scope

Prefer deleting over adding. If you add a demo endpoint to verify something,
delete it before you finish.
