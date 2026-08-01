"""The single door between this API and Postgres.

Nothing else in the app constructs a Supabase client. Routers take `Db` or
`AdminDb` as a dependency and get a client already pointed at the right project
with the right key, so swapping how connections are made touches this file and
no other.

**Authorization lives in Postgres, not in Python.** Three clients, in ascending
order of what they can see:

- `get_db`       -- publishable key, no session. Sees exactly what an anonymous
                    visitor sees. The default for public routes.
- `user_client`  -- publishable key *plus a caller's JWT*, so `auth.uid()`
                    resolves and RLS decides what comes back. A router using
                    this needs no `WHERE user_id = ...` clause.
- `get_admin_db` -- the secret key. Bypasses RLS completely.

That only holds for tables with RLS enabled and policies written -- see
`.claude/skills/adding-an-rls-table`.
"""

from collections.abc import Iterator
from contextlib import contextmanager
from functools import lru_cache
from typing import Annotated

from fastapi import Depends, HTTPException, status
from postgrest.exceptions import APIError

# From `supabase`, not `supabase.lib.client_options`: the latter is a stale
# re-export whose ClientOptions lacks the `storage` field the sync client reads,
# so passing it raises AttributeError inside create_client.
from supabase import Client, ClientOptions, create_client

from app.config import get_settings

_UNCONFIGURED = (
    "Database is not configured. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY "
    "in backend/.env -- see backend/.env.example."
)
_UNCONFIGURED_ADMIN = (
    "Admin database access is not configured. Set SUPABASE_URL and "
    "SUPABASE_SECRET_KEY in backend/.env -- see backend/.env.example."
)


@lru_cache(maxsize=1)
def _anon_client() -> Client:
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_publishable_key)


@lru_cache(maxsize=1)
def _service_client() -> Client:
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_secret_key)


def get_db() -> Client:
    """Anonymous RLS-enforcing client, for routes with no signed-in caller.

    Safe to cache and share precisely because it carries no session. Anything
    that must act *as a particular user* goes through `user_client` instead.
    """
    if not get_settings().database_configured:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, _UNCONFIGURED)
    return _anon_client()


def user_client(access_token: str) -> Client:
    """An RLS client acting as one caller, built fresh for that caller.

    Deliberately not cached. A shared client cannot hold per-caller credentials
    under concurrency -- two requests would race on the same Authorization
    header, and one user would end up executing queries as another.
    """
    settings = get_settings()
    if not settings.database_configured:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, _UNCONFIGURED)

    return create_client(
        settings.supabase_url,
        settings.supabase_publishable_key,
        options=ClientOptions(
            headers={"Authorization": f"Bearer {access_token}"},
            # No session to keep or refresh: the token arrived with the request
            # and dies with it. The frontend owns refreshing.
            auto_refresh_token=False,
            persist_session=False,
        ),
    )


def get_admin_db() -> Client:
    """Service-role client. Bypasses RLS completely.

    Named to make that impossible to use by accident. Reserve it for staff
    tooling meant to see and write everything; never reach for it to make an RLS
    denial go away. Every route that uses it must first establish that the
    caller is staff -- see `app.auth.require_staff`.
    """
    if not get_settings().admin_database_configured:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, _UNCONFIGURED_ADMIN)
    return _service_client()


Db = Annotated[Client, Depends(get_db)]
AdminDb = Annotated[Client, Depends(get_admin_db)]


@contextmanager
def postgrest_errors() -> Iterator[None]:
    """Turn PostgREST failures into HTTP responses.

    Without this an RLS denial surfaces as an unhandled `APIError` and the
    caller gets a 500, which reads as "the server is broken" rather than "you
    may not do that". Wrap every PostgREST call.
    """
    try:
        yield
    except APIError as exc:
        # 42501 is Postgres `insufficient_privilege` -- an RLS policy refused a
        # write. Only reachable on writes: a denied *read* returns zero rows.
        if exc.code == "42501":
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Not permitted") from exc
        raise HTTPException(status.HTTP_400_BAD_REQUEST, exc.message or "Database error") from exc
