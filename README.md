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
| `GET /api/photos` | Published photos with signed URLs and confirmed face tags |
| `GET /api/me` | The signed-in user, their roles, and whether they are staff |
| `POST /api/admin/photos` | Upload a group photo; returns detected faces with suggested names |
| `PATCH /api/admin/faces/{id}` | Confirm, correct, or reject a tag |
| `POST /api/admin/participants/{id}/enroll` | Register a face so the matcher recognises them |

Every `/api/admin/*` route needs `Authorization: Bearer <supabase access token>`
from a staff account. See **Admin access** below.

<http://127.0.0.1:8000/docs> has interactive docs, generated from the route
signatures.

## Admin access

Staff sign in with a Supabase magic link. There is no admin password and no
shared token — the previous `ADMIN_TOKEN` granted service-role access to anyone
who learned it, could not be revoked for one person, and left no record of who
had used it.

**Identity and permission are separate, on purpose.** The JWT proves *who* you
are; `public.user_roles` decides *what you may do*. A role claim inside a token
grants nothing, because a caller can put anything in a token they mint.

### Roles

| Role | Can |
|---|---|
| `admin` | Everything, including granting roles |
| `editor` | The staff tool: participants, photos, face tags |
| `supporter` | Their own profile. The default for any new sign-up. |

`public.role_allowlist` maps an email to the role it should receive. A trigger
on `auth.users` reads it the first time that person signs in, so an address can
be authorised before the account exists. Anyone not on the list becomes a
`supporter` — the default has to be the harmless one.

Both tables are service-role-only for writes: `user_roles` has a select-your-own
policy and nothing else, and `role_allowlist` has RLS on with no policies at all.
A signed-in user cannot promote themselves.

Grant someone access with SQL (Supabase dashboard → SQL Editor):

```sql
insert into public.role_allowlist (email, role, note)
values ('someone@love21foundation.com', 'editor', 'Programme staff');
```

If they already have an account, also grant it now:

```sql
insert into public.user_roles (user_id, role)
select u.id, a.role from auth.users u
join public.role_allowlist a on a.email = lower(u.email)
on conflict do nothing;
```

Revoke by deleting their `user_roles` row *and* their `role_allowlist` entry —
removing only the allowlist leaves an existing grant in place.

### One-time Supabase setup

These two cannot be scripted; do them in the dashboard once.

1. **Auth → URL Configuration**
   - Site URL: `http://localhost:3000`
   - Redirect URLs: add `http://localhost:3000/auth/callback`
     (and your deployed origin's `/auth/callback` when you have one)
2. **Auth → Providers → Email**: enabled, "Confirm email" on.

Then set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
in `frontend/.env.local` (see `.env.local.example`), and sign in at
<http://localhost:3000/admin/login>.

### Gotchas

- **The built-in email sender is rate-limited** — a couple of messages an hour on
  the free tier. Requesting several links in a row returns a 429, which the form
  reports. Configure a custom SMTP provider before a demo.
- **The link must be opened in the browser that requested it.** PKCE stores a
  verifier in a cookie on the requesting device; opening the email on your phone
  after requesting on a laptop fails with a code-verifier error.
- **Links are single-use and short-lived.** A mail client that pre-fetches URLs
  can consume one before you click it.

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

## Face recognition

Detection and matching run **entirely on your own server**. OpenCV YuNet finds
faces, SFace turns each into a 128-number signature, and pgvector matches it
against enrolled members inside Postgres. No image, face, or signature is sent
to any third party, and there is no per-call cost.

Fetch the models once:

```bash
cd backend && uv run python scripts/fetch_models.py   # ~39MB, gitignored
```

The model proposes; a person decides. An upload creates only *suggested* tags,
and RLS never shows those publicly. A staff member confirms each one, with the
match score displayed so they know when to distrust it.

Face signatures are biometric data and are treated as such: their own consent
flag, a trigger that refuses to store them without it, another that **deletes
them outright** when consent is withdrawn, and a table with RLS enabled and no
policies at all, so the publishable key cannot read a single row.

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