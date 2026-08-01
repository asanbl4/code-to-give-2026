"""Shapes for `photos` and `photo_faces`."""

from datetime import date
from uuid import UUID

from pydantic import BaseModel


class FaceTag(BaseModel):
    """One confirmed face box, positioned in fractions of the image.

    Carries only `participant_id`; the page joins against `/api/participants`
    rather than repeating every story inside every photo.
    """

    id: UUID
    participant_id: UUID
    box_x: float
    box_y: float
    box_w: float
    box_h: float


class Photo(BaseModel):
    id: UUID
    #: Short-lived signed URL. Absent if the file is missing from the bucket, in
    #: which case the page skips this photo rather than rendering a broken image.
    image_url: str | None = None
    width: int
    height: int
    alt_text: str
    caption: str | None = None
    taken_on: date | None = None
    sort_order: int = 0
    faces: list[FaceTag] = []


class AdminFaceTag(FaceTag):
    """What the staff tool sees: unconfirmed faces and the model's guess.

    `participant_id` is nullable here because a detected but unidentified face is
    an ordinary state that the admin resolves, not an error.
    """

    participant_id: UUID | None = None  # type: ignore[assignment]
    match_score: float | None = None
    status: str
    confirmed_by: str | None = None


class AdminPhoto(Photo):
    storage_path: str
    is_published: bool
    faces: list[AdminFaceTag] = []  # type: ignore[assignment]
