"""The single door between this API and Postgres.

Nothing else in the app constructs a Supabase client. Routers take `Db` (or
`AdminDb`) as a dependency and get a client that is already pointed at the right
project with the right key, so swapping how connections are made touches this
file and no other.

**Authorization lives in Postgres, not in Python.** `get_db` uses the
publishable key, which is subject to row-level security, so a router queries a
table without a `WHERE` clause for visibility and RLS decides what comes back.
That only holds for tables that actually have RLS enabled and policies written
-- see `.claude/skills/adding-an-rls-table`.
"""

from collections.abc import Iterator
from contextlib import contextmanager
from functools import lru_cache
from typing import Annotated

from fastapi import Depends, HTTPException, status
from postgrest.exceptions import APIError
from supabase import Client, create_client

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
def _rls_client() -> Client:
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_publishable_key)


@lru_cache(maxsize=1)
def _service_client() -> Client:
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_secret_key)


def get_db() -> Client:
    """RLS-enforcing client. The default for anything a router does.

    Cached and shared, which is safe only because every caller is currently
    anonymous. The moment this API gains authentication, this must build a
    client per request carrying the caller's JWT -- one shared client cannot
    hold per-caller credentials under concurrency.
    """
    if not get_settings().database_configured:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, _UNCONFIGURED)
    return _rls_client()


def get_admin_db() -> Client:
    """Service-role client. Bypasses RLS completely.

    Named to make that impossible to use by accident. Reserve it for staff
    tooling that is meant to see and write everything; never reach for it to
    make an RLS denial go away.
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
