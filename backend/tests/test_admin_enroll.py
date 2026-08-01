"""Enrolment ordering.

The database refuses a face signature for anyone who has not consented to face
recognition. The route must reach that refusal *before* the portrait is written
to storage, or a refused enrolment leaves a photograph of an unconsenting person
sitting in the bucket. That happened once; these tests keep it fixed.
"""

from typing import Any

import pytest
from fastapi.testclient import TestClient
from postgrest.exceptions import APIError

from app.auth import require_staff
from app.db import get_admin_db
from app.faces import DetectedFace
from app.main import app
from tests.conftest import FakeDb

_PARTICIPANT = "6f1e6a4e-6c8c-4a4a-9f0e-6d2a6b7c1d11"
_ONE_FACE = [
    DetectedFace(box_x=0.1, box_y=0.1, box_w=0.2, box_h=0.3, confidence=0.99, embedding=[0.1] * 128)
]


class RefusingDb(FakeDb):
    """Stands in for the consent trigger rejecting the insert."""

    def table(self, name: str) -> Any:
        query = super().table(name)
        if name == "participant_face_signatures":
            original = query.execute

            def refuse() -> Any:
                if query.operation == "insert":
                    raise APIError({"code": "23514", "message": "has not consented"})
                return original()

            query.execute = refuse  # type: ignore[method-assign]
        return query


@pytest.fixture
def uploads(monkeypatch: pytest.MonkeyPatch) -> list[str]:
    """Record every storage write instead of performing one."""
    recorded: list[str] = []
    monkeypatch.setattr("app.storage.upload", lambda path, data, ct: recorded.append(path))
    monkeypatch.setattr("app.routers.admin.face_service.detect", lambda image: _ONE_FACE)
    return recorded


def _client(db: FakeDb) -> TestClient:
    app.dependency_overrides[get_admin_db] = lambda: db
    app.dependency_overrides[require_staff] = lambda: None
    return TestClient(app)


def test_refused_enrolment_uploads_nothing(uploads: list[str]) -> None:
    db = RefusingDb({"participants": [], "participant_face_signatures": []})
    try:
        response = _client(db).post(
            f"/api/admin/participants/{_PARTICIPANT}/enroll",
            files={"file": ("portrait.jpg", b"not-a-real-jpeg", "image/jpeg")},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 400
    assert uploads == [], "a refused enrolment must not leave their photo in the bucket"


def test_accepted_enrolment_uploads_the_avatar(uploads: list[str]) -> None:
    db = FakeDb({"participants": [], "participant_face_signatures": []})
    try:
        response = _client(db).post(
            f"/api/admin/participants/{_PARTICIPANT}/enroll",
            files={"file": ("portrait.jpg", b"not-a-real-jpeg", "image/jpeg")},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["enrolled"] is True
    assert len(uploads) == 1
    assert uploads[0].startswith(f"avatars/{_PARTICIPANT}/")


def test_embedding_is_sent_as_pgvector_text(uploads: list[str]) -> None:
    """pgvector parses '[0.1,0.2]'; a bare JSON array is ambiguous over the wire."""
    db = FakeDb({"participants": [], "participant_face_signatures": []})
    try:
        _client(db).post(
            f"/api/admin/participants/{_PARTICIPANT}/enroll",
            files={"file": ("portrait.jpg", b"not-a-real-jpeg", "image/jpeg")},
        )
    finally:
        app.dependency_overrides.clear()

    written = db.queries_for("participant_face_signatures")[0].written
    assert isinstance(written, dict)
    assert isinstance(written["embedding"], str)
    assert written["embedding"].startswith("[") and written["embedding"].endswith("]")
