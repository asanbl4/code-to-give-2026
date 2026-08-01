# Instagram feature (frontend)

Renders the NGO's Instagram posts. Talks only to our own backend
(`/api/instagram/posts`) — never to Instagram directly, so no token touches the
browser.

## Use it

Drop the **section** anywhere on any page — it's the self-contained unit
(heading + container + grid):

```tsx
import { InstagramSection } from "@/features/instagram/components/InstagramSection";

<InstagramSection title="Latest from Instagram" limit={6} />;
```

Props: `title`, `subtitle`, `limit`, `profileUrl` (adds a "See more on
Instagram" link), `headingLevel` (1–3, default 2, to fit the page's outline),
`className` (spacing/background overrides). It's an async-friendly Server
Component, so no client wiring is needed.

Need just the bare grid (your own heading/layout)? Use `<InstagramFeed limit={n} />`.

It's live on the home page (`app/page.tsx`). A standalone route at
`app/instagram/page.tsx` (`/instagram`) exists only for isolated testing — safe
to delete.

## Files

| File | Role |
|------|------|
| `types.ts` | TS shapes — mirror of `backend/app/features/instagram/models.py`. |
| `api.ts` | `fetchInstagramFeed(limit)` — calls the backend, returns a result object. |
| `components/InstagramSection.tsx` | **Drop-in section**: heading + container + feed. Insert anywhere. |
| `components/InstagramFeed.tsx` | The bare grid; shows a banner when serving sample data. |
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
