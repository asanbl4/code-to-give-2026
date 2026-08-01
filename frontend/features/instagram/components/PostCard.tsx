import type { InstagramPost } from "../types";
import { PostCarousel } from "./PostCarousel";

// MVP note: we use a plain <img>, not next/image, on purpose. Instagram media
// URLs are signed and expire within hours, which breaks next/image's optimizer
// (it caches an optimized copy from a URL that later 404s). A plain <img> just
// re-requests the current URL. Revisit if/when we download + re-host media.

function formatDate(timestamp: string | null): string {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function PostCard({ post }: { post: InstagramPost }) {
  const first = post.media[0];
  const isCarousel = post.media_type === "CAROUSEL_ALBUM" && post.media.length > 1;
  // No per-image alt text from Instagram yet; use the caption as a stand-in.
  const alt = post.caption?.slice(0, 120) || "Instagram post";

  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-transparent bg-zinc-200">
      <div className="relative aspect-square bg-zinc-100">
        {isCarousel ? (
          <PostCarousel media={post.media} alt={alt} />
        ) : first?.kind === "video" ? (
          // No autoplay: user presses play. Poster shown until then.
          <video
            controls
            preload="none"
            poster={first.thumbnail_url ?? undefined}
            className="h-full w-full object-cover"
          >
            <source src={first.url} />
            Your browser does not support the video tag.
          </video>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={first?.url}
            alt={alt}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        {post.caption && (
          <p className="line-clamp-3 text-sm text-zinc-700">{post.caption}</p>
        )}
        <div className="mt-auto flex items-center justify-between pt-2 text-xs text-zinc-500">
          <span>{formatDate(post.timestamp)}</span>
          <a
            href={post.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-zinc-700 underline underline-offset-2 hover:text-zinc-900"
          >
            View on Instagram
          </a>
        </div>
      </div>
    </article>
  );
}
