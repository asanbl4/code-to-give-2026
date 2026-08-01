"""Reading and writing the private photo bucket.

The bucket has no `storage.objects` policies for `anon`, so the publishable key
cannot see it at all. Everything here goes through the service role, and the
public site receives short-lived signed URLs minted per request.

Signed URLs cannot be revoked before they expire -- Supabase is explicit about
this. The expiry window *is* the retraction delay, so keep it short.
"""

import mimetypes
import uuid
from datetime import UTC, datetime

from app.config import get_settings
from app.db import get_admin_db

_ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}


def build_path(filename: str, prefix: str) -> str:
    """A collision-proof key that keeps the original extension.

    Never trust the uploaded filename as a path: it can contain `..` or
    separators. Only the extension survives, and only from a known list.
    """
    suffix = ""
    if "." in filename:
        candidate = filename.rsplit(".", 1)[-1].lower()
        if candidate.isalnum() and len(candidate) <= 5:
            suffix = f".{candidate}"
    stamp = datetime.now(UTC).strftime("%Y/%m")
    return f"{prefix}/{stamp}/{uuid.uuid4().hex}{suffix}"


def content_type_for(filename: str, fallback: str | None) -> str:
    if fallback in _ALLOWED_TYPES:
        return fallback
    guessed, _ = mimetypes.guess_type(filename)
    return guessed if guessed in _ALLOWED_TYPES else "application/octet-stream"


def upload(path: str, data: bytes, content_type: str) -> None:
    bucket = get_admin_db().storage.from_(get_settings().storage_bucket)
    bucket.upload(path, data, {"content-type": content_type, "upsert": "false"})


def remove(paths: list[str]) -> None:
    if not paths:
        return
    get_admin_db().storage.from_(get_settings().storage_bucket).remove(paths)


def signed_urls(paths: list[str]) -> dict[str, str]:
    """Map storage path -> signed URL, in one call.

    Missing or failed paths are simply absent from the result. A photo whose
    file has gone is a photo the page skips, not a 500 for the whole page.
    """
    if not paths:
        return {}

    settings = get_settings()
    bucket = get_admin_db().storage.from_(settings.storage_bucket)
    unique = list(dict.fromkeys(paths))

    try:
        results = bucket.create_signed_urls(unique, settings.signed_url_ttl_seconds)
    except Exception:  # noqa: BLE001 -- a broken bucket must not take down the page
        return {}

    urls: dict[str, str] = {}
    for entry in results or []:
        # supabase-py has used both spellings across versions.
        url = entry.get("signedURL") or entry.get("signedUrl")
        path = entry.get("path")
        if url and path:
            # The API returns the path it was given; normalise the leading slash.
            urls[path.lstrip("/")] = url
    return urls


def signed_url(path: str | None) -> str | None:
    if not path:
        return None
    return signed_urls([path]).get(path.lstrip("/"))
