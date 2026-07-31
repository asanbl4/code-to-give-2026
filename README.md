# FastAPI + Supabase Auth Template

Magic-link authentication and a Supabase Postgres connection. Nothing else — no
demo domain models, no example CRUD. Clone it, point it at a project, start
building.

## Architecture

```
Browser ──1── Next.js /login ──2── Supabase Auth ──3── your inbox
   │                                                      │
   │                              4. click the magic link ┘
   ▼
Next.js /auth/callback ──5── exchangeCodeForSession ──> session cookies
   │
   └──6── fetch(FastAPI, Authorization: Bearer <jwt>)
              │
              └──7── verify signature against Supabase JWKS (no network call)
                        │
                        └──8── query Postgres as that user (RLS applies)
```

**Next.js owns the session. FastAPI is stateless** — it never sets a cookie,
never stores a session, and never sees a password. It verifies a signed token
and forwards it to PostgREST so row-level security does the authorization.

## Layout

```
backend/          FastAPI. Verifies JWTs, talks to Postgres as the caller.
  app/core/       config, JWT verification, PostgREST error mapping
  app/deps.py     get_current_user, get_db (RLS), get_admin_db (bypasses RLS)
  app/routers/    health, me
  tests/          full auth suite, runs offline
frontend/         Next.js 16 App Router + @supabase/ssr
  lib/supabase/   browser / server / proxy clients
  proxy.ts        refreshes the session and gates private routes
supabase/         SQL migrations
```

## Setup

The linked project (`gxvxhsflrghnewfwycag`) already has the migration applied
and both `.env` files filled in. Two steps remain, and **both must be done in
the dashboard** — the API cannot do them for you.

### 1. Allow the callback URL

Authentication → URL Configuration:

- **Site URL**: `http://localhost:3000`
- **Redirect URLs**: add `http://localhost:3000/**`

Without this, Supabase silently drops `emailRedirectTo` and sends the user to
the Site URL instead, so the callback never runs.

### 2. Copy the secret key (optional)

Project Settings → API Keys → secret key (`sb_secret_...`) into
`backend/.env` as `SUPABASE_SECRET_KEY`. Only needed if you use
`get_admin_db()`. Auth works without it.

### Run it

```bash
# Terminal 1
cd backend && uv sync && uv run uvicorn app.main:app --reload --port 8000

# Terminal 2
cd frontend && npm install && npm run dev
```

Open <http://localhost:3000>, enter your email, click the link in your inbox.
The dashboard shows your Supabase session next to the JSON that FastAPI
returned for that same token.

## Pointing at a different project

```bash
# 1. Apply the schema
supabase link --project-ref <ref> && supabase db push
#    (or paste supabase/migrations/*.sql into the SQL editor)

# 2. Update both env files
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local

# 3. Do the two dashboard steps above
```

## API

| Route | Auth | Returns |
|---|---|---|
| `GET /health` | no | `{"status": "ok"}` |
| `GET /api/me` | yes | Token identity + the caller's `profiles` row |
| `GET /api/me/claims` | yes | Raw verified JWT claims |

`http://127.0.0.1:8000/docs` has an **Authorize** button — paste an
`access_token` to call protected routes from the browser.

## How auth actually works

**Token verification** (`app/core/security.py`). Supabase signs access tokens
with ES256 and publishes the public key at
`/auth/v1/.well-known/jwks.json`. `TokenVerifier` fetches that once, caches it
for five minutes, and verifies signature, `exp`, `aud`, and `iss` locally — so
authenticating a request costs zero network round-trips. Legacy projects still
on a shared HS256 secret work too: set `SUPABASE_JWT_SECRET`.

**Database access** (`app/deps.py`). `get_db` builds a Supabase client carrying
the caller's token, so `auth.uid()` resolves inside Postgres and RLS policies
enforce authorization. The same policies apply whether a query comes from
Next.js or FastAPI. `get_admin_db` uses the secret key and **bypasses RLS** —
it is named that way on purpose.

## Adding a table

Write the migration, enable RLS, add policies. Then query it through `get_db`
with no user filter — the database does the filtering.

```sql
create table public.items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.items enable row level security;

-- (select auth.uid()) is evaluated once per statement, not once per row.
create policy "items_select_own" on public.items for select
  to authenticated using ((select auth.uid()) = user_id);
```

```python
@router.get("/items")
def list_items(user: CurrentUser, db: Db):
    with postgrest_errors():
        return db.table("items").select("*").execute().data
```

Forgetting `enable row level security` leaves a table world-readable through
PostgREST. Run `get_advisors` after every schema change — it catches exactly
that.

## Tests

```bash
cd backend && uv run pytest
```

15 tests, no network and no Supabase project required: they generate an EC
keypair locally and inject it into `TokenVerifier`. Covered — missing token,
malformed header, expired, wrong audience, wrong issuer, untrusted signing key,
missing `sub`, HS256 without a configured secret, and the success path.

## Things that will bite you

**Magic links are single-use and browser-bound.** The PKCE verifier is stored
in a cookie on the browser that requested the link. Opening the link on your
phone when you requested it on your laptop fails, and so does a link an email
client prefetched. `/auth/auth-code-error` explains this to users.

**The built-in email service is for testing only.** It is aggressively
rate-limited — check Authentication → Rate Limits for the current cap. Set up
custom SMTP before a demo where several people sign in.

**You do not need to edit the email template.** The default magic-link email
works as-is. If you later want a 6-digit code instead, add `{{ .Token }}` to
the template; template editing is available on all hosted plans.

**Node 20 works but warns.** `@supabase/supabase-js` prints a deprecation
notice below Node 22. `npm audit` also reports advisories in Next 16's own
`postcss` and `sharp` dependencies; the only "fix" npm offers is downgrading to
Next 9, so leave them until upstream patches.
