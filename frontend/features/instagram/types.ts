// Mirrors backend/app/features/instagram/models.py. Keep the two in sync.

export type InstagramMediaKind = "image" | "video";
export type InstagramMediaType = "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
export type InstagramFeedSource = "live" | "fixture";

export interface InstagramMedia {
  kind: InstagramMediaKind;
  url: string;
  thumbnail_url: string | null;
}

export interface InstagramPost {
  id: string;
  permalink: string;
  media_type: InstagramMediaType;
  caption: string | null;
  timestamp: string | null;
  media: InstagramMedia[];
}

export interface InstagramFeed {
  source: InstagramFeedSource;
  fetched_at: string;
  posts: InstagramPost[];
}

// Result wrapper so callers handle the error case explicitly instead of throwing.
export type InstagramFeedResult =
  | { ok: true; feed: InstagramFeed }
  | { ok: false; error: string };
