"""Enrolment ordering.

The database refuses a face signature for anyone who has not consented to face
recognition. The route must reach that refusal *before* the portrait is written
to storage, or a refused enrolment leaves a photograph of an unconsenting person
sitting in the bucket. That happened once; these tests keep it fixed.
"""

from typing import Any

import pytest
from postgrest.exceptions import APIError

from app.faces import DetectedFace
from tests.conftest import AdminClient, FakeDb

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


@pytest.fixture
def removals(monkeypatch: pytest.MonkeyPatch) -> list[str]:
    """Record every storage deletion instead of performing one."""
    recorded: list[str] = []
    monkeypatch.setattr("app.storage.remove", lambda paths: recorded.extend(paths))
    return recorded


def _enroll(client: Any) -> Any:
    return client.post(
        f"/api/admin/participants/{_PARTICIPANT}/enroll",
        files={"file": ("portrait.jpg", b"not-a-real-jpeg", "image/jpeg")},
    )


def test_refused_enrolment_uploads_nothing(admin_client: AdminClient, uploads: list[str]) -> None:
    db = RefusingDb({"participants": [], "participant_face_signatures": []})
    response = _enroll(admin_client(db))

    assert response.status_code == 400
    assert uploads == [], "a refused enrolment must not leave their photo in the bucket"


def test_accepted_enrolment_uploads_the_avatar(
    admin_client: AdminClient, uploads: list[str]
) -> None:
    db = FakeDb({"participants": [], "participant_face_signatures": []})
    response = _enroll(admin_client(db))

    assert response.status_code == 200
    assert response.json()["enrolled"] is True
    assert len(uploads) == 1
    assert uploads[0].startswith(f"avatars/{_PARTICIPANT}/")


def test_embedding_is_sent_as_pgvector_text(admin_client: AdminClient, uploads: list[str]) -> None:
    """pgvector parses '[0.1,0.2]'; a bare JSON array is ambiguous over the wire."""
    db = FakeDb({"participants": [], "participant_face_signatures": []})
    _enroll(admin_client(db))

    written = db.queries_for("participant_face_signatures")[0].written
    assert isinstance(written, dict)
    assert isinstance(written["embedding"], str)
    assert written["embedding"].startswith("[") and written["embedding"].endswith("]")


def test_replacing_a_portrait_removes_the_previous_file(
    admin_client: AdminClient, uploads: list[str], removals: list[str]
) -> None:
    """Every enrolment mints a fresh path, so the old one has to be swept up.

    Nothing in the database points at it afterwards, and it is a photograph of a
    real person sitting in a bucket nobody is auditing.
    """
    db = FakeDb(
        {
            "participants": [{"id": _PARTICIPANT, "avatar_path": "avatars/old/portrait.jpg"}],
            "participant_face_signatures": [],
        }
    )
    response = _enroll(admin_client(db))

    assert response.status_code == 200
    assert removals == ["avatars/old/portrait.jpg"]
    assert uploads[0] not in removals, "the portrait just uploaded must survive"


def test_a_first_portrait_removes_nothing(
    admin_client: AdminClient, uploads: list[str], removals: list[str]
) -> None:
    db = FakeDb(
        {
            "participants": [{"id": _PARTICIPANT, "avatar_path": None}],
            "participant_face_signatures": [],
        }
    )
    assert _enroll(admin_client(db)).status_code == 200
    assert removals == []
