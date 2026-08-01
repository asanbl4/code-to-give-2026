"""Staff tooling. Everything here writes with the service role, so everything
here is behind `require_admin`.

The shape of the workflow matters more than any single endpoint: a photo is
uploaded, faces are detected, each is *suggested* against an enrolled
participant, and nothing becomes visible until a human confirms it. The
recognition model proposes; a person decides. That is what makes it safe to
point at photographs of vulnerable people.
"""

import json
from datetime import UTC, datetime
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel, Field

from app import faces as face_service
from app import storage
from app.admin_auth import require_admin
from app.config import get_settings
from app.db import AdminDb, postgrest_errors
from app.schemas.participant import Participant
from app.schemas.photo import AdminPhoto

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_admin)])

_PARTICIPANT_COLUMNS = (
    "id, slug, first_name, last_name, display_name, avatar_url, avatar_path, "
    "headline, progress_summary, story, joined_on, sort_order, "
    "consent_given, consented_at, consent_face_recognition, "
    "consent_form_reference, consent_recorded_by, is_published, created_at"
)
_PHOTO_COLUMNS = (
    "id, storage_path, width, height, alt_text, caption, taken_on, sort_order, is_published"
)
_FACE_COLUMNS = (
    "id, photo_id, participant_id, box_x, box_y, box_w, box_h, match_score, status, confirmed_by"
)
_MAX_UPLOAD_BYTES = 15 * 1024 * 1024


class AdminParticipant(Participant):
    """Everything about a participant, including the consent bookkeeping."""

    avatar_path: str | None = None
    consent_given: bool = False
    consented_at: datetime | None = None
    consent_face_recognition: bool = False
    consent_form_reference: str | None = None
    consent_recorded_by: str | None = None
    is_published: bool = False
    enrolled_faces: int = 0


class ParticipantWrite(BaseModel):
    slug: str = Field(pattern=r"^[a-z0-9]+(-[a-z0-9]+)*$", min_length=2, max_length=80)
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str | None = Field(default=None, max_length=80)
    display_name: str | None = Field(default=None, max_length=160)
    headline: str | None = Field(default=None, max_length=200)
    progress_summary: str | None = Field(default=None, max_length=500)
    story: str | None = Field(default=None, max_length=20000)
    avatar_url: str | None = Field(default=None, max_length=2048)
    sort_order: int = 0


class ParticipantPatch(BaseModel):
    """All optional: the admin page sends only what changed.

    Consent lives here rather than on the create form on purpose. The charity
    already holds signed paper media-release forms; `consent_form_reference` and
    `consent_recorded_by` record *which* form and *who* checked it, so the
    database carries an attestation rather than an anonymous tick.
    """

    first_name: str | None = Field(default=None, min_length=1, max_length=80)
    last_name: str | None = Field(default=None, max_length=80)
    display_name: str | None = Field(default=None, max_length=160)
    headline: str | None = Field(default=None, max_length=200)
    progress_summary: str | None = Field(default=None, max_length=500)
    story: str | None = Field(default=None, max_length=20000)
    sort_order: int | None = None
    consent_given: bool | None = None
    consent_face_recognition: bool | None = None
    consent_form_reference: str | None = Field(default=None, max_length=200)
    consent_recorded_by: str | None = Field(default=None, max_length=120)
    is_published: bool | None = None


class PhotoPatch(BaseModel):
    alt_text: str | None = Field(default=None, min_length=1, max_length=500)
    caption: str | None = Field(default=None, max_length=1000)
    sort_order: int | None = None
    is_published: bool | None = None


class FacePatch(BaseModel):
    """Confirm, reject, or reassign a suggested tag."""

    status: str | None = Field(default=None, pattern="^(suggested|confirmed|rejected)$")
    participant_id: UUID | None = None
    confirmed_by: str | None = Field(default=None, max_length=120)


class ManualFace(BaseModel):
    """A box drawn by hand, for the path where detection found nothing."""

    participant_id: UUID
    box_x: float = Field(ge=0, le=1)
    box_y: float = Field(ge=0, le=1)
    box_w: float = Field(gt=0, le=1)
    box_h: float = Field(gt=0, le=1)
    confirmed_by: str | None = Field(default=None, max_length=120)


# --------------------------------------------------------------------------
# Participants
# --------------------------------------------------------------------------


@router.get("/participants", response_model=list[AdminParticipant])
def list_all_participants(db: AdminDb) -> list[dict]:
    """Every participant, published or not. The service role sees past RLS."""
    with postgrest_errors():
        participants = (
            db.table("participants").select(_PARTICIPANT_COLUMNS).order("sort_order").execute().data
        )
        # How many face signatures each has, so the tool can show who is
        # enrolled without ever returning an embedding.
        signatures = db.table("participant_face_signatures").select("participant_id").execute().data

    counts: dict[str, int] = {}
    for row in signatures:
        counts[row["participant_id"]] = counts.get(row["participant_id"], 0) + 1

    return [_with_avatar(p) | {"enrolled_faces": counts.get(p["id"], 0)} for p in participants]


@router.post("/participants", response_model=AdminParticipant, status_code=status.HTTP_201_CREATED)
def create_participant(payload: ParticipantWrite, db: AdminDb) -> dict:
    with postgrest_errors():
        result = db.table("participants").insert(payload.model_dump(exclude_none=True)).execute()
    return _with_avatar(result.data[0]) | {"enrolled_faces": 0}


@router.patch("/participants/{participant_id}", response_model=AdminParticipant)
def update_participant(participant_id: UUID, payload: ParticipantPatch, db: AdminDb) -> dict:
    changes: dict[str, Any] = payload.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields to update")

    # The database refuses consent without a timestamp, so stamp it here rather
    # than making every caller remember.
    if changes.get("consent_given") and "consented_at" not in changes:
        changes["consented_at"] = datetime.now(UTC).isoformat()
    if changes.get("consent_given") is False:
        # Withdrawing consent must also take the story off the page. The
        # publish-needs-consent constraint would reject the row otherwise.
        changes["is_published"] = False

    with postgrest_errors():
        result = db.table("participants").update(changes).eq("id", str(participant_id)).execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Participant not found")

    with postgrest_errors():
        signatures = (
            db.table("participant_face_signatures")
            .select("id")
            .eq("participant_id", str(participant_id))
            .execute()
            .data
        )
    return _with_avatar(result.data[0]) | {"enrolled_faces": len(signatures)}


@router.post("/participants/{participant_id}/enroll")
async def enroll_face(
    participant_id: UUID,
    db: AdminDb,
    file: Annotated[UploadFile, File()],
    set_as_avatar: Annotated[bool, Form()] = True,
) -> dict:
    """Teach the matcher one person, from a photo of just them.

    Requires `consent_face_recognition`. A database trigger enforces that too --
    consent to publish a story is not consent to be biometrically enrolled.
    """
    image = await _read_upload(file)
    detected = face_service.detect(image)

    if not detected:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "No face found in that photo. Use a clear, front-on portrait.",
        )
    if len(detected) > 1:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"Found {len(detected)} faces. Enrol from a photo of one person only.",
        )

    # Write the signature *before* uploading the image. The consent trigger
    # fires on this insert, so an unconsented enrolment fails here -- and their
    # photograph never reaches the bucket. Uploading first left the portrait of
    # someone who had not consented sitting in storage after the refusal.
    with postgrest_errors():
        db.table("participant_face_signatures").insert(
            {
                "participant_id": str(participant_id),
                # pgvector parses its own text form; sending the list as JSON
                # text removes any doubt about how it is serialised.
                "embedding": json.dumps(detected[0].embedding),
            }
        ).execute()

    if not set_as_avatar:
        return {"enrolled": True, "avatar_path": None}

    path = storage.build_path(file.filename or "portrait.jpg", f"avatars/{participant_id}")
    storage.upload(path, image, storage.content_type_for(file.filename or "", file.content_type))
    with postgrest_errors():
        db.table("participants").update({"avatar_path": path}).eq(
            "id", str(participant_id)
        ).execute()

    return {"enrolled": True, "avatar_path": path}


# --------------------------------------------------------------------------
# Photos
# --------------------------------------------------------------------------


@router.get("/photos", response_model=list[AdminPhoto])
def list_all_photos(db: AdminDb) -> list[dict]:
    with postgrest_errors():
        photos = db.table("photos").select(_PHOTO_COLUMNS).order("sort_order").execute().data
    return _attach_faces(db, photos)


@router.post("/photos", response_model=AdminPhoto, status_code=status.HTTP_201_CREATED)
async def upload_photo(
    db: AdminDb,
    file: Annotated[UploadFile, File()],
    alt_text: Annotated[str, Form(min_length=1, max_length=500)],
    caption: Annotated[str | None, Form()] = None,
    sort_order: Annotated[int, Form()] = 0,
) -> dict:
    """Upload a group photo; come back with faces found and names guessed.

    Every tag created here is `suggested`. None of it reaches the public page
    until a human confirms it.
    """
    image = await _read_upload(file)
    width, height = face_service.image_size(image)

    path = storage.build_path(file.filename or "photo.jpg", "photos")
    storage.upload(path, image, storage.content_type_for(file.filename or "", file.content_type))

    # The file exists before the row does. If the insert is refused, take the
    # file back out rather than leaving an untracked photograph in the bucket
    # that nothing in the database knows about.
    try:
        with postgrest_errors():
            photo = (
                db.table("photos")
                .insert(
                    {
                        "storage_path": path,
                        "width": width,
                        "height": height,
                        "alt_text": alt_text,
                        "caption": caption,
                        "sort_order": sort_order,
                    }
                )
                .execute()
                .data[0]
            )
    except Exception:
        storage.remove([path])
        raise

    threshold = get_settings().face_match_threshold
    rows = []
    for face in face_service.detect(image):
        match = _best_match(db, face.embedding, threshold)
        rows.append(
            {
                "photo_id": photo["id"],
                "participant_id": match[0] if match else None,
                "box_x": face.box_x,
                "box_y": face.box_y,
                "box_w": face.box_w,
                "box_h": face.box_h,
                "match_score": match[1] if match else None,
                "status": "suggested",
            }
        )

    if rows:
        with postgrest_errors():
            db.table("photo_faces").insert(rows).execute()

    return _attach_faces(db, [photo])[0]


@router.patch("/photos/{photo_id}", response_model=AdminPhoto)
def update_photo(photo_id: UUID, payload: PhotoPatch, db: AdminDb) -> dict:
    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields to update")

    with postgrest_errors():
        result = db.table("photos").update(changes).eq("id", str(photo_id)).execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Photo not found")
    return _attach_faces(db, result.data)[0]


@router.delete("/photos/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_photo(photo_id: UUID, db: AdminDb) -> None:
    """Remove the row and the file. Face tags cascade."""
    with postgrest_errors():
        result = db.table("photos").delete().eq("id", str(photo_id)).execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Photo not found")
    storage.remove([result.data[0]["storage_path"]])


@router.post("/photos/{photo_id}/faces", response_model=AdminPhoto)
def add_face_manually(photo_id: UUID, payload: ManualFace, db: AdminDb) -> dict:
    """Tag someone the detector missed, or that it could not run on at all."""
    with postgrest_errors():
        db.table("photo_faces").insert(
            {
                "photo_id": str(photo_id),
                "participant_id": str(payload.participant_id),
                "box_x": payload.box_x,
                "box_y": payload.box_y,
                "box_w": payload.box_w,
                "box_h": payload.box_h,
                "status": "confirmed",
                "confirmed_at": datetime.now(UTC).isoformat(),
                "confirmed_by": payload.confirmed_by,
            }
        ).execute()
        photo = db.table("photos").select(_PHOTO_COLUMNS).eq("id", str(photo_id)).execute()
    if not photo.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Photo not found")
    return _attach_faces(db, photo.data)[0]


@router.patch("/faces/{face_id}")
def update_face(face_id: UUID, payload: FacePatch, db: AdminDb) -> dict:
    """Confirm the model's guess, correct it, or reject the face entirely."""
    changes: dict[str, Any] = payload.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields to update")

    if "participant_id" in changes and changes["participant_id"] is not None:
        changes["participant_id"] = str(changes["participant_id"])
    if changes.get("status") == "confirmed":
        changes["confirmed_at"] = datetime.now(UTC).isoformat()

    with postgrest_errors():
        result = db.table("photo_faces").update(changes).eq("id", str(face_id)).execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Face not found")
    return result.data[0]


@router.get("/status")
def admin_status() -> dict[str, bool]:
    """Lets the admin page tell the difference between a bad token and a
    backend that cannot do face detection at all."""
    return {"face_models_available": face_service.models_available()}


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------


async def _read_upload(file: UploadFile) -> bytes:
    image = await file.read()
    if not image:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Empty upload")
    if len(image) > _MAX_UPLOAD_BYTES:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            f"Image is larger than {_MAX_UPLOAD_BYTES // (1024 * 1024)}MB",
        )
    return image


def _best_match(db: Any, embedding: list[float], threshold: float) -> tuple[str, float] | None:
    """Closest enrolled participant, or None if nobody is close enough.

    Matching happens in Postgres so embeddings never leave it.
    """
    with postgrest_errors():
        result = db.rpc(
            "match_participant_faces",
            {
                "query_embedding": json.dumps(embedding),
                "match_threshold": threshold,
                "max_results": 1,
            },
        ).execute()
    if not result.data:
        return None
    return result.data[0]["participant_id"], result.data[0]["score"]


def _with_avatar(participant: dict) -> dict:
    """Prefer an externally hosted avatar; otherwise sign the stored one."""
    if not participant.get("avatar_url") and participant.get("avatar_path"):
        return {**participant, "avatar_url": storage.signed_url(participant["avatar_path"])}
    return participant


def _attach_faces(db: Any, photos: list[dict]) -> list[dict]:
    if not photos:
        return []
    with postgrest_errors():
        faces = (
            db.table("photo_faces")
            .select(_FACE_COLUMNS)
            .in_("photo_id", [photo["id"] for photo in photos])
            .execute()
            .data
        )

    by_photo: dict[str, list[dict]] = {}
    for face in faces:
        by_photo.setdefault(face["photo_id"], []).append(face)

    urls = storage.signed_urls([photo["storage_path"] for photo in photos])
    return [
        {
            **photo,
            "image_url": urls.get(photo["storage_path"]),
            "faces": by_photo.get(photo["id"], []),
        }
        for photo in photos
    ]
