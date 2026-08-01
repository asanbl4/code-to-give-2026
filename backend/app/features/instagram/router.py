"""HTTP routes for the Instagram feature.

Registered in `app.main`. All routes live under `/api/instagram`.
"""

from fastapi import APIRouter, Query

from app.features.instagram.models import InstagramFeed
from app.features.instagram.service import get_feed

router = APIRouter(prefix="/api/instagram", tags=["instagram"])


@router.get("/posts")
async def list_posts(limit: int = Query(default=12, ge=1, le=50)) -> InstagramFeed:
    """Return recent posts from the configured Instagram account.

    Falls back to bundled sample posts when no token is configured — check
    `source` on the response to tell live data from samples.
    """
    return await get_feed(limit=limit)
