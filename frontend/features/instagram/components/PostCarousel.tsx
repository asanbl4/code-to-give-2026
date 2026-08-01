"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { InstagramMedia } from "../types";

/**
 * Swipeable carousel for multi-image/video posts. Native horizontal scroll-snap
 * handles touch and trackpad; the prev/next buttons and dots cover mouse and
 * keyboard. Programmatic scrolls honour `prefers-reduced-motion`.
 */
export function PostCarousel({ media, alt }: { media: InstagramMedia[]; alt: string }) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);

  const scrollToIndex = useCallback(
    (target: number) => {
      const track = trackRef.current;
      if (!track) return;
      const clamped = Math.max(0, Math.min(target, media.length - 1));
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      track.scrollTo({
        left: track.clientWidth * clamped,
        behavior: reduceMotion ? "auto" : "smooth",
      });
    },
    [media.length],
  );

  const handleScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const current = Math.round(track.scrollLeft / track.clientWidth);
    setIndex((prev) => (prev === current ? prev : current));
  }, []);

  return (
    <div className="relative h-full w-full">
      <ul
        ref={trackRef}
        onScroll={handleScroll}
        className="flex h-full w-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {media.map((item, i) => (
          <li key={i} className="h-full w-full flex-none snap-start">
            {item.kind === "video" ? (
              <video
                controls
                preload="none"
                poster={item.thumbnail_url ?? undefined}
                className="h-full w-full object-cover"
              >
                <source src={item.url} />
                Your browser does not support the video tag.
              </video>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.url}
                alt={`${alt} (${i + 1} of ${media.length})`}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            )}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => scrollToIndex(index - 1)}
        disabled={index === 0}
        aria-label="Previous image"
        className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-ink/60 text-white hover:bg-ink/80 disabled:pointer-events-none disabled:opacity-0"
      >
        <span aria-hidden="true">‹</span>
      </button>
      <button
        type="button"
        onClick={() => scrollToIndex(index + 1)}
        disabled={index === media.length - 1}
        aria-label="Next image"
        className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-ink/60 text-white hover:bg-ink/80 disabled:pointer-events-none disabled:opacity-0"
      >
        <span aria-hidden="true">›</span>
      </button>

      <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-ink/50 px-2 py-1">
        {media.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => scrollToIndex(i)}
            aria-label={`Go to image ${i + 1} of ${media.length}`}
            aria-current={i === index}
            className={cn(
              "h-1.5 w-1.5 rounded-full transition-colors",
              i === index ? "bg-white" : "bg-white/50 hover:bg-white/80",
            )}
          />
        ))}
      </div>
    </div>
  );
}
