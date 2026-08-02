"""Feature logic: fetch, normalize, cache, and fall back to sample data.

The router calls `get_feed`; everything else here is internal. Fetching is
decoupled from serving on purpose — we cache a live fetch for a few minutes so
page loads don't each hit Instagram (and so a demo survives a brief API hiccup).
"""

import logging
import time
from datetime import UTC, datetime

import httpx

from app.config import get_settings
from app.features.instagram import client, fixtures
from app.features.instagram.models import InstagramFeed, InstagramMedia, InstagramPost

logger = logging.getLogger(__name__)

settings = get_settings()

# Simple in-process cache. Fine for a single-worker MVP; if we ever run multiple
# workers this moves to Redis, but not before we need to.
_cache: dict[str, object] = {"posts": None, "expires_at": 0.0}


def _media_from(raw: dict) -> InstagramMedia:
    is_video = raw.get("media_type") == "VIDEO"
    return InstagramMedia(
        kind="video" if is_video else "image",
        url=raw.get("media_url", ""),
        thumbnail_url=raw.get("thumbnail_url"),
    )


def _normalize(raw: dict) -> InstagramPost:
    """Turn one raw Graph API media object into our flat shape."""
    if raw.get("media_type") == "CAROUSEL_ALBUM":
        children = raw.get("children", {}).get("data", [])
        media = [_media_from(child) for child in children]
    else:
        media = [_media_from(raw)]

    return InstagramPost(
        id=raw["id"],
        permalink=raw.get("permalink", ""),
        media_type=raw.get("media_type", "IMAGE"),
        caption=raw.get("caption"),
        timestamp=raw.get("timestamp"),
        media=media,
    )


async def _live_posts() -> list[InstagramPost]:
    """Fetch from Instagram, using the cached result while it is still fresh."""
    now = time.monotonic()
    cached = _cache["posts"]
    if cached is not None and now < float(_cache["expires_at"]):  # type: ignore[arg-type]
        return cached  # type: ignore[return-value]

    raw_items = await client.fetch_media(limit=settings.instagram_fetch_count)
    posts = [_normalize(item) for item in raw_items]

    _cache["posts"] = posts
    _cache["expires_at"] = now + settings.instagram_cache_ttl_seconds
    return posts


async def get_feed(limit: int = 12) -> InstagramFeed:
    """Return up to `limit` posts, preferring live data, falling back to samples.

    `source` on the response records which one the client actually got.
    """
    fetched_at = datetime.now(UTC)

    if not settings.instagram_access_token:
        return InstagramFeed(
            source="fixture", fetched_at=fetched_at, posts=fixtures.sample_posts()[:limit]
        )

    try:
        posts = await _live_posts()
        return InstagramFeed(source="live", fetched_at=fetched_at, posts=posts[:limit])
    except (
        httpx.HTTPError,
        client.InstagramAuthError,
        client.InstagramApiError,
        KeyError,
    ) as exc:
        # Never hard-fail the page: log and serve samples instead.
        logger.warning("Instagram live fetch failed, serving fixtures: %s", exc)
        return InstagramFeed(
            source="fixture", fetched_at=fetched_at, posts=fixtures.sample_posts()[:limit]
        )
