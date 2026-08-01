"""Creating and deleting members.

Staff used to type a URL slug by hand, which asked a charity worker to know what
one is. The route derives it now, and most of what follows is about the ways a
derived slug can be wrong: already taken, or made from a name with no ASCII in
it at all.
"""

from typing import Any

import pytest
from postgrest.exceptions import APIError

from tests.conftest import AdminClient, FakeDb

_PARTICIPANT = "6f1e6a4e-6c8c-4a4a-9f0e-6d2a6b7c1d11"


class CollidingDb(FakeDb):
    """A database where the first `n` slugs a caller tries are already taken."""

    def __init__(self, collisions: int, **kwargs: Any) -> None:
        super().__init__({"participants": []}, **kwargs)
        self.remaining = collisions

    def table(self, name: str) -> Any:
        query = super().table(name)
        if name == "participants":
            original = query.execute

            def maybe_collide() -> Any:
                if query.operation == "insert" and self.remaining > 0:
                    self.remaining -= 1
                    raise APIError(
                        {
                            "code": "23505",
                            "message": "duplicate key value violates unique constraint "
                            '"participants_slug_key"',
                            "details": "Key (slug)=(maria-kowalski) already exists.",
                        }
                    )
                return original()

            query.execute = maybe_collide  # type: ignore[method-assign]
        return query


@pytest.fixture
def removals(monkeypatch: pytest.MonkeyPatch) -> list[str]:
    recorded: list[str] = []
    monkeypatch.setattr("app.storage.remove", lambda paths: recorded.extend(paths))
    return recorded


def _written_slug(db: FakeDb, attempt: int = 0) -> str:
    written = db.queries_for("participants")[attempt].written
    assert isinstance(written, dict)
    return str(written["slug"])


# --------------------------------------------------------------------------
# Slugs
# --------------------------------------------------------------------------


def test_the_slug_is_derived_from_the_name(admin_client: AdminClient) -> None:
    db = FakeDb({"participants": []})
    response = admin_client(db).post(
        "/api/admin/participants",
        json={"first_name": "María", "last_name": "Kowalski"},
    )

    assert response.status_code == 201
    assert _written_slug(db) == "maria-kowalski"


def test_a_name_with_no_ascii_letters_still_gets_a_valid_slug(
    admin_client: AdminClient,
) -> None:
    """A Hong Kong charity will enter names that transliterate to nothing.

    Refusing them would be the wrong answer; an opaque slug is the right one.
    """
    db = FakeDb({"participants": []})
    response = admin_client(db).post("/api/admin/participants", json={"first_name": "陳"})

    assert response.status_code == 201
    slug = _written_slug(db)
    assert slug.startswith("member-")
    assert len(slug) >= 2


def test_a_taken_slug_is_retried_with_a_suffix(admin_client: AdminClient) -> None:
    db = CollidingDb(collisions=1)
    response = admin_client(db).post(
        "/api/admin/participants",
        json={"first_name": "Maria", "last_name": "Kowalski"},
    )

    assert response.status_code == 201
    assert _written_slug(db, 0) == "maria-kowalski"
    assert _written_slug(db, 1) == "maria-kowalski-2"


def test_a_different_database_error_is_not_retried(admin_client: AdminClient) -> None:
    """The retry loop must not turn an unrelated failure into twenty inserts."""

    class ForeignKeyDb(FakeDb):
        def table(self, name: str) -> Any:
            query = super().table(name)
            if name == "participants":

                def refuse() -> Any:
                    raise APIError({"code": "23503", "message": "no such thing"})

                query.execute = refuse  # type: ignore[method-assign]
            return query

    db = ForeignKeyDb({"participants": []})
    response = admin_client(db).post("/api/admin/participants", json={"first_name": "Maria"})

    assert response.status_code == 400
    assert len(db.queries_for("participants")) == 1


def test_an_explicit_slug_is_used_as_given(admin_client: AdminClient) -> None:
    db = FakeDb({"participants": []})
    admin_client(db).post(
        "/api/admin/participants",
        json={"first_name": "Maria", "last_name": "Kowalski", "slug": "maria-k"},
    )

    assert _written_slug(db) == "maria-k"


# --------------------------------------------------------------------------
# The rest of the create payload
# --------------------------------------------------------------------------


def test_face_recognition_consent_can_be_set_at_creation(admin_client: AdminClient) -> None:
    """Otherwise the portrait uploaded on the same form cannot be enrolled."""
    db = FakeDb({"participants": []})
    admin_client(db).post(
        "/api/admin/participants",
        json={"first_name": "Maria", "consent_face_recognition": True},
    )

    written = db.queries_for("participants")[0].written
    assert isinstance(written, dict)
    assert written["consent_face_recognition"] is True


def test_progress_summary_is_neither_stored_nor_returned(admin_client: AdminClient) -> None:
    """The member form has two prose fields now: a short story and a long one."""
    db = FakeDb({"participants": []})
    response = admin_client(db).post(
        "/api/admin/participants",
        json={"first_name": "Maria", "progress_summary": "should be ignored"},
    )

    written = db.queries_for("participants")[0].written
    assert isinstance(written, dict)
    assert "progress_summary" not in written
    assert "progress_summary" not in response.json()


# --------------------------------------------------------------------------
# Deletion
# --------------------------------------------------------------------------


def test_deleting_a_member_removes_their_avatar_from_storage(
    admin_client: AdminClient, removals: list[str]
) -> None:
    """The row cascades; the file in the bucket has no foreign key to follow."""
    db = FakeDb(
        {"participants": [{"id": _PARTICIPANT, "avatar_path": "avatars/maria/portrait.jpg"}]}
    )
    response = admin_client(db).delete(f"/api/admin/participants/{_PARTICIPANT}")

    assert response.status_code == 204
    assert removals == ["avatars/maria/portrait.jpg"]


def test_deleting_a_member_without_an_avatar_touches_storage_never(
    admin_client: AdminClient, removals: list[str]
) -> None:
    db = FakeDb({"participants": [{"id": _PARTICIPANT, "avatar_path": None}]})

    assert admin_client(db).delete(f"/api/admin/participants/{_PARTICIPANT}").status_code == 204
    assert removals == []


def test_deleting_a_missing_member_is_a_404(admin_client: AdminClient, removals: list[str]) -> None:
    db = FakeDb({"participants": []})
    response = admin_client(db).delete(f"/api/admin/participants/{_PARTICIPANT}")

    assert response.status_code == 404
    assert removals == []
