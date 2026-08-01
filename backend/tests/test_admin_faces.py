"""Face tagging as a state machine.

The route used to write whatever columns it was handed. Two ordinary actions --
naming someone else in a box that was already confirmed, and clearing the name
on one -- then landed on a database constraint, and a charity worker read
"duplicate key value violates unique constraint" with no idea what they had done.

Each test below is one of those paths. The constraints still exist; nothing here
should be able to reach them.
"""

from typing import Any

from tests.conftest import AdminClient, FakeDb

_PHOTO = "11111111-1111-4111-8111-111111111111"
_MARIA = "6f1e6a4e-6c8c-4a4a-9f0e-6d2a6b7c1d11"
_TOMAS = "9a2b3c4d-5e6f-4071-8293-a4b5c6d7e8f9"
_FACE_ONE = "22222222-2222-4222-8222-222222222222"
_FACE_TWO = "33333333-3333-4333-8333-333333333333"

_PEOPLE = [
    {"id": _MARIA, "first_name": "Maria", "last_name": "Kowalski", "display_name": "Maria K."},
    {"id": _TOMAS, "first_name": "Tomas", "last_name": None, "display_name": None},
]


def _face(face_id: str, *, participant: str | None, status: str) -> dict[str, Any]:
    return {
        "id": face_id,
        "photo_id": _PHOTO,
        "participant_id": participant,
        "box_x": 0.1,
        "box_y": 0.2,
        "box_w": 0.09,
        "box_h": 0.16,
        "match_score": 0.82,
        "status": status,
        "confirmed_by": None,
        "confirmed_at": "2026-07-01T00:00:00Z" if status == "confirmed" else None,
    }


def _db(*faces: dict[str, Any]) -> FakeDb:
    return FakeDb({"photo_faces": list(faces), "participants": _PEOPLE})


def _written(db: FakeDb) -> dict[str, Any]:
    updates = [q for q in db.queries_for("photo_faces") if q.operation == "update"]
    assert updates, "expected the route to write something"
    written = updates[-1].written
    assert isinstance(written, dict)
    return written


def _wrote_nothing(db: FakeDb) -> bool:
    return not any(q.operation in ("update", "insert") for q in db.queries_for("photo_faces"))


# --------------------------------------------------------------------------
# Reassignment
# --------------------------------------------------------------------------


def test_reassigning_a_confirmed_face_demotes_it_to_suggested(
    admin_client: AdminClient,
) -> None:
    """A human confirmed *that person*, not that rectangle."""
    db = _db(_face(_FACE_ONE, participant=_MARIA, status="confirmed"))
    response = admin_client(db).patch(
        f"/api/admin/faces/{_FACE_ONE}", json={"participant_id": _TOMAS}
    )

    assert response.status_code == 200
    written = _written(db)
    assert written["status"] == "suggested"
    assert written["confirmed_at"] is None


def test_clearing_the_person_on_a_confirmed_face_demotes_it(
    admin_client: AdminClient,
) -> None:
    """Otherwise `photo_faces_confirmed_needs_participant` refuses the row."""
    db = _db(_face(_FACE_ONE, participant=_MARIA, status="confirmed"))
    response = admin_client(db).patch(
        f"/api/admin/faces/{_FACE_ONE}", json={"participant_id": None}
    )

    assert response.status_code == 200
    written = _written(db)
    assert written["participant_id"] is None
    assert written["status"] == "suggested"


def test_naming_the_same_person_again_leaves_the_confirmation_alone(
    admin_client: AdminClient,
) -> None:
    """Re-sending the current value is not a reassignment and must not demote."""
    db = _db(_face(_FACE_ONE, participant=_MARIA, status="confirmed"))
    admin_client(db).patch(f"/api/admin/faces/{_FACE_ONE}", json={"participant_id": _MARIA})

    assert _written(db)["status"] == "confirmed"


# --------------------------------------------------------------------------
# Confirmation
# --------------------------------------------------------------------------


def test_confirming_someone_already_confirmed_here_is_a_conflict(
    admin_client: AdminClient,
) -> None:
    db = _db(
        _face(_FACE_ONE, participant=_MARIA, status="confirmed"),
        _face(_FACE_TWO, participant=_MARIA, status="suggested"),
    )
    response = admin_client(db).patch(f"/api/admin/faces/{_FACE_TWO}", json={"status": "confirmed"})

    assert response.status_code == 409
    assert "Maria K." in response.json()["detail"]
    assert _wrote_nothing(db), "a refused confirmation must not touch the row"


def test_reconfirming_the_same_face_is_not_a_conflict(admin_client: AdminClient) -> None:
    """The clash check has to exclude the box being confirmed from its own count."""
    db = _db(_face(_FACE_ONE, participant=_MARIA, status="confirmed"))
    response = admin_client(db).patch(f"/api/admin/faces/{_FACE_ONE}", json={"status": "confirmed"})

    assert response.status_code == 200
    assert _written(db)["status"] == "confirmed"


def test_confirming_with_nobody_chosen_is_refused(admin_client: AdminClient) -> None:
    db = _db(_face(_FACE_ONE, participant=None, status="suggested"))
    response = admin_client(db).patch(f"/api/admin/faces/{_FACE_ONE}", json={"status": "confirmed"})

    assert response.status_code == 422
    assert response.json()["detail"] == "Choose who this is before confirming."
    assert _wrote_nothing(db)


def test_confirming_stamps_the_time(admin_client: AdminClient) -> None:
    db = _db(_face(_FACE_ONE, participant=_MARIA, status="suggested"))
    admin_client(db).patch(f"/api/admin/faces/{_FACE_ONE}", json={"status": "confirmed"})

    assert _written(db)["confirmed_at"] is not None


# --------------------------------------------------------------------------
# Rejection, and undoing it
# --------------------------------------------------------------------------


def test_rejecting_clears_the_confirmation(admin_client: AdminClient) -> None:
    db = _db(_face(_FACE_ONE, participant=_MARIA, status="confirmed"))
    admin_client(db).patch(f"/api/admin/faces/{_FACE_ONE}", json={"status": "rejected"})

    written = _written(db)
    assert written["status"] == "rejected"
    assert written["confirmed_at"] is None
    assert written["confirmed_by"] is None


def test_undoing_a_rejection_returns_it_to_suggested(admin_client: AdminClient) -> None:
    """There was no way back from "Not a member" at all; that was the bug."""
    db = _db(_face(_FACE_ONE, participant=None, status="rejected"))
    response = admin_client(db).patch(f"/api/admin/faces/{_FACE_ONE}", json={"status": "suggested"})

    assert response.status_code == 200
    assert _written(db)["status"] == "suggested"


# --------------------------------------------------------------------------
# Deletion
# --------------------------------------------------------------------------


def test_deleting_a_face_removes_only_that_row(admin_client: AdminClient) -> None:
    db = _db(
        _face(_FACE_ONE, participant=_MARIA, status="confirmed"),
        _face(_FACE_TWO, participant=None, status="suggested"),
    )
    response = admin_client(db).delete(f"/api/admin/faces/{_FACE_TWO}")

    assert response.status_code == 204
    deletes = [q for q in db.queries_for("photo_faces") if q.operation == "delete"]
    assert deletes[-1].filters == [("id", _FACE_TWO)]


def test_deleting_a_missing_face_is_a_404(admin_client: AdminClient) -> None:
    db = _db()
    assert admin_client(db).delete(f"/api/admin/faces/{_FACE_ONE}").status_code == 404


def test_updating_a_missing_face_is_a_404(admin_client: AdminClient) -> None:
    db = _db()
    response = admin_client(db).patch(f"/api/admin/faces/{_FACE_ONE}", json={"status": "rejected"})

    assert response.status_code == 404
    assert _wrote_nothing(db)
