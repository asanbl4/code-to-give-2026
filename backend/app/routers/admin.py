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
from postgrest.exceptions import APIError
from pydantic import BaseModel, Field

from app import faces as face_service
from app import slugs, storage
from app.auth import require_staff
from app.config import get_settings
from app.db import AdminDb, postgrest_errors, postgrest_http_error
from app.schemas.participant import Participant
from app.schemas.photo import AdminFaceTag, AdminPhoto

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_staff)])

_PARTICIPANT_COLUMNS = (
    "id, slug, first_name, last_name, display_name, avatar_url, avatar_path, "
    "headline, story, joined_on, sort_order, "
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
    """A new member. `headline` is the short story, `story` the long one.

    `slug` is optional because the staff form no longer asks for one -- it is
    derived from the name (see `app.slugs`). Still validated when supplied, so a
    direct API caller can pin a particular web address.

    `consent_face_recognition` is here, unlike the other consent fields, because
    a portrait uploaded with the create form is enrolled immediately and the
    database trigger refuses that without it. Setting it in the same insert
    keeps the consent atomic with the row rather than a follow-up PATCH that can
    fail on its own.
    """

    slug: str | None = Field(
        default=None, pattern=r"^[a-z0-9]+(-[a-z0-9]+)*$", min_length=2, max_length=80
    )
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str | None = Field(default=None, max_length=80)
    display_name: str | None = Field(default=None, max_length=160)
    headline: str | None = Field(default=None, max_length=200)
    story: str | None = Field(default=None, max_length=20000)
    avatar_url: str | None = Field(default=None, max_length=2048)
    sort_order: int = 0
    consent_face_recognition: bool = False


class ParticipantPatch(BaseModel):
    """All optional: the admin page sends only what changed.

    The remaining consent fields live here rather than on the create form on
    purpose. The charity already holds signed paper media-release forms;
    `consent_form_reference` and `consent_recorded_by` record *which* form and
    *who* checked it, so the database carries an attestation rather than an
    anonymous tick.

    `slug` is absent and should stay absent. It is the public identifier behind
    `/stories/<slug>`; renaming a member must not break a link someone shared.
    """

    first_name: str | None = Field(default=None, min_length=1, max_length=80)
    last_name: str | None = Field(default=None, max_length=80)
    display_name: str | None = Field(default=None, max_length=160)
    headline: str | None = Field(default=None, max_length=200)
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
    row = payload.model_dump(exclude_none=True)
    row.setdefault("slug", slugs.slugify(payload.first_name, payload.last_name))
    return _with_avatar(_insert_with_free_slug(db, row)) | {"enrolled_faces": 0}


@router.delete("/participants/{participant_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_participant(participant_id: UUID, db: AdminDb) -> None:
    """Remove a member, their biometric data, and their tags.

    Two cascades do most of the work, and both are wanted here:
    `participant_face_signatures` goes, so their embeddings are destroyed rather
    than orphaned; and `photo_faces` goes, so their boxes disappear from every
    group photo. The second is not merely an unassignment -- `ON DELETE SET
    NULL` is not available to us, because a confirmed row with no participant
    violates `photo_faces_confirmed_needs_participant`. The staff tool warns how
    many photos are affected before calling this.

    The avatar file has no foreign key to cascade along, so remove it by hand.
    """
    with postgrest_errors():
        result = db.table("participants").delete().eq("id", str(participant_id)).execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Participant not found")

    if result.data[0].get("avatar_path"):
        storage.remove([result.data[0]["avatar_path"]])


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

    with postgrest_errors():
        existing = (
            db.table("participants")
            .select("avatar_path")
            .eq("id", str(participant_id))
            .execute()
            .data
        )
    superseded = existing[0]["avatar_path"] if existing else None

    path = storage.build_path(file.filename or "portrait.jpg", f"avatars/{participant_id}")
    storage.upload(path, image, storage.content_type_for(file.filename or "", file.content_type))
    with postgrest_errors():
        db.table("participants").update({"avatar_path": path}).eq(
            "id", str(participant_id)
        ).execute()

    # Only once the new path is committed. Every enrolment mints a fresh uuid
    # path, so without this the previous portrait sits in the private bucket
    # forever with nothing in the database pointing at it -- which used to be
    # rare and became routine when the edit dialog let staff replace a photo.
    if superseded and superseded != path:
        storage.remove([superseded])

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
    _refuse_second_confirmation(db, str(photo_id), str(payload.participant_id), face_id=None)
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


@router.patch("/faces/{face_id}", response_model=AdminFaceTag)
def update_face(face_id: UUID, payload: FacePatch, db: AdminDb) -> dict:
    """Confirm the model's guess, correct it, or reject the face entirely.

    These are state transitions, not column writes, and the difference matters.
    Sending the columns through verbatim let two ordinary actions -- reassigning
    a confirmed face, and clearing the name on one -- land on a database
    constraint, so a charity worker read "duplicate key value violates unique
    constraint" and had no idea what they had done wrong. The invariants are
    checked here in words now; the constraints go back to being the safety net
    they were written as.
    """
    changes: dict[str, Any] = payload.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields to update")

    if "participant_id" in changes and changes["participant_id"] is not None:
        changes["participant_id"] = str(changes["participant_id"])

    with postgrest_errors():
        found = db.table("photo_faces").select(_FACE_COLUMNS).eq("id", str(face_id)).execute().data
    if not found:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Face not found")
    current = found[0]

    next_participant = changes.get("participant_id", current["participant_id"])
    next_status = changes.get("status", current["status"])

    # Naming someone else un-confirms the box. A human confirmed *that person*,
    # not that rectangle, so their confirmation does not carry over.
    if (
        "participant_id" in changes
        and changes["participant_id"] != current["participant_id"]
        and "status" not in changes
    ):
        next_status = "suggested"

    if next_status == "confirmed":
        if next_participant is None:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY, "Choose who this is before confirming."
            )
        _refuse_second_confirmation(db, current["photo_id"], next_participant, str(face_id))
        changes["confirmed_at"] = datetime.now(UTC).isoformat()
    else:
        # Anything that is not confirmed carries no confirmation.
        changes["confirmed_at"] = None
        changes["confirmed_by"] = None

    changes["status"] = next_status

    with postgrest_errors():
        result = db.table("photo_faces").update(changes).eq("id", str(face_id)).execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Face not found")
    return result.data[0]


@router.delete("/faces/{face_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_face(face_id: UUID, db: AdminDb) -> None:
    """Throw away a detection: a shadow, a bystander's ear, a false positive.

    Distinct from rejecting one, which keeps the box on the admin page so staff
    can see it was reviewed and change their mind. Deleting is the destructive
    option and has its own button for that reason.
    """
    with postgrest_errors():
        result = db.table("photo_faces").delete().eq("id", str(face_id)).execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Face not found")


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


def _insert_with_free_slug(db: Any, row: dict) -> dict:
    """Insert, stepping to the next slug if the database says that one is taken.

    Deliberately not "check whether the slug is free, then insert": between the
    two statements someone else can take it, and the unique index would win
    anyway. Letting the constraint be the authority removes both the race and a
    round trip on every create, at the cost of an occasional retry.

    Only a *slug* collision retries. Any other unique violation is a real
    failure and must not be swallowed by the loop.
    """
    base = row["slug"]
    for candidate in slugs.slug_candidates(base):
        try:
            return db.table("participants").insert({**row, "slug": candidate}).execute().data[0]
        except APIError as exc:
            taken = exc.code == "23505" and "participants_slug_key" in f"{exc.message}{exc.details}"
            if not taken:
                raise postgrest_http_error(exc) from exc

    raise HTTPException(
        status.HTTP_409_CONFLICT, "Could not find a free web address for that name."
    )


def _refuse_second_confirmation(
    db: Any, photo_id: str, participant_id: str, face_id: str | None
) -> None:
    """One person cannot be confirmed twice in the same photo.

    `photo_faces_one_confirmed_per_person_idx` says the same thing, but says it
    in Postgres. This says it in a sentence naming the person, before the write.
    """
    with postgrest_errors():
        confirmed = (
            db.table("photo_faces")
            .select("id")
            .eq("photo_id", photo_id)
            .eq("participant_id", participant_id)
            .eq("status", "confirmed")
            .execute()
            .data
        )
    # Re-confirming the same box is not a clash with itself.
    if not any(row["id"] != face_id for row in confirmed):
        return

    with postgrest_errors():
        person = (
            db.table("participants")
            .select("first_name, last_name, display_name")
            .eq("id", participant_id)
            .execute()
            .data
        )
    name = _display_name(person[0]) if person else "That person"
    raise HTTPException(status.HTTP_409_CONFLICT, f"{name} is already confirmed in this photo.")


def _display_name(participant: dict) -> str:
    """The same rule as `Participant.name`, for messages built from a raw row."""
    if participant.get("display_name"):
        return str(participant["display_name"])
    parts = (participant.get("first_name"), participant.get("last_name"))
    return " ".join(part for part in parts if part) or "That person"


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
