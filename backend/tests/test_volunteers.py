from types import SimpleNamespace
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.auth import AuthenticatedUser, get_current_user, get_verifier
from app.main import app
from app.routers.volunteers import get_volunteer_db
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


@pytest.fixture
def volunteer_client(fake_db: FakeDb):
    user = AuthenticatedUser(
        id="44444444-4444-4444-8444-444444444444",
        email="alex.volunteer@example.com",
        token="volunteer-token",
    )
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_volunteer_db] = lambda: fake_db
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_volunteer_db, None)


def test_application_requires_password_account(client: TestClient) -> None:
    app.dependency_overrides[get_verifier] = lambda: object()
    try:
        response = client.post("/api/volunteers/applications", json=application_payload())
    finally:
        app.dependency_overrides.pop(get_verifier, None)

    assert response.status_code == 401


def test_authenticated_application_is_normalized_and_linked(
    volunteer_client: TestClient, fake_db: FakeDb
) -> None:
    response = volunteer_client.post("/api/volunteers/applications", json=application_payload())

    assert response.status_code == 201
    body = response.json()
    assert body["reference"].startswith("VOL-")
    assert body["receipt_status"] == "queued"

    query = fake_db.queries_for("volunteer_applications")[0]
    assert query.operation == "insert"
    assert isinstance(query.written, dict)
    assert query.written["email"] == "alex.volunteer@example.com"
    assert query.written["auth_user_id"] == "44444444-4444-4444-8444-444444444444"
    assert query.written["scrc_status"] == "pending"
    assert "status" not in query.written


def test_application_email_must_match_account(volunteer_client: TestClient) -> None:
    response = volunteer_client.post(
        "/api/volunteers/applications",
        json=application_payload(email="someone.else@example.com"),
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "Application email must match the signed-in portal account"


def test_age_14_15_cannot_apply_as_coach(volunteer_client: TestClient) -> None:
    response = volunteer_client.post(
        "/api/volunteers/applications",
        json=application_payload(
            session_id="creative-club", age_group="14-15", volunteer_role="coach"
        ),
    )

    assert response.status_code == 422


def test_age_14_15_cannot_apply_for_sports(volunteer_client: TestClient) -> None:
    response = volunteer_client.post(
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


def test_volunteer_portal_requires_authentication(client: TestClient) -> None:
    app.dependency_overrides[get_verifier] = lambda: object()
    try:
        response = client.get("/api/volunteers/me/applications")
        assert response.status_code == 401
    finally:
        app.dependency_overrides.pop(get_verifier, None)


def test_volunteer_can_read_rls_scoped_application() -> None:
    db = FakeDb({"volunteer_applications": [application_row(auth_user_id="user-1")]})
    app.dependency_overrides[get_volunteer_db] = lambda: db
    try:
        with TestClient(app) as client:
            response = client.get("/api/volunteers/me/applications")
    finally:
        app.dependency_overrides.pop(get_volunteer_db, None)

    assert response.status_code == 200
    assert response.json()[0]["reference"] == "VOL-33333333"
    assert "staff_notes" not in response.json()[0]


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


def test_staff_cannot_link_missing_password_account(admin_client: AdminClient) -> None:
    auth_admin = SimpleNamespace(list_users=lambda page, per_page: [])
    db = FakeDb({"volunteer_applications": [application_row(status="under_review")]})
    db.auth = SimpleNamespace(admin=auth_admin)

    with admin_client(db) as client:
        response = client.post(f"/api/admin/volunteers/applications/{APPLICATION_ID}/link")

    assert response.status_code == 409
    assert response.json()["detail"] == (
        "No password account exists for this email. "
        "Ask the volunteer to create one from the application form."
    )


def test_staff_links_existing_password_account_without_email(
    admin_client: AdminClient,
) -> None:
    existing_user = SimpleNamespace(
        id="55555555-5555-4555-8555-555555555555",
        email="alex.volunteer@example.com",
    )
    auth_admin = SimpleNamespace(list_users=lambda page, per_page: [existing_user])
    db = FakeDb({"volunteer_applications": [application_row(status="account_pending")]})
    db.auth = SimpleNamespace(admin=auth_admin)

    with admin_client(db) as client:
        response = client.post(f"/api/admin/volunteers/applications/{APPLICATION_ID}/link")

    assert response.status_code == 200
    assert response.json()["delivery"] == "linked"
    assert response.json()["application"]["auth_user_id"] == existing_user.id
