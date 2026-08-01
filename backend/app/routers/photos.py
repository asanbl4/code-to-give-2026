"""Public read access to published group photos and their confirmed face tags."""

from fastapi import APIRouter

from app import storage
from app.db import Db, postgrest_errors
from app.schemas.photo import Photo

router = APIRouter(prefix="/api/photos", tags=["photos"])

_PHOTO_COLUMNS = "id, storage_path, width, height, alt_text, caption, taken_on, sort_order"
_FACE_COLUMNS = "id, photo_id, participant_id, box_x, box_y, box_w, box_h"


@router.get("", response_model=list[Photo])
def list_photos(db: Db) -> list[dict]:
    """Published photos in display order, each with its confirmed tags nested.

    Two queries rather than a join, because RLS on `photo_faces` already hides
    unconfirmed tags, tags on unpublished photos, and tags naming anyone who has
    not consented. Nothing here re-checks any of that.
    """
    with postgrest_errors():
        photos = (
            db.table("photos")
            .select(_PHOTO_COLUMNS)
            .order("sort_order")
            .order("created_at", desc=True)
            .execute()
            .data
        )

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

    faces_by_photo: dict[str, list[dict]] = {}
    for face in faces:
        faces_by_photo.setdefault(face["photo_id"], []).append(face)

    # One signing call for the whole page rather than one per photo.
    urls = storage.signed_urls([photo["storage_path"] for photo in photos])

    return [
        {
            **photo,
            "image_url": urls.get(photo["storage_path"]),
            "faces": faces_by_photo.get(photo["id"], []),
        }
        for photo in photos
    ]
