"""The guard on the routes that write with the service role.

Offline: an EC keypair is generated in-process and the JWKS lookup is stubbed,
so no test here touches the network or a real Supabase project.

Two things are being checked, and they are different:
  * authentication -- is this token genuine? (signature, expiry, aud, iss)
  * authorization  -- does this person hold a staff role?
A valid token from a supporter must still be refused.
"""

from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.testclient import TestClient
from jwt.exceptions import PyJWKClientError

from app.auth import (
    AuthenticatedUser,
    JwtVerifier,
    get_current_user,
    require_staff,
)
from app.main import app

_ISSUER = "https://example.supabase.co/auth/v1"
_SUB = "11111111-1111-1111-1111-111111111111"

_KEY = ec.generate_private_key(ec.SECP256R1())


def _token(**overrides: Any) -> str:
    claims: dict[str, Any] = {
        "sub": _SUB,
        "email": "staff@example.com",
        "aud": "authenticated",
        "iss": _ISSUER,
        "exp": datetime.now(UTC) + timedelta(hours=1),
    }
    claims.update(overrides)
    return jwt.encode(claims, _KEY, algorithm="ES256")


class StubVerifier(JwtVerifier):
    """The real decode path, with the network JWKS fetch replaced."""

    def __init__(self) -> None:
        self._issuer = _ISSUER

    def verify(self, token: str) -> dict[str, Any]:
        return jwt.decode(
            token,
            _KEY.public_key(),
            algorithms=["ES256"],
            audience="authenticated",
            issuer=_ISSUER,
            options={"require": ["exp", "sub"]},
        )


def _credentials(token: str) -> HTTPAuthorizationCredentials:
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)


def _authenticate(token: str) -> AuthenticatedUser:
    return get_current_user(_credentials(token), StubVerifier())


# --- authentication ---------------------------------------------------------


def test_valid_token_identifies_the_caller() -> None:
    user = _authenticate(_token())

    assert user.id == _SUB
    assert user.email == "staff@example.com"


def test_missing_credentials_are_401_with_a_challenge() -> None:
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(None, StubVerifier())

    assert exc_info.value.status_code == 401
    assert exc_info.value.headers["WWW-Authenticate"] == "Bearer"


def test_expired_token_is_401() -> None:
    expired = _token(exp=datetime.now(UTC) - timedelta(seconds=1))

    with pytest.raises(HTTPException) as exc_info:
        _authenticate(expired)

    assert exc_info.value.status_code == 401


def test_token_signed_by_someone_else_is_401() -> None:
    """The failure that matters: a well-formed token this project did not sign."""
    forged = jwt.encode(
        {
            "sub": _SUB,
            "aud": "authenticated",
            "iss": _ISSUER,
            "exp": datetime.now(UTC) + timedelta(hours=1),
        },
        ec.generate_private_key(ec.SECP256R1()),
        algorithm="ES256",
    )

    with pytest.raises(HTTPException) as exc_info:
        _authenticate(forged)

    assert exc_info.value.status_code == 401


def test_token_with_an_unknown_key_id_is_401_not_500() -> None:
    """Regression: a forged token used to crash the endpoint.

    The real PyJWKClient raises PyJWKClientError when a token's `kid` is not in
    the project's JWKS -- which is what a token signed with someone else's key
    looks like. That exception is not a subclass of InvalidTokenError, so it
    escaped the handler and became a 500. Caught against the live project.
    """

    class UnknownKidVerifier(StubVerifier):
        def verify(self, token: str) -> dict[str, Any]:
            raise PyJWKClientError('Unable to find a signing key that matches: "None"')

    with pytest.raises(HTTPException) as exc_info:
        get_current_user(_credentials(_token()), UnknownKidVerifier())

    assert exc_info.value.status_code == 401
    assert exc_info.value.headers["WWW-Authenticate"] == "Bearer"


def test_wrong_audience_is_401() -> None:
    with pytest.raises(HTTPException) as exc_info:
        _authenticate(_token(aud="anon"))

    assert exc_info.value.status_code == 401


def test_wrong_issuer_is_401() -> None:
    with pytest.raises(HTTPException) as exc_info:
        _authenticate(_token(iss="https://attacker.example.com/auth/v1"))

    assert exc_info.value.status_code == 401


def test_garbage_token_is_401() -> None:
    with pytest.raises(HTTPException) as exc_info:
        _authenticate("not-a-jwt")

    assert exc_info.value.status_code == 401


# --- authorization ----------------------------------------------------------


def test_admin_role_is_staff() -> None:
    assert require_staff(frozenset({"admin"})) is None


def test_editor_role_is_staff() -> None:
    assert require_staff(frozenset({"editor"})) is None


def test_supporter_is_refused_with_403_not_401() -> None:
    """A supporter authenticated correctly; they simply may not do this.

    401 would tell them to sign in again, which cannot help.
    """
    with pytest.raises(HTTPException) as exc_info:
        require_staff(frozenset({"supporter"}))

    assert exc_info.value.status_code == 403


def test_no_roles_at_all_is_refused() -> None:
    with pytest.raises(HTTPException) as exc_info:
        require_staff(frozenset())

    assert exc_info.value.status_code == 403


def test_a_role_claim_in_the_token_grants_nothing() -> None:
    """Roles come from public.user_roles, never from the token body.

    Supabase puts `"role": "authenticated"` in every access token, and a caller
    can put anything in a token they mint themselves. Only what the database
    says is consulted, so this claim must not be a promotion.
    """
    user = _authenticate(_token(role="admin", app_role="admin", user_role="admin"))

    assert user.id == _SUB
    # The verified identity carries no authority of its own.
    assert not hasattr(user, "role")


# --- end to end -------------------------------------------------------------


def test_admin_routes_reject_an_anonymous_request(client: TestClient) -> None:
    """No Authorization header, so this must not reach the database."""
    response = client.get("/api/admin/participants")

    assert response.status_code in (401, 503)


def test_admin_routes_reject_a_supporter() -> None:
    """A genuine token, but not a staff one. Must be 403 and touch nothing."""
    from app.auth import get_user_roles

    app.dependency_overrides[get_user_roles] = lambda: frozenset({"supporter"})
    try:
        response = TestClient(app).get(
            "/api/admin/participants",
            headers={"Authorization": f"Bearer {_token()}"},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 403
