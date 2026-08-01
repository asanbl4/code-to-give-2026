"""Thin async client for the Instagram Graph API.

Only responsibility: make the HTTP call and hand back the raw JSON `data` list.
Normalizing into our own shapes happens in `service.py`. Docs:
https://developers.facebook.com/docs/instagram-platform/instagram-graph-api
"""

import httpx

from app.config import get_settings

settings = get_settings()

# Fields we request per post. `children` expands carousel albums into their
# individual images/videos.
_MEDIA_FIELDS = (
    "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,"
    "children{id,media_type,media_url,thumbnail_url}"
)


class InstagramAuthError(RuntimeError):
    """Raised when no access token is configured."""


async def fetch_media(limit: int) -> list[dict]:
    """Return raw Graph API media objects for the configured account.

    Raises InstagramAuthError if no token is set, httpx.HTTPError on transport
    or HTTP-status failures.
    """
    if not settings.instagram_access_token:
        raise InstagramAuthError("INSTAGRAM_ACCESS_TOKEN is not set")

    url = f"{settings.instagram_graph_host}/{settings.instagram_user_id}/media"
    params = {
        "fields": _MEDIA_FIELDS,
        "limit": limit,
        "access_token": settings.instagram_access_token,
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        payload = response.json()

    return payload.get("data", [])
