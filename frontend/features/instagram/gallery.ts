import type { GalleryItem } from "@/components/vendor/CircularGallery";
import type { InstagramPost } from "./types";

/**
 * About what fits under one tile at the gallery's default 24px label font.
 *
 * Measured rather than guessed: at 42 the labels of neighbouring tiles visibly
 * ran into each other, because the gallery centres each label under its tile
 * and neither wraps nor clips it. Tile width scales with the viewport, so this
 * stays approximate — it is set to the narrow end on purpose.
 */
const MAX_LABEL_CHARS = 30;

/**
 * A caption, cut down to something that can be drawn under a gallery tile.
 *
 * Instagram captions run long and usually end in a wall of hashtags, and the
 * gallery paints its label into a canvas texture at a fixed size — there is no
 * wrapping and no ellipsis to save us, the text just runs off the tile. So:
 * first line only, hashtags dropped, then truncated.
 *
 * If a caption is nothing but hashtags, the stripped version is empty and the
 * first line is used as-is — a tag is a poor label but a blank tile is worse.
 */
export function captionToLabel(caption: string | null): string {
  if (!caption) return "";

  const firstLine = caption.split("\n")[0].trim();
  const withoutHashtags = firstLine.replace(/#\S+/g, "").replace(/\s+/g, " ").trim();
  const label = withoutHashtags || firstLine;

  if (label.length <= MAX_LABEL_CHARS) return label;
  return `${label.slice(0, MAX_LABEL_CHARS - 1).trimEnd()}…`;
}

/**
 * Posts, as tiles the circular gallery can render.
 *
 * The gallery uploads each `image` into a WebGL texture, so every tile needs a
 * still image: a video contributes its poster (`thumbnail_url`), never its
 * `url`, which is an .mp4. A post with no usable still is dropped rather than
 * rendered as a blank tile — that is why this returns its own array instead of
 * mapping one-to-one over posts.
 *
 * For a carousel album the first item stands in for the whole post, which is
 * the same choice PostCard makes.
 */
export function toGalleryItems(posts: readonly InstagramPost[]): GalleryItem[] {
  const items: GalleryItem[] = [];

  for (const post of posts) {
    const first = post.media[0];
    if (!first) continue;

    const image = first.kind === "video" ? first.thumbnail_url : first.url;
    if (!image) continue;

    items.push({ image, text: captionToLabel(post.caption) });
  }

  return items;
}
