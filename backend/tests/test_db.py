"""The connector's failure modes."""

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from postgrest.exceptions import APIError

from app.config import Settings
from app.db import get_admin_db, get_db, postgrest_errors


def _unconfigured() -> Settings:
    return Settings(supabase_url="", supabase_publishable_key="", supabase_secret_key="")


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
