# Next.js + FastAPI Starter

A Next.js frontend and a FastAPI backend, connected. Nothing else — no database,
no auth, no example CRUD. Clone it and start building.

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
backend/          FastAPI
  app/main.py     CORS, GET /health, GET /api/hello
  pyproject.toml  deps + ruff config
frontend/         Next.js 16 App Router, React 19, Tailwind v4, TypeScript
  app/page.tsx    fetches the backend and renders the result
docs/             design docs
```

## Setup

Both env files are gitignored. Copy the examples:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
```

The defaults work for local development — no editing needed.

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
| `GET /health` | `{"status": "ok"}` |
| `GET /api/hello` | `{"message": "Hello from FastAPI"}` |

<http://127.0.0.1:8000/docs> has interactive docs, generated from the route
signatures.

## Adding an endpoint

While the API is this small, add routes directly to `app/main.py`:

```python
@app.get("/api/items")
def list_items() -> list[dict]:
    return []
```

Once there are more than a handful, split them into `app/routers/items.py` and
register the router:

```python
from app.routers import items

app.include_router(items.router)
```

Call it from a Server Component the way `app/page.tsx` does. If you call it from
a Client Component instead (`'use client'`), the request comes from the browser
and CORS applies — that origin must be in `CORS_ORIGINS`.

## Environment

| Variable | Where | Purpose |
|---|---|---|
| `CORS_ORIGINS` | `backend/.env` | Comma-separated origins allowed to call the API from a browser. |
| `NEXT_PUBLIC_API_URL` | `frontend/.env.local` | Where the frontend looks for the backend. |

Anything prefixed `NEXT_PUBLIC_` is inlined into the browser bundle. Never put a
secret behind one.

## Things that will bite you

**Use `127.0.0.1`, not `localhost`, in `NEXT_PUBLIC_API_URL`.** Node may resolve
`localhost` to `::1`, which uvicorn does not bind by default. The frontend then
reports a connection refused that looks exactly like a backend that isn't
running.

**Node 20 works but warns.** `eslint-visitor-keys` wants Node 20.19+; this
machine has 20.13.1. It only affects install-time warnings. Node 22 silences it.

**`npm audit` reports 12 high-severity findings**, all inside Next 16's own
dependency tree. The only fix npm offers downgrades Next several major versions,
so leave them until upstream patches.

**There are no tests yet.** Add `backend/tests/` with pytest before the backend
grows real behavior.
