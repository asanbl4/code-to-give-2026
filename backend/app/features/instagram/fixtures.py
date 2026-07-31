"""Bundled sample posts used when no Instagram token is configured.

Lets the whole stack run end-to-end before anyone has set up the Graph API
token, and keeps demos alive if a live fetch fails. Images are pulled from
picsum.photos (deterministic per seed) so nothing needs to be committed.

Swap these for a saved response from your real test account whenever convenient
— the shape already matches `models.InstagramPost`.
"""

from datetime import UTC, datetime

from app.features.instagram.models import InstagramMedia, InstagramPost


def _img(seed: str) -> str:
    return f"https://picsum.photos/seed/{seed}/1080/1080"


def sample_posts() -> list[InstagramPost]:
    return [
        InstagramPost(
            id="sample-1",
            permalink="https://www.instagram.com/p/sample1/",
            media_type="IMAGE",
            caption="Sample post — a single image. #somuchability",
            timestamp=datetime(2026, 7, 30, 9, 0, tzinfo=UTC),
            media=[InstagramMedia(kind="image", url=_img("love21-1"))],
        ),
        InstagramPost(
            id="sample-2",
            permalink="https://www.instagram.com/p/sample2/",
            media_type="CAROUSEL_ALBUM",
            caption="Sample post — a carousel of three images.",
            timestamp=datetime(2026, 7, 29, 14, 30, tzinfo=UTC),
            media=[
                InstagramMedia(kind="image", url=_img("love21-2a")),
                InstagramMedia(kind="image", url=_img("love21-2b")),
                InstagramMedia(kind="image", url=_img("love21-2c")),
            ],
        ),
        InstagramPost(
            id="sample-3",
            permalink="https://www.instagram.com/p/sample3/",
            media_type="VIDEO",
            caption="Sample post — a video, with a poster image and no autoplay.",
            timestamp=datetime(2026, 7, 28, 11, 15, tzinfo=UTC),
            media=[
                InstagramMedia(
                    kind="video",
                    url="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
                    thumbnail_url=_img("love21-3"),
                )
            ],
        ),
        InstagramPost(
            id="sample-4",
            permalink="https://www.instagram.com/p/sample4/",
            media_type="IMAGE",
            caption="Sample post — another single image.",
            timestamp=datetime(2026, 7, 27, 16, 45, tzinfo=UTC),
            media=[InstagramMedia(kind="image", url=_img("love21-4"))],
        ),
    ]
