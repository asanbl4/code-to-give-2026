import time

import pytest

from tests.conftest import USER_EMAIL, USER_ID


def test_health_needs_no_auth(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_missing_token_is_rejected(client):
    response = client.get("/api/me")
    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


@pytest.mark.parametrize("header", ["", "Bearer", "Basic abc", "Bearer not.a.jwt"])
def test_malformed_authorization_header_is_rejected(client, header):
    response = client.get("/api/me", headers={"Authorization": header})
    assert response.status_code == 401


def test_expired_token_is_rejected(client, make_token):
    now = int(time.time())
    token = make_token(iat=now - 7200, exp=now - 3600)
    response = client.get("/api/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401
    assert "expired" in response.json()["detail"].lower()


def test_wrong_audience_is_rejected(client, make_token):
    token = make_token(aud="some-other-service")
    response = client.get("/api/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401
    assert "audience" in response.json()["detail"].lower()


def test_wrong_issuer_is_rejected(client, make_token):
    token = make_token(iss="https://evil.supabase.co/auth/v1")
    response = client.get("/api/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401


def test_token_signed_by_untrusted_key_is_rejected(client, make_token, other_key):
    token = make_token(key=other_key)
    response = client.get("/api/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401


def test_token_without_sub_is_rejected(client, make_token, signing_key):
    import jwt

    now = int(time.time())
    token = jwt.encode(
        {
            "aud": "authenticated",
            "iss": "https://testproject.supabase.co/auth/v1",
            "exp": now + 3600,
        },
        signing_key,
        algorithm="ES256",
    )
    response = client.get("/api/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401


def test_hs256_token_rejected_when_no_secret_configured(client, make_token):
    token = make_token(key="a" * 32, algorithm="HS256")
    response = client.get("/api/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401
    assert "SUPABASE_JWT_SECRET" in response.json()["detail"]


def test_valid_token_returns_identity_and_profile(client, make_token):
    token = make_token()
    response = client.get("/api/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200

    body = response.json()
    assert body["id"] == USER_ID
    assert body["email"] == USER_EMAIL
    assert body["role"] == "authenticated"
    assert body["profile"]["id"] == USER_ID


def test_valid_token_without_profile_row(client, make_token, fake_db):
    fake_db.rows = []
    token = make_token()
    response = client.get("/api/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["profile"] is None


def test_claims_endpoint_returns_verified_claims(client, make_token):
    token = make_token()
    response = client.get("/api/me/claims", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200

    claims = response.json()
    assert claims["sub"] == USER_ID
    assert claims["iss"] == "https://testproject.supabase.co/auth/v1"
