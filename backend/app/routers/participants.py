"""Read-only public access to featured member stories.

Writes are intentionally absent. The `participants` table has no insert, update,
or delete policy, so the only thing that can change it is the service role --
i.e. the staff admin tool, once it exists. Adding a write route here would mean
adding it to `get_admin_db` and thinking hard about who may call it.
"""

from fastapi import APIRouter, HTTPException, status

from app.db import Db, postgrest_errors
from app.schemas.participant import Participant

router = APIRouter(prefix="/api/participants", tags=["participants"])

# Explicit rather than "*": a column added later is not exposed publicly until
# someone chooses to expose it.
_COLUMNS = (
    "id, slug, first_name, last_name, display_name, avatar_url, "
    "headline, progress_summary, story, joined_on, sort_order"
)


@router.get("", response_model=list[Participant])
def list_participants(db: Db) -> list[dict]:
    """Every participant cleared for publication, in display order."""
    with postgrest_errors():
        # No is_published / consent_given filter: RLS applies both. Adding them
        # here would be duplication that silently rots when the policy changes.
        return (
            db.table("participants")
            .select(_COLUMNS)
            .order("sort_order")
            .order("created_at", desc=True)
            .execute()
            .data
        )


@router.get("/{slug}", response_model=Participant)
def get_participant(slug: str, db: Db) -> dict:
    """One participant by slug, for a /stories/<slug> deep link."""
    with postgrest_errors():
        result = db.table("participants").select(_COLUMNS).eq("slug", slug).limit(1).execute()

    # An unpublished row is filtered away by RLS and arrives here as an empty
    # result. 404, not 403: a 403 would confirm the row exists.
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Participant not found")
    return result.data[0]
