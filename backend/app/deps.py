"""Shared FastAPI dependencies: who is calling, and how to reach the database."""

from functools import lru_cache
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import Client, create_client

from app.core.config import Settings, get_settings
from app.core.security import AuthUser, TokenError, TokenVerifier

# auto_error=False so a missing header produces our own 401 with a
# WWW-Authenticate challenge rather than FastAPI's bare 403.
bearer_scheme = HTTPBearer(
    auto_error=False,
    description="Supabase access token (the `access_token` from a session).",
)

SettingsDep = Annotated[Settings, Depends(get_settings)]
BearerCreds = Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)]


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_verifier(request: Request) -> TokenVerifier:
    return request.app.state.token_verifier


# Deliberately `def`, not `async def`: PyJWKClient may do a blocking HTTPS
# fetch when its cache is cold, so FastAPI should run this in a threadpool.
def get_current_user(
    creds: BearerCreds,
    verifier: Annotated[TokenVerifier, Depends(get_verifier)],
) -> AuthUser:
    if creds is None or not creds.credentials:
        raise _unauthorized("Not authenticated")
    try:
        return verifier.verify(creds.credentials)
    except TokenError as exc:
        raise _unauthorized(str(exc)) from exc


CurrentUser = Annotated[AuthUser, Depends(get_current_user)]


def get_db(
    user: CurrentUser,
    creds: BearerCreds,
    settings: SettingsDep,
) -> Client:
    """A Supabase client acting *as the caller*, so RLS policies apply.

    Depending on `CurrentUser` is load-bearing: it guarantees the token was
    verified before we forward it to PostgREST.

    A client is built per request because a shared one cannot safely carry
    per-caller credentials under concurrency.
    """
    assert creds is not None  # get_current_user already rejected the None case
    client = create_client(settings.supabase_url, settings.supabase_publishable_key)
    client.postgrest.auth(creds.credentials)
    return client


Db = Annotated[Client, Depends(get_db)]


@lru_cache
def _admin_client(url: str, secret_key: str) -> Client:
    return create_client(url, secret_key)


def get_admin_db(settings: SettingsDep) -> Client:
    """A service-role client that BYPASSES RLS.

    Never wire this into a route that serves user input without doing your own
    authorization checks first.
    """
    if not settings.supabase_secret_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SUPABASE_SECRET_KEY is not configured",
        )
    return _admin_client(settings.supabase_url, settings.supabase_secret_key)


AdminDb = Annotated[Client, Depends(get_admin_db)]
