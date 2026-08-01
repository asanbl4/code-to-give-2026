import { formatDate } from "@/lib/format";
import type { InstagramPost } from "../types";
import { PostCarousel } from "./PostCarousel";

// MVP note: we use a plain <img>, not next/image, on purpose. Instagram media
// URLs are signed and expire within hours, which breaks next/image's optimizer
// (it caches an optimized copy from a URL that later 404s). A plain <img> just
// re-requests the current URL. Revisit if/when we download + re-host media.

export function PostCard({ post }: { post: InstagramPost }) {
  const first = post.media[0];
  const isCarousel = post.media_type === "CAROUSEL_ALBUM" && post.media.length > 1;
  // No per-image alt text from Instagram yet; use the caption as a stand-in.
  const alt = post.caption?.slice(0, 120) || "Instagram post";

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-card bg-surface ring-1 ring-edge">
      <div className="relative aspect-square bg-surface-deep">
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
          <img src={first?.url} alt={alt} loading="lazy" className="h-full w-full object-cover" />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        {post.caption && <p className="line-clamp-3 text-ink-soft">{post.caption}</p>}
        <div className="mt-auto flex items-center justify-between gap-3 pt-2 text-sm">
          <span className="text-ink-soft">{formatDate(post.timestamp)}</span>
          <a
            href={post.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-signal underline underline-offset-2 hover:text-signal-deep"
          >
            View on Instagram
          </a>
        </div>
      </div>
    </article>
  );
}
