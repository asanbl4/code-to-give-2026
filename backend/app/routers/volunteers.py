"""Public volunteer intake and the authenticated staff workflow."""

from datetime import UTC, datetime
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import require_staff
from app.db import AdminDb, Db, postgrest_errors
from app.schemas.volunteer import (
    VolunteerApplicationAdmin,
    VolunteerApplicationCreate,
    VolunteerApplicationPatch,
    VolunteerApplicationReceipt,
)

router = APIRouter(prefix="/api/volunteers", tags=["volunteers"])
admin_router = APIRouter(
    prefix="/api/admin/volunteers",
    tags=["admin", "volunteers"],
    dependencies=[Depends(require_staff)],
)

_COLUMNS = (
    "id, reference, session_id, full_name, email, phone, age_group, volunteer_role, "
    "interest, note, process_acknowledged, status, receipt_status, terms_acknowledged, "
    "scrc_status, identity_verified, guardian_documents_verified, trial_status, "
    "staff_notes, auth_user_id, reviewed_at, account_invited_at, approved_at, "
    "created_at, updated_at"
)

_TRANSITIONS: dict[str, frozenset[str]] = {
    "submitted": frozenset({"under_review", "withdrawn"}),
    "under_review": frozenset({"account_pending", "coach_assessment", "rejected", "withdrawn"}),
    "account_pending": frozenset({"onboarding", "rejected", "withdrawn"}),
    "onboarding": frozenset({"assistant_approved", "coach_assessment", "rejected", "withdrawn"}),
    "coach_assessment": frozenset({"trial_pending", "assistant_approved", "rejected", "withdrawn"}),
    "trial_pending": frozenset({"coach_approved", "assistant_approved", "rejected", "withdrawn"}),
    "assistant_approved": frozenset({"withdrawn"}),
    "coach_approved": frozenset({"withdrawn"}),
    "rejected": frozenset({"under_review"}),
    "withdrawn": frozenset({"under_review"}),
}


def _admin_shape(row: dict) -> dict:
    return {
        **row,
        "application_id": row["id"],
        "submitted_at": row["created_at"],
    }


@router.post(
    "/applications",
    response_model=VolunteerApplicationReceipt,
    status_code=status.HTTP_201_CREATED,
)
def create_application(payload: VolunteerApplicationCreate, db: Db) -> dict:
    application_id = uuid4()
    submitted_at = datetime.now(UTC)
    reference = f"VOL-{application_id.hex[:8].upper()}"
    row = {
        "id": str(application_id),
        "reference": reference,
        **payload.model_dump(),
        "scrc_status": "pending" if payload.age_group == "18-plus" else "not_required",
    }

    # No SELECT policy exists for anonymous callers. returning=minimal prevents
    # PostgREST from trying to read the private row back after inserting it.
    with postgrest_errors():
        db.table("volunteer_applications").insert(row, returning="minimal").execute()

    return {
        "application_id": application_id,
        "reference": reference,
        "session_id": payload.session_id,
        "submitted_at": submitted_at,
        "age_group": payload.age_group,
        "volunteer_role": payload.volunteer_role,
        "receipt_status": "queued",
    }


@admin_router.get("/applications", response_model=list[VolunteerApplicationAdmin])
def list_applications(db: AdminDb) -> list[dict]:
    with postgrest_errors():
        rows = (
            db.table("volunteer_applications")
            .select(_COLUMNS)
            .order("created_at", desc=True)
            .execute()
            .data
        )
    return [_admin_shape(row) for row in rows]


@admin_router.patch("/applications/{application_id}", response_model=VolunteerApplicationAdmin)
def update_application(
    application_id: UUID, payload: VolunteerApplicationPatch, db: AdminDb
) -> dict:
    with postgrest_errors():
        existing = (
            db.table("volunteer_applications")
            .select(_COLUMNS)
            .eq("id", str(application_id))
            .limit(1)
            .execute()
            .data
        )
    if not existing:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Volunteer application not found")

    current = existing[0]
    changes = payload.model_dump(exclude_unset=True)
    mark_account_invited = changes.pop("mark_account_invited", False)
    next_status = changes.get("status")
    if next_status and next_status != current["status"]:
        allowed = _TRANSITIONS.get(current["status"], frozenset())
        if next_status not in allowed:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                f"Cannot move application from {current['status']} to {next_status}",
            )

    if (
        changes.get("scrc_status") not in (None, "not_required")
        and current["age_group"] != "18-plus"
    ):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "SCRC is not required under 18")

    now = datetime.now(UTC).isoformat()
    if next_status == "under_review" and not current.get("reviewed_at"):
        changes["reviewed_at"] = now
    if next_status in {"assistant_approved", "coach_approved"}:
        changes["approved_at"] = now
    if mark_account_invited:
        changes["account_invited_at"] = now
    changes["updated_at"] = now

    with postgrest_errors():
        updated = (
            db.table("volunteer_applications")
            .update(changes)
            .eq("id", str(application_id))
            .execute()
            .data
        )
    if not updated:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Volunteer application not found")
    return _admin_shape(updated[0])
