"""Test fixtures.

The whole auth suite runs offline: we generate an EC keypair locally, sign
tokens with the private half, and hand the public half to TokenVerifier through
its injectable JWK client. No Supabase project and no network are involved.
"""

import os
import time
from typing import Any

import pytest

os.environ.update(
    {
        "SUPABASE_URL": "https://testproject.supabase.co",
        "SUPABASE_PUBLISHABLE_KEY": "sb_publishable_test",
        "SUPABASE_SECRET_KEY": "",
        "SUPABASE_JWT_SECRET": "",
    }
)

import jwt  # noqa: E402
from cryptography.hazmat.primitives.asymmetric import ec  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.core.config import get_settings  # noqa: E402
from app.core.security import TokenVerifier  # noqa: E402
from app.deps import get_db, get_verifier  # noqa: E402
from app.main import create_app  # noqa: E402

ISSUER = "https://testproject.supabase.co/auth/v1"
AUDIENCE = "authenticated"
USER_ID = "11111111-2222-3333-4444-555555555555"
USER_EMAIL = "tester@example.com"


@pytest.fixture(scope="session", autouse=True)
def _clear_settings_cache() -> None:
    get_settings.cache_clear()


@pytest.fixture(scope="session")
def signing_key() -> ec.EllipticCurvePrivateKey:
    return ec.generate_private_key(ec.SECP256R1())


@pytest.fixture(scope="session")
def other_key() -> ec.EllipticCurvePrivateKey:
    """A key the verifier does *not* trust."""
    return ec.generate_private_key(ec.SECP256R1())


class _StubJWKClient:
    """Stands in for PyJWKClient, always returning the one key we trust."""

    def __init__(self, public_key: Any) -> None:
        self._signing_key = type("SigningKey", (), {"key": public_key})()

    def get_signing_key_from_jwt(self, token: str) -> Any:
        return self._signing_key


@pytest.fixture
def verifier(signing_key: ec.EllipticCurvePrivateKey) -> TokenVerifier:
    return TokenVerifier(
        jwks_url="https://testproject.supabase.co/auth/v1/.well-known/jwks.json",
        issuer=ISSUER,
        audience=AUDIENCE,
        jwk_client=_StubJWKClient(signing_key.public_key()),
    )


@pytest.fixture
def make_token(signing_key: ec.EllipticCurvePrivateKey):
    """Build a signed token, overriding any claim or the signing key."""

    def _make(key: Any = None, algorithm: str = "ES256", **claim_overrides: Any) -> str:
        now = int(time.time())
        claims: dict[str, Any] = {
            "sub": USER_ID,
            "email": USER_EMAIL,
            "role": "authenticated",
            "aud": AUDIENCE,
            "iss": ISSUER,
            "iat": now,
            "exp": now + 3600,
        }
        claims.update(claim_overrides)
        return jwt.encode(claims, key or signing_key, algorithm=algorithm)

    return _make


class _FakeQuery:
    """Minimal stand-in for the PostgREST query builder."""

    def __init__(self, rows: list[dict]) -> None:
        self._rows = rows

    def select(self, *_: Any, **__: Any) -> "_FakeQuery":
        return self

    def eq(self, *_: Any, **__: Any) -> "_FakeQuery":
        return self

    def limit(self, *_: Any, **__: Any) -> "_FakeQuery":
        return self

    def execute(self) -> Any:
        return type("Result", (), {"data": self._rows})()


class FakeDb:
    def __init__(self, rows: list[dict] | None = None) -> None:
        self.rows = rows if rows is not None else []

    def table(self, _name: str) -> _FakeQuery:
        return _FakeQuery(self.rows)


@pytest.fixture
def fake_db() -> FakeDb:
    return FakeDb(
        [
            {
                "id": USER_ID,
                "email": USER_EMAIL,
                "full_name": None,
                "avatar_url": None,
                "created_at": "2026-01-01T00:00:00+00:00",
                "updated_at": "2026-01-01T00:00:00+00:00",
            }
        ]
    )


@pytest.fixture
def client(verifier: TokenVerifier, fake_db: FakeDb) -> Any:
    app = create_app()
    # Overriding get_verifier (rather than app.state) keeps the real lifespan
    # from building a network-backed PyJWKClient.
    app.dependency_overrides[get_verifier] = lambda: verifier
    app.dependency_overrides[get_db] = lambda: fake_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
