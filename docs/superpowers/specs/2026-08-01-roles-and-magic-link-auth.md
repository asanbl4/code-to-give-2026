# Roles and magic-link admin access

**Date:** 2026-08-01
**Status:** Implemented and verified against the live project
**Supersedes:** the `ADMIN_TOKEN` shared secret in `app/admin_auth.py`

## Goal

Replace the shared admin token with per-person sign-in, and give the schema a
way to say what somebody is allowed to do.

## What was wrong

`ADMIN_TOKEN` was one string, typed into a box, kept in `sessionStorage`, and
compared with `secrets.compare_digest`. Whoever held it got service-role access,
which bypasses RLS entirely. It could not be revoked for one person without
rotating it for everyone, and the logs could not say who had used it — on a
system holding photographs of vulnerable people and their consent records.

A second, quieter problem: three migrations from the earlier auth work had been
applied to the project and never committed, so `public.profiles` and
`handle_new_user` existed with nothing in the repo explaining them.

## Schema

```
auth.users ──1:1──> public.profiles          (id, email, full_name, avatar_url)
     │
     └────1:N──> public.user_roles           (user_id, role)  ← composite PK
                        ▲
                        │ granted on first sign-in by a trigger
                        │
              public.role_allowlist          (email → role)
```

### `app_role`

An enum, not free text: `admin` | `editor` | `supporter`.

- `admin` — everything, including granting roles
- `editor` — the staff tool: participants, photos, face tags
- `supporter` — their own impact profile. The default for anyone new.

Members (`participants`) deliberately do **not** get logins. Their consent is a
signed paper form plus a staff attestation, and adding a self-service account
for that population is a bigger decision than this change.

### Why roles are a separate table

`profiles` has `profiles_update_own`, so a user may PATCH their own profile row.
A `profiles.role` column would therefore be a one-request self-promotion to
admin. `user_roles` has a select-your-own policy and **no** insert, update or
delete policy, so only the service role can grant anything.

The primary key is `(user_id, role)` rather than one row per user, so a staff
member who also donates can hold `editor` and `supporter` at once.

### Why the allowlist is keyed by email

The people who should be admins have usually not signed in yet — Supabase
creates the `auth.users` row on first magic-link click. Keying by email lets a
grant wait for them. `assign_role_on_signup`, an `after insert on auth.users`
trigger, reads the list and falls back to `supporter` for anyone absent: the
default has to be the harmless one.

`role_allowlist` has RLS enabled with no policies at all. The list of who can
administer the site is not readable by `anon` or `authenticated`.

### Function grants

Every trigger function has `EXECUTE` revoked from `public`, `anon` and
`authenticated` — a `SECURITY DEFINER` function in `public` is otherwise
callable at `/rest/v1/rpc/<name>` by anyone holding the publishable key, which
ships in the browser bundle.

`has_role()` and `is_staff()` are the exception: they are `SECURITY INVOKER`, so
the `user_roles_select_own` policy limits them to the caller's own rows, and an
RLS policy cannot call a function the querying role may not execute.

## Auth flow

Next.js owns the session; FastAPI stays stateless.

1. `/admin/login` calls `signInWithOtp` with `shouldCreateUser: false`
2. Supabase emails its default magic link
3. Click → `/auth/v1/verify` → `/auth/callback?code=…`
4. `exchangeCodeForSession` writes httpOnly cookies via `@supabase/ssr`
5. `proxy.ts` refreshes the token on every request (Next 16 renamed
   `middleware` → `proxy`)
6. Server Components call FastAPI with `Authorization: Bearer <jwt>`

### Two layers, on purpose

**Authentication** — `app/auth.py` verifies the signature against the project's
JWKS (`PyJWKClient`, 300s cache), plus `exp`, `aud=authenticated`, `iss`, `sub`.

**Authorization** — `require_staff` then reads `public.user_roles` through a
client carrying *the caller's own token*, so RLS produces the answer.

A JWT proves identity, never permission. Supabase puts `"role": "authenticated"`
in every token and a caller can mint a token saying anything; nothing in the
token body is consulted. There is a test for exactly this.

The `/admin/stories` layout guard is a usability gate, not the security
boundary. The boundary is the API, which re-checks independently — a forged
cookie yields a rendered shell and a wall of 403s.

## Bugs found while building this

Both were caught against the live project, not by the offline tests, and both
now have regression tests.

1. **A forged token returned 500 instead of 401.** `PyJWKClientError` is not a
   subclass of `jwt.InvalidTokenError`, so an unrecognised `kid` — precisely
   what a token signed with someone else's key looks like — escaped the handler.

2. **Every admin route 500'd on a *valid* token.**
   `supabase.lib.client_options.ClientOptions` is a stale re-export missing the
   `storage` field the sync client reads, so `create_client` raised
   `AttributeError` before sending a request. The correct import is
   `from supabase import ClientOptions`.

## Verification

RLS probed directly in Postgres by impersonating `anon`, the admin, and a
signed-in stranger — 10/10 checks passed, including a stranger's
`insert into user_roles` being refused with `42501`.

End to end against the live project:

| | admin (allowlisted) | stranger (not) |
|---|---|---|
| `GET /api/me` | `roles:["admin"], is_staff:true` | `roles:["supporter"], is_staff:false` |
| `GET /api/admin/participants` | 200 | 403 |
| `/admin/stories` in a browser | renders, loads members | redirected to `/admin/no-access` |

Anonymous and malformed requests: no token 401, garbage token 401, forged ES256
token 401, legacy anon key 401 (fails the audience check), `/admin/stories`
redirects to `/admin/login`, `/auth/callback` without a code redirects with an
error. No 500s logged.

41 backend tests, `ruff` clean, `tsc` clean, `eslint` clean, `next build` clean.

**Not verified:** a human clicking a link in a real inbox. The Supabase-side
redirect was traced (303 → `/auth/callback`), and PKCE was confirmed live —
`code_challenge`/`s256` on the request, a `pkce_`-prefixed token issued, and the
verifier cookie present — but the final click was done by injecting the session
rather than reading an email.

## Addendum, same day: password sign-in and auth-call volume

Hitting `429: email rate limit exceeded` in the dashboard logs prompted a look
at auth traffic. Two separate problems, only one of which caused the 429.

**The 429 was purely `/otp`.** Supabase's built-in email sender allows about two
messages an hour and the cap cannot be raised — it is a testing sender. Five
sign-in requests in an hour was already over.

**The auth-call volume was a real bug**, unrelated to the 429. `proxy.ts`
matched every route, so every visit to the landing page, `/donate` or `/stories`
spent a round trip refreshing a session those pages never read. Measured by
instrumenting `fetch` inside the Next server, same signed-in traffic each time:

| Route | Before | After |
|---|---|---|
| `/`, `/donate`, `/stories` | 1 each | 0 |
| `/admin/stories`, `/admin/login` | 2 each | 2 |

The matcher is now `/admin/:path*` and `/auth/:path*`. `getUser`/`getRoles` are
also wrapped in React `cache()`; the measurement showed Next's own fetch
memoization was already deduping most of the server-side calls, but the cache
makes it explicit and survives that behaviour changing.

Worth recording: an anonymous request costs **zero** auth calls — `@supabase/ssr`
short-circuits when there is no session cookie, without touching the network.

**Password sign-in added** so a demo never depends on email. `/admin/login`
defaults to email + password (`signInWithPassword`), with magic link one click
away. `scripts/set_staff_password.py` sets one, prompting rather than taking it
as an argument.

A password changes nothing about authorization: both paths produce a session and
`public.user_roles` still decides. Verified in a browser — admin with password
reached the tool with 0 emails sent, a non-staff account with a valid password
was redirected to `/admin/no-access`, and a wrong password produced the generic
"does not match an account" message that does not reveal whether the address
exists.

One bug found: the Auth admin API answers **405 to PATCH** on
`/admin/users/{id}`; it wants PUT.

Passwords make the previously-irrelevant `auth_leaked_password_protection`
advisor warning relevant. Enabling it, and raising the 6-character default
minimum, are dashboard settings and are now called out in the README.

## Follow-ups not done here

- **`profiles` is written but never read.** `/api/me` returns data from the
  token and `user_roles`; nothing reads `full_name` or `avatar_url` yet.
- **No UI for granting roles.** It is SQL in the dashboard, documented in the
  README. An `admin`-only screen would need `role_allowlist` writes through the
  service role.
- **`supporter` is unused.** Assigned on sign-up, but `/profile` still renders
  `DEMO_SUPPORTER_PROFILE`. Wiring it up means the donation and volunteering
  tables, which were explicitly out of scope.
- **Leaked-password protection is off** (Supabase advisor, WARN). Irrelevant
  while magic link is the only method; enable it if passwords are ever added.
