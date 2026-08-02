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

Staff sign in with **a password or a magic link** — both land on the same
authorization check. There is no shared token: the previous `ADMIN_TOKEN`
granted service-role access to anyone who learned it, could not be revoked for
one person, and left no record of who had used it.

Password is the default on the sign-in screen because it sends no email.
Supabase's built-in email sender is capped at roughly **two messages per hour**
and the cap cannot be raised, which is fine day to day and a liability during a
demo. Magic link remains for staff who would rather not keep a password.

Every staff account starts with the password **`changeme`**. Adding a row to
`role_allowlist` creates the account there and then, so a new admin can sign in
immediately instead of waiting on an email. The trade-off is deliberate and
worth saying out loud: it is one shared, published default, so anyone who knows
a staff address and has read this repository can sign in as them. Fine for a
demo — before this site holds anything private, give each account its own
password:

```bash
cd backend && uv run python scripts/set_staff_password.py someone@love21foundation.com
```

**Identity and permission are separate, on purpose.** The JWT proves *who* you
are; `public.user_roles` decides *what you may do*. A role claim inside a token
grants nothing, because a caller can put anything in a token they mint.

### Roles

| Role | Can |
|---|---|
| `admin` | Everything, including granting roles |
| `editor` | The staff tool: participants, photos, face tags |
| `supporter` | Their own profile. The default for any new sign-up. |

`public.role_allowlist` maps an email to the role it should receive, and
inserting a row is the whole of "create a staff member": one trigger provisions
the `auth.users` row with the default password, another grants the listed role.
Someone who signs up on their own without being listed becomes a `supporter` —
the default has to be the harmless one.

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

### Giving someone a password

```bash
cd backend
uv run python scripts/set_staff_password.py someone@love21foundation.com
```

Prompts for the password (never taken as an argument — that would sit in your
shell history and in `ps`), creates the account if it does not exist, and prints
the roles the database actually granted. Add them to `role_allowlist` first, or
it will tell you they have none.

A password grants nothing on its own: `public.user_roles` still decides whether
that session may open the staff tool.

> **Before relying on passwords, raise the floor in the dashboard.** Supabase's
> default minimum is 6 characters and leaked-password checking is off — the
> security advisor flags the latter. Auth → Providers → Email → set a minimum of
> 12 and enable "Prevent use of leaked passwords".

### One-time Supabase setup

These two cannot be scripted; do them in the dashboard once.

1. **Auth → URL Configuration**
   - Site URL: `http://localhost:3000`
   - Redirect URLs: add `http://localhost:3000/auth/callback`
     (and your deployed origin's `/auth/callback` when you have one)
2. **Auth → Providers → Email**: enabled. For the hackathon volunteer portal,
   turn **Confirm email off** so an application can create a password account
   without using Supabase's built-in email sender. In production, configure
   custom SMTP and turn confirmation back on to verify address ownership.

Then set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
in `frontend/.env.local` (see `.env.local.example`), and sign in at
<http://localhost:3000/admin/login>.

### Gotchas

- **The built-in email sender is rate-limited** — roughly two messages an hour,
  and the cap cannot be raised. A refused send still consumes an attempt. The
  volunteer portal avoids it by using passwords. Configure custom SMTP (Auth →
  SMTP Settings) if you want staff magic links or verified volunteer addresses
  to be dependable.
- **Before a demo, sign in beforehand.** Sessions persist through the refresh
  token, so a browser signed in the night before needs no email at all.
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
