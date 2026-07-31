# AGENTS.md

FastAPI + Supabase auth template. Next.js owns the session; FastAPI is
stateless and verifies JWTs. Auth and database wiring only — **no demo
features.** Keep it that way unless asked.

`frontend/AGENTS.md` also applies inside `frontend/`. Read it: Next.js 16
renamed several conventions and your training data is likely stale.

## Commands

```bash
# Backend (from backend/)
uv sync
uv run uvicorn app.main:app --reload --port 8000
uv run pytest                 # 15 tests, fully offline
uv run ruff check . && uv run ruff format .

# Frontend (from frontend/)
npm install
npm run dev                   # port 3000
npm run build                 # includes typecheck
npm run lint
```

Node 20 works but `@supabase/supabase-js` warns; 22+ preferred. The `npm audit`
findings are in Next 16's own `postcss`/`sharp` deps — the only offered "fix"
downgrades to Next 9. Leave them.

## Invariants

Break these and you get a security hole, not a bug.

1. **Authorization lives in Postgres.** `get_db` forwards the caller's JWT so
   `auth.uid()` resolves and RLS filters the query. Do not add `WHERE user_id =
   ...` in Python and do not reimplement authorization there.
2. **Every new table needs `enable row level security` plus policies.** Without
   RLS, a table is readable by anyone holding the publishable key — which ships
   in the browser bundle.
3. **`get_admin_db` bypasses RLS.** Use it only for genuine admin work, never to
   route around a policy that is inconvenient.
4. **Revoke `EXECUTE` on new database functions.** A `SECURITY DEFINER` function
   in `public` is callable at `/rest/v1/rpc/<name>` by anon. This repo already
   had that hole once.
5. **Run `get_advisors(project_id, type="security")` after any DDL.** It catches
   1, 2, and 4. Treat findings as blocking.
6. **FastAPI never sets a cookie or stores a session.** It verifies a token and
   forwards it. Session state belongs to Next.js.

## Conventions

| Path | Holds |
|---|---|
| `app/core/config.py` | Settings. Add env vars here, and to both `.env.example` files. |
| `app/core/security.py` | JWT verification. Rarely needs changing. |
| `app/core/errors.py` | `postgrest_errors()` — wrap every PostgREST call in it, or an RLS denial becomes a 500. |
| `app/deps.py` | `CurrentUser`, `Db`, `AdminDb`. |
| `app/routers/` | One module per resource; register it in `main.py`. |
| `supabase/migrations/` | `<timestamp>_<description>.sql`. Apply via `apply_migration`. |
| `lib/supabase/` | Three clients: `client` (browser), `server` (RSC/actions), `proxy` (session refresh). |

Write RLS policies as `(select auth.uid())`, not bare `auth.uid()` — the
subquery is evaluated once per statement rather than once per row.

When an update or delete returns no rows, respond 404, not 403. A 403 confirms
the row exists and belongs to someone else.

## Two things that break silently

**`lib/supabase/proxy.ts`**: nothing may run between `createServerClient` and
`getClaims()`, and `supabaseResponse` must be returned as-is. Violating either
logs users out at random, with no error.

**Redirect allow-list**: if `http://localhost:3000/**` is not listed under
Authentication → URL Configuration, Supabase discards `emailRedirectTo` and
sends users to the Site URL instead. No error is raised anywhere.

## Testing

`tests/` runs with no network and no Supabase project: a locally generated EC
keypair is injected into `TokenVerifier`, and `get_verifier`/`get_db` are
replaced via `dependency_overrides`. Keep it that way — never point a test at
the live project.

These tests cover routing, auth, and serialization. **They do not exercise RLS
policies** — `FakeDb` has no policy engine. Verify policies against a real
project or `supabase start`.

## Environment

`backend/.env` and `frontend/.env.local` are gitignored and must stay that way;
only the `.example` files are tracked. `SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_URL` must point at the same project or the issuer check
fails with a 401.

Use `127.0.0.1` rather than `localhost` in `NEXT_PUBLIC_API_URL`: Node may
resolve `localhost` to `::1`, which uvicorn does not bind by default.

## Scope

This is a starter other projects are cloned from. Prefer deleting over adding.
If you need a demo endpoint to verify something, delete it before you finish.
