"""Shapes returned by the Instagram feature.

These are the *normalized* shapes the frontend consumes — deliberately smaller
and flatter than Instagram's raw Graph API response. Keep this file and
`frontend/features/instagram/types.ts` in sync.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel

MediaKind = Literal["image", "video"]
MediaType = Literal["IMAGE", "VIDEO", "CAROUSEL_ALBUM"]
FeedSource = Literal["live", "fixture"]


class InstagramMedia(BaseModel):
    """A single image or video. A carousel post has several of these."""

    kind: MediaKind
    url: str
    thumbnail_url: str | None = None


class InstagramPost(BaseModel):
    id: str
    permalink: str
    media_type: MediaType
    caption: str | None = None
    timestamp: datetime | None = None
    media: list[InstagramMedia]


class InstagramFeed(BaseModel):
    """The API response. `source` tells the client whether this is real data.

    `source == "fixture"` means no token is configured (or a live fetch failed)
    and bundled sample posts are being served — surface that in the UI so a demo
    is never silently showing fake data.
    """

    source: FeedSource
    fetched_at: datetime
    posts: list[InstagramPost]
