# Instagram feature (backend)

Serves the NGO's Instagram posts to the frontend. Official **Instagram Graph
API** only — no scraping.

## Endpoint

```
GET /api/instagram/posts?limit=12   # limit 1..50, default 12
```

Returns an `InstagramFeed`:

```jsonc
{
  "source": "live",           // "live" = real Instagram, "fixture" = sample data
  "fetched_at": "2026-07-31T09:00:00Z",
  "posts": [
    {
      "id": "17895...",
      "permalink": "https://www.instagram.com/p/...",
      "media_type": "IMAGE",      // IMAGE | VIDEO | CAROUSEL_ALBUM
      "caption": "…",
      "timestamp": "2026-07-30T09:00:00Z",
      "media": [                   // >1 item only for CAROUSEL_ALBUM
        { "kind": "image", "url": "https://...", "thumbnail_url": null }
      ]
    }
  ]
}
```

## No token? It still works

With `INSTAGRAM_ACCESS_TOKEN` empty, the endpoint returns bundled sample posts
(`source: "fixture"`). This lets the frontend be built before the token exists,
and keeps a demo alive if a live fetch fails. Wire the token in when ready — no
frontend changes needed.

**Getting a token + full setup:** see [`docs/instagram-setup.md`](../../../../docs/instagram-setup.md).

## Files

| File | Role |
|------|------|
| `models.py`   | Response shapes (keep in sync with `frontend/features/instagram/types.ts`). |
| `client.py`   | Thin async Graph API call (`httpx`). |
| `service.py`  | Normalize + in-process TTL cache + fixture fallback. |
| `fixtures.py` | Sample posts for no-token / failure mode. |
| `router.py`   | `GET /api/instagram/posts`. |

## Configuration

Set in `backend/.env` (see `.env.example`). Read via `app/config.py`
(`get_settings()`) — never `os.getenv` directly. The access token is a **secret**: backend only,
never exposed to the browser.

| Var | Default | Purpose |
|-----|---------|---------|
| `INSTAGRAM_ACCESS_TOKEN` | _(empty)_ | Long-lived Graph API token. Empty ⇒ sample data. |
| `INSTAGRAM_USER_ID` | `me` | Account to read. |
| `INSTAGRAM_CACHE_TTL_SECONDS` | `300` | Live-fetch cache lifetime. |

## Known limitation

`media[].url` from Instagram is a **signed CDN URL that expires in hours**. Fine
while we fetch live and pass it straight through. Persisting posts to a DB later
means downloading and re-hosting the media at ingest — out of scope for this MVP.
