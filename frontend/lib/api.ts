/**
 * The shapes the FastAPI backend returns, and one place that knows its address.
 */

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export type Participant = {
  id: string;
  slug: string;
  /** Already composed by the backend, so every client agrees on the rule. */
  name: string;
  first_name: string;
  last_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  /** The short story: one line, shown in the tap-a-face popup. */
  headline: string | null;
  /** The long story, behind "read more". */
  story: string | null;
  joined_on: string | null;
  sort_order: number;
};

export type FaceTag = {
  id: string;
  participant_id: string;
  /** Fractions of the image, 0..1, so they scale with whatever size we render. */
  box_x: number;
  box_y: number;
  box_w: number;
  box_h: number;
};

export type Photo = {
  id: string;
  /** Short-lived signed URL. Null when the file is missing from the bucket. */
  image_url: string | null;
  width: number;
  height: number;
  alt_text: string;
  caption: string | null;
  taken_on: string | null;
  sort_order: number;
  faces: FaceTag[];
};

export type StoriesData = {
  photos: Photo[];
  participants: Participant[];
  /** Set when the API could not be reached, so the page can say so plainly. */
  error: string | null;
};

async function getJson<T>(path: string): Promise<T> {
  // no-store: signed image URLs expire, so a cached page would serve dead links.
  const response = await fetch(`${API_URL}${path}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`${path} returned ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

export async function loadStories(): Promise<StoriesData> {
  try {
    const [photos, participants] = await Promise.all([
      getJson<Photo[]>("/api/photos"),
      getJson<Participant[]>("/api/participants"),
    ]);
    return { photos, participants, error: null };
  } catch (cause) {
    return {
      photos: [],
      participants: [],
      error: cause instanceof Error ? cause.message : String(cause),
    };
  }
}
