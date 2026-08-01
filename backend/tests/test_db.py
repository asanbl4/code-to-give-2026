"""The connector's failure modes."""

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from postgrest.exceptions import APIError

from app.config import Settings
from app.db import get_admin_db, get_db, postgrest_errors, user_client


def _unconfigured() -> Settings:
    return Settings(supabase_url="", supabase_publishable_key="", supabase_secret_key="")


def _configured() -> Settings:
    return Settings(
        supabase_url="https://example.supabase.co",
        supabase_publishable_key="sb_publishable_test",
        supabase_secret_key="sb_secret_test",
    )


def test_user_client_carries_the_callers_token(monkeypatch: pytest.MonkeyPatch) -> None:
    """Regression: this raised AttributeError before it sent a single request.

    `supabase.lib.client_options.ClientOptions` is a stale re-export missing the
    `storage` field the sync client reads, so `create_client` blew up inside
    itself and every admin route 500'd on a perfectly valid token. Caught
    against the live project. Building the client here keeps it fixed.
    """
    monkeypatch.setattr("app.db.get_settings", _configured)

    client = user_client("a-caller-token")

    assert client.options.headers["Authorization"] == "Bearer a-caller-token"
    # A per-request client must not keep or refresh a session: the token arrived
    # with the request and dies with it.
    assert client.options.auto_refresh_token is False
    assert client.options.persist_session is False


def test_user_clients_are_never_shared_between_callers(monkeypatch: pytest.MonkeyPatch) -> None:
    """Cache this and two concurrent requests swap identities."""
    monkeypatch.setattr("app.db.get_settings", _configured)

    first = user_client("token-one")
    second = user_client("token-two")

    assert first is not second
    assert first.options.headers["Authorization"] == "Bearer token-one"
    assert second.options.headers["Authorization"] == "Bearer token-two"


def test_unconfigured_user_client_yields_503(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.db.get_settings", _unconfigured)

    with pytest.raises(HTTPException) as exc_info:
        user_client("irrelevant")

    assert exc_info.value.status_code == 503


def test_unconfigured_database_yields_503_not_a_crash(monkeypatch: pytest.MonkeyPatch) -> None:
    """A teammate without credentials gets a clear 503, not a 500."""
    monkeypatch.setattr("app.db.get_settings", _unconfigured)

    with pytest.raises(HTTPException) as exc_info:
        get_db()

    assert exc_info.value.status_code == 503


def test_unconfigured_admin_database_yields_503(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.db.get_settings", _unconfigured)

    with pytest.raises(HTTPException) as exc_info:
        get_admin_db()

    assert exc_info.value.status_code == 503


def test_rls_denial_maps_to_403() -> None:
    with pytest.raises(HTTPException) as exc_info:  # noqa: PT012 -- context manager under test
        with postgrest_errors():
            raise APIError({"code": "42501", "message": "new row violates row-level security"})

    assert exc_info.value.status_code == 403


def test_other_postgrest_errors_map_to_400() -> None:
    with pytest.raises(HTTPException) as exc_info:  # noqa: PT012 -- context manager under test
        with postgrest_errors():
            raise APIError({"code": "23505", "message": "duplicate key value"})

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == "duplicate key value"


def test_health_reports_database_configuration(client: TestClient) -> None:
    body = client.get("/health").json()

    assert body["status"] == "ok"
    assert "database" in body
