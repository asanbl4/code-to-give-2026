"""The guard on the routes that write with the service role."""

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.admin_auth import require_admin
from app.config import Settings

_TOKEN = "correct-horse-battery-staple"


def _configured() -> Settings:
    return Settings(
        supabase_url="https://example.supabase.co",
        supabase_publishable_key="pk",
        supabase_secret_key="sk",
        admin_token=_TOKEN,
    )


def _no_token() -> Settings:
    return Settings(
        supabase_url="https://example.supabase.co",
        supabase_publishable_key="pk",
        supabase_secret_key="sk",
        admin_token="",
    )


def test_correct_token_is_accepted(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.admin_auth.get_settings", _configured)

    assert require_admin(_TOKEN) is None


def test_wrong_token_is_401(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.admin_auth.get_settings", _configured)

    with pytest.raises(HTTPException) as exc_info:
        require_admin("wrong")

    assert exc_info.value.status_code == 401


def test_missing_token_is_401(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.admin_auth.get_settings", _configured)

    with pytest.raises(HTTPException) as exc_info:
        require_admin(None)

    assert exc_info.value.status_code == 401


def test_unset_token_refuses_rather_than_defaulting_open(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The failure mode that would matter: no ADMIN_TOKEN must never mean 'allow'."""
    monkeypatch.setattr("app.admin_auth.get_settings", _no_token)

    with pytest.raises(HTTPException) as exc_info:
        require_admin(None)

    assert exc_info.value.status_code == 503


def test_admin_routes_are_guarded_end_to_end(client: TestClient) -> None:
    """No token in the request, so this must not reach the database."""
    response = client.get("/api/admin/participants")

    assert response.status_code in (401, 503)
