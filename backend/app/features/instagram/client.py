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


class InstagramApiError(RuntimeError):
    """Instagram answered with an error status.

    Exists so the reason survives. `raise_for_status()` produces
    "Client error '400 Bad Request' for url '...'" — every failure looks the
    same, and the URL it quotes carries `access_token=` in the query string, so
    the log leaks the credential to anyone who reads it (or pastes it into a
    chat while asking for help). Instagram always explains itself in the
    response body; this carries that instead.
    """


def _describe(response: httpx.Response) -> str:
    """Instagram's own explanation, without the token-bearing URL.

    Their errors look like:
        {"error": {"message": "API access blocked.", "type": "OAuthException",
                   "code": 200, "fbtrace_id": "..."}}

    `code` is the useful part and is worth reading before regenerating
    anything: 190 is an expired or invalid token, and a fresh one fixes it;
    200 is a permission or app-level block, and a fresh token from the same app
    will fail in exactly the same way.
    """
    try:
        error = response.json().get("error", {})
    except ValueError:
        error = {}

    if not error:
        return f"HTTP {response.status_code} with no error body"

    parts = [str(error.get("message", "unknown error"))]
    if (code := error.get("code")) is not None:
        parts.append(f"code {code}")
    if (subcode := error.get("error_subcode")) is not None:
        parts.append(f"subcode {subcode}")
    if (trace := error.get("fbtrace_id")) is not None:
        parts.append(f"fbtrace_id {trace}")

    return f"HTTP {response.status_code}: " + ", ".join(parts)


async def fetch_media(limit: int) -> list[dict]:
    """Return raw Graph API media objects for the configured account.

    Raises InstagramAuthError if no token is set, InstagramApiError if Instagram
    answers with an error status, httpx.HTTPError on transport failures.
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
        if response.is_error:
            raise InstagramApiError(_describe(response))
        payload = response.json()

    return payload.get("data", [])
