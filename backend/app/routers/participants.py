"""Read-only public access to featured member stories.

Writes are intentionally absent. The `participants` table has no insert, update,
or delete policy, so the only thing that can change it is the service role --
i.e. the staff admin tool, once it exists. Adding a write route here would mean
adding it to `get_admin_db` and thinking hard about who may call it.
"""

from fastapi import APIRouter, HTTPException, status

from app import storage
from app.db import Db, postgrest_errors
from app.schemas.participant import Participant

router = APIRouter(prefix="/api/participants", tags=["participants"])

# Explicit rather than "*": a column added later is not exposed publicly until
# someone chooses to expose it. Note the consent columns are absent -- RLS has
# already applied them, and echoing them back invites a client to re-check badly.
_COLUMNS = (
    "id, slug, first_name, last_name, display_name, avatar_url, avatar_path, "
    "headline, story, joined_on, sort_order"
)


def _with_avatar(participants: list[dict]) -> list[dict]:
    """Resolve each avatar to something the browser can load.

    An external `avatar_url` wins; otherwise `avatar_path` points into the
    private bucket and gets a short-lived signed URL. `avatar_path` itself never
    leaves the API -- a storage key is of no use to a client that cannot read
    the bucket.
    """
    paths = [
        p["avatar_path"] for p in participants if not p.get("avatar_url") and p.get("avatar_path")
    ]
    urls = storage.signed_urls(paths)

    resolved = []
    for participant in participants:
        row = {key: value for key, value in participant.items() if key != "avatar_path"}
        if not row.get("avatar_url") and participant.get("avatar_path"):
            row["avatar_url"] = urls.get(participant["avatar_path"])
        resolved.append(row)
    return resolved


@router.get("", response_model=list[Participant])
def list_participants(db: Db) -> list[dict]:
    """Every participant cleared for publication, in display order."""
    with postgrest_errors():
        # No is_published / consent_given filter: RLS applies both. Adding them
        # here would be duplication that silently rots when the policy changes.
        participants = (
            db.table("participants")
            .select(_COLUMNS)
            .order("sort_order")
            .order("created_at", desc=True)
            .execute()
            .data
        )
    return _with_avatar(participants)


@router.get("/{slug}", response_model=Participant)
def get_participant(slug: str, db: Db) -> dict:
    """One participant by slug, for a /stories/<slug> deep link."""
    with postgrest_errors():
        result = db.table("participants").select(_COLUMNS).eq("slug", slug).limit(1).execute()

    # An unpublished row is filtered away by RLS and arrives here as an empty
    # result. 404, not 403: a 403 would confirm the row exists.
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Participant not found")
    return _with_avatar(result.data)[0]
