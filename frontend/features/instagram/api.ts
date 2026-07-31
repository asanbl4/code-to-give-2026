import type { InstagramFeed, InstagramFeedResult } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

/**
 * Fetch the Instagram feed from the backend. Runs on the server (called from a
 * Server Component), so the browser never sees the backend URL or any token.
 *
 * `cache: "no-store"` matches the rest of this app: always fetch fresh, and let
 * the backend's own TTL cache absorb repeat load.
 */
export async function fetchInstagramFeed(limit = 12): Promise<InstagramFeedResult> {
  try {
    const response = await fetch(`${API_URL}/api/instagram/posts?limit=${limit}`, {
      cache: "no-store",
    });
    if (!response.ok) {
      return { ok: false, error: `${response.status} ${response.statusText}` };
    }
    const feed = (await response.json()) as InstagramFeed;
    return { ok: true, feed };
  } catch (cause) {
    return {
      ok: false,
      error: `Could not reach the API at ${API_URL}. Is the backend running? (${cause})`,
    };
  }
}
