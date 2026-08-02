"""API shapes for the volunteer onboarding workflow."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator

AgeGroup = Literal["14-15", "16-17", "18-plus"]
VolunteerRole = Literal["assistant", "coach"]
VolunteerInterest = Literal["sports", "creative", "family", "nutrition", "general"]
ApplicationStatus = Literal[
    "submitted",
    "under_review",
    "account_pending",
    "onboarding",
    "assistant_approved",
    "coach_assessment",
    "trial_pending",
    "coach_approved",
    "rejected",
    "withdrawn",
]
ReceiptStatus = Literal["queued", "sent", "failed"]
DocumentStatus = Literal["not_required", "pending", "verified", "rejected"]
TrialStatus = Literal["not_required", "pending", "passed", "not_suitable"]


class VolunteerApplicationCreate(BaseModel):
    session_id: Literal["football-friends", "creative-club", "family-wellbeing"]
    full_name: str = Field(min_length=2, max_length=160)
    email: str = Field(min_length=3, max_length=320)
    phone: str = Field(min_length=5, max_length=40)
    age_group: AgeGroup
    volunteer_role: VolunteerRole
    interest: VolunteerInterest
    note: str = Field(default="", max_length=2000)
    process_acknowledged: Literal[True]

    @field_validator("full_name", "phone")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        return value.strip()

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized.count("@") != 1 or normalized.startswith("@") or normalized.endswith("@"):
            raise ValueError("Enter a valid email address")
        return normalized

    @field_validator("note")
    @classmethod
    def strip_note(cls, value: str) -> str:
        return value.strip()

    @model_validator(mode="after")
    def validate_age_rules(self) -> "VolunteerApplicationCreate":
        if self.age_group == "14-15" and self.volunteer_role != "assistant":
            raise ValueError("Volunteers aged 14-15 can only apply as assistants")
        if self.age_group == "14-15" and self.session_id == "football-friends":
            raise ValueError("Volunteers aged 14-15 can only join Art or Family Team activities")
        return self


class VolunteerApplicationReceipt(BaseModel):
    application_id: UUID
    reference: str
    session_id: str
    submitted_at: datetime
    age_group: AgeGroup
    volunteer_role: VolunteerRole
    receipt_status: ReceiptStatus


class VolunteerApplicationAdmin(VolunteerApplicationReceipt):
    full_name: str
    email: str
    phone: str
    interest: VolunteerInterest
    note: str
    process_acknowledged: bool
    status: ApplicationStatus
    terms_acknowledged: bool
    scrc_status: DocumentStatus
    identity_verified: bool
    guardian_documents_verified: bool
    trial_status: TrialStatus
    staff_notes: str
    auth_user_id: UUID | None = None
    reviewed_at: datetime | None = None
    account_invited_at: datetime | None = None
    approved_at: datetime | None = None
    updated_at: datetime


class VolunteerApplicationPatch(BaseModel):
    status: ApplicationStatus | None = None
    receipt_status: ReceiptStatus | None = None
    terms_acknowledged: bool | None = None
    scrc_status: DocumentStatus | None = None
    identity_verified: bool | None = None
    guardian_documents_verified: bool | None = None
    trial_status: TrialStatus | None = None
    staff_notes: str | None = Field(default=None, max_length=5000)
    auth_user_id: UUID | None = None
    mark_account_invited: bool | None = None
