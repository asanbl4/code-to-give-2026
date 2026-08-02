import { CircularGallery } from "@/components/vendor/CircularGallery";
import { fetchInstagramFeed } from "../api";
import { toGalleryItems } from "../gallery";

interface InstagramGalleryProps {
  /** How many posts to pull. The gallery loops, so a handful is plenty. */
  limit?: number;
  /** Describes the gallery's contents to assistive tech. */
  label?: string;
}

/**
 * The Instagram feed as the curved carousel, rather than the grid `InstagramFeed`
 * renders. Async Server Component: fetches on the server and hands the client
 * gallery a plain array, so no token or backend URL reaches the browser.
 *
 * The gallery itself is WebGL — every image and caption ends up inside a canvas,
 * where a screen reader cannot follow. The `sr-only` list underneath is that
 * missing text. It is deliberately plain text and not links: `sr-only` links
 * would be real tab stops that a sighted keyboard user cannot see, which trades
 * one accessibility problem for another. The canvas keeps its own arrow-key
 * navigation for anyone driving it visually.
 */
export async function InstagramGallery({
  limit = 12,
  label = "Recent posts from Love 21's Instagram. Use left and right arrow keys to move through them.",
}: InstagramGalleryProps) {
  const result = await fetchInstagramFeed(limit);

  if (!result.ok) {
    return (
      <p className="rounded-card bg-danger-soft px-4 py-3 font-bold text-danger">
        Could not load Instagram posts: {result.error}
      </p>
    );
  }

  const { feed } = result;
  const items = toGalleryItems(feed.posts);

  if (items.length === 0) {
    return <p className="text-ink-soft">No posts to show yet.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {feed.source === "fixture" && (
        <p className="rounded-card bg-highlight-soft px-4 py-3 text-ink">
          Showing sample posts — no Instagram token is configured yet.
        </p>
      )}

      {/* The canvas sizes itself from this box, so the height has to be real
          and cannot come from the content. */}
      <div className="h-[420px] w-full">
        <CircularGallery items={items} bend={2} borderRadius={0.05} label={label} />
      </div>

      <ul className="sr-only">
        {items.map((item, index) => (
          <li key={`${index}-${item.image}`}>{item.text || "Untitled post"}</li>
        ))}
      </ul>
    </div>
  );
}
