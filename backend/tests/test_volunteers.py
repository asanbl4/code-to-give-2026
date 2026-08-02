from typing import Any

from fastapi.testclient import TestClient

from app.auth import get_verifier
from app.main import app
from tests.conftest import AdminClient, FakeDb

APPLICATION_ID = "33333333-3333-4333-8333-333333333333"


def application_payload(**overrides: Any) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "session_id": "football-friends",
        "full_name": "Alex Volunteer",
        "email": "Alex.Volunteer@example.com",
        "phone": "61234567",
        "age_group": "18-plus",
        "volunteer_role": "assistant",
        "interest": "sports",
        "note": "First aid training",
        "process_acknowledged": True,
    }
    payload.update(overrides)
    return payload


def application_row(**overrides: Any) -> dict[str, Any]:
    row: dict[str, Any] = {
        "id": APPLICATION_ID,
        "reference": "VOL-33333333",
        "session_id": "football-friends",
        "full_name": "Alex Volunteer",
        "email": "alex.volunteer@example.com",
        "phone": "61234567",
        "age_group": "18-plus",
        "volunteer_role": "assistant",
        "interest": "sports",
        "note": "First aid training",
        "process_acknowledged": True,
        "status": "submitted",
        "receipt_status": "queued",
        "terms_acknowledged": False,
        "scrc_status": "pending",
        "identity_verified": False,
        "guardian_documents_verified": False,
        "trial_status": "not_required",
        "staff_notes": "",
        "auth_user_id": None,
        "reviewed_at": None,
        "account_invited_at": None,
        "approved_at": None,
        "created_at": "2026-08-02T08:00:00Z",
        "updated_at": "2026-08-02T08:00:00Z",
    }
    row.update(overrides)
    return row


def test_public_application_is_normalized_and_inserted(client: TestClient, fake_db: FakeDb) -> None:
    response = client.post("/api/volunteers/applications", json=application_payload())

    assert response.status_code == 201
    body = response.json()
    assert body["reference"].startswith("VOL-")
    assert body["receipt_status"] == "queued"

    query = fake_db.queries_for("volunteer_applications")[0]
    assert query.operation == "insert"
    assert isinstance(query.written, dict)
    assert query.written["email"] == "alex.volunteer@example.com"
    assert query.written["scrc_status"] == "pending"
    assert "status" not in query.written


def test_age_14_15_cannot_apply_as_coach(client: TestClient) -> None:
    response = client.post(
        "/api/volunteers/applications",
        json=application_payload(
            session_id="creative-club", age_group="14-15", volunteer_role="coach"
        ),
    )

    assert response.status_code == 422


def test_age_14_15_cannot_apply_for_sports(client: TestClient) -> None:
    response = client.post(
        "/api/volunteers/applications",
        json=application_payload(age_group="14-15", volunteer_role="assistant"),
    )

    assert response.status_code == 422


def test_admin_routes_require_authentication(client: TestClient) -> None:
    app.dependency_overrides[get_verifier] = lambda: object()
    try:
        response = client.get("/api/admin/volunteers/applications")
        assert response.status_code == 401
    finally:
        app.dependency_overrides.pop(get_verifier, None)


def test_staff_can_list_applications(admin_client: AdminClient) -> None:
    db = FakeDb({"volunteer_applications": [application_row()]})

    with admin_client(db) as client:
        response = client.get("/api/admin/volunteers/applications")

    assert response.status_code == 200
    assert response.json()[0]["application_id"] == APPLICATION_ID
    assert response.json()[0]["full_name"] == "Alex Volunteer"


def test_staff_can_start_review(admin_client: AdminClient) -> None:
    db = FakeDb({"volunteer_applications": [application_row()]})

    with admin_client(db) as client:
        response = client.patch(
            f"/api/admin/volunteers/applications/{APPLICATION_ID}",
            json={"status": "under_review", "receipt_status": "sent"},
        )

    assert response.status_code == 200
    assert response.json()["status"] == "under_review"
    assert response.json()["reviewed_at"] is not None


def test_staff_cannot_skip_required_workflow_steps(admin_client: AdminClient) -> None:
    db = FakeDb({"volunteer_applications": [application_row()]})

    with admin_client(db) as client:
        response = client.patch(
            f"/api/admin/volunteers/applications/{APPLICATION_ID}",
            json={"status": "coach_approved"},
        )

    assert response.status_code == 409
    assert response.json()["detail"] == "Cannot move application from submitted to coach_approved"
