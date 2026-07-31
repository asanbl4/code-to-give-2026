# FastAPI + Supabase magic-link auth template

**Date:** 2026-07-30
**Status:** Implemented

## Goal

A reusable starter combining FastAPI with Supabase for both authentication and
database. Auth and DB wiring only — no demo domain features.

## Premise correction

The initial framing assumed the free tier forbids editing the auth email, so
only Supabase's own magic link is available. Editing email templates is in fact
available on all hosted plans (dashboard or Management API), and templates
expose `{{ .ConfirmationURL }}`, `{{ .Token }}`, and `{{ .TokenHash }}`. What
the free tier actually limits is the built-in email sender's rate.

The design still uses the default, unedited magic-link email — not because
editing is blocked, but because it is the least-setup path.

## Approaches considered

| | Flow | Verdict |
|---|---|---|
| **A. Next.js + PKCE** | Link → `/auth/callback?code=` → `exchangeCodeForSession` | **Chosen.** Canonical Supabase pattern for a JS frontend with a separate API. |
| B. FastAPI-only | Template rewritten to `{{ .TokenHash }}` → FastAPI `verify_otp` | No frontend, but non-standard and requires editing the template. |
| C. 6-digit OTP | `{{ .Token }}` in the template, code typed into any client | Also requires a template edit; no browser flow. |

A client is unavoidable in some form: something must receive the browser
redirect when the user clicks the link.

## Architecture

Next.js owns the session; FastAPI is stateless.

1. `/login` calls `signInWithOtp` with `emailRedirectTo` → `/auth/callback`
2. Supabase emails its default magic link
3. Click → `/auth/v1/verify` → redirect to `/auth/callback?code=...`
4. `exchangeCodeForSession(code)`; `@supabase/ssr` writes httpOnly cookies
5. `proxy.ts` refreshes the token on every request
6. Server Components call FastAPI with `Authorization: Bearer <jwt>`

### Token verification

`PyJWKClient` against `{SUPABASE_URL}/auth/v1/.well-known/jwks.json`, cached
300s. Verifies signature, `exp`, `aud=authenticated`, `iss`; requires `sub`.
The project signs with ES256. HS256 fallback via `SUPABASE_JWT_SECRET` keeps
the template usable on legacy projects. The JWK client is injectable so tests
run offline.

`get_current_user` is a sync `def` so FastAPI runs it in a threadpool — a cold
JWKS cache does a blocking HTTPS fetch.

### Database access

RLS-first. `get_db` builds a per-request Supabase client carrying the caller's
token, so `auth.uid()` resolves and policies enforce authorization in Postgres.
One rule set serves both Next.js and FastAPI. `get_admin_db` uses the secret
key and bypasses RLS; named to make that deliberate.

A client is constructed per request because a shared one cannot safely carry
per-caller credentials under concurrency.

### Schema

`public.profiles`, PK referencing `auth.users(id)`, auto-provisioned by an
`after insert on auth.users` trigger. RLS on, owner-only select and update.
Policies use `(select auth.uid())` so the subquery is evaluated once per
statement.

Trigger functions have `EXECUTE` revoked from `public`, `anon`, and
`authenticated`. `handle_new_user` is `SECURITY DEFINER`, and without the
revoke it is reachable at `/rest/v1/rpc/handle_new_user` — flagged by the
Supabase security advisor during implementation and fixed.

### Errors

401 with `WWW-Authenticate: Bearer` for missing, malformed, expired,
wrong-audience, wrong-issuer, and untrusted-signature tokens. PostgREST
`42501` (RLS denial on write) maps to 403; other `APIError`s to 400.

### Testing

pytest + `TestClient`, a locally generated EC keypair, and a stub JWK client.
No network, no Supabase project. `get_verifier` and `get_db` are overridden via
`dependency_overrides` so the real lifespan never builds a network-backed
client.

## Scope decisions

- **Demo `notes` table: dropped.** Initially included to prove RLS end-to-end;
  removed on request so the template ships auth and DB wiring only. The README
  documents the add-a-table pattern instead.
- **`profiles` kept.** It is the standard Supabase auth companion, gives
  `/api/me` something to read, and demonstrates the RLS-scoped query path.

## Verification

- 15 backend tests pass; `ruff check` and `ruff format` clean
- `tsc --noEmit`, `next build`, and `eslint` clean
- Live: `/health` 200; `/api/me` 401 with challenge; `/` and `/dashboard`
  redirect to `/login`; `/auth/callback` without a code redirects to the error
  page; OpenAPI exposes the bearer scheme
- Live JWKS: real keys fetched from the project, real `kid` resolved, forged
  signature rejected, unknown `kid` rejected
- Supabase security advisors report no findings

Not verified end-to-end: clicking an actual magic link, which requires a human
with access to the inbox.
