# Instagram feature (frontend)

Renders the NGO's Instagram posts. Talks only to our own backend
(`/api/instagram/posts`) — never to Instagram directly, so no token touches the
browser.

## Use it

```tsx
import { InstagramFeed } from "@/features/instagram/components/InstagramFeed";

<InstagramFeed limit={12} />;
```

`InstagramFeed` is an async Server Component — it fetches on the server and
renders the grid. Drop it onto any page. A standalone demo route lives at
`app/instagram/page.tsx` (visit `/instagram`).

## Files

| File | Role |
|------|------|
| `types.ts` | TS shapes — mirror of `backend/app/features/instagram/models.py`. |
| `api.ts` | `fetchInstagramFeed(limit)` — calls the backend, returns a result object. |
| `components/InstagramFeed.tsx` | Fetches + lays out the grid; shows a banner when serving sample data. |
| `components/PostCard.tsx` | One post: image / video (no autoplay) / carousel. |

## Notes

- Reads `NEXT_PUBLIC_API_URL` (defaults to `http://127.0.0.1:8000`).
- Uses a plain `<img>` rather than `next/image` — Instagram media URLs are
  signed and expire, which breaks the image optimizer. See the comment in
  `PostCard.tsx`.
- When the backend has no token it returns sample posts; the feed shows a
  "sample posts" banner so it's never mistaken for real data.
- **Not yet done** (deferred per the plan): EN/繁 translations, real alt text,
  and consent gating. This is the data pipe only.
