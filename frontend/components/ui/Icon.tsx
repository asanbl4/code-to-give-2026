import { cn } from "@/lib/cn";

/**
 * Every inline SVG on the site, named.
 *
 * These paths were previously pasted straight into JSX — the heart appeared in
 * three separate components, and the trust-and-transparency row picked its icon
 * by array index, so reordering the copy silently reassigned the pictures.
 *
 * All paths share a 24×24 viewBox and are drawn with `currentColor`, so an icon
 * takes the text colour of whatever it sits in.
 */
const PATHS = {
  heart:
    "M12 21s-7-4.4-9.2-8.6C.9 8.8 3.3 5 7.2 5c2 0 3.6 1 4.8 2.5C13.2 6 14.8 5 16.8 5c3.9 0 6.3 3.8 4.4 7.4C19 16.6 12 21 12 21Z",
  shieldCheck:
    "M12 2 5 5v6c0 4.4 2.9 8.5 7 9.8 4.1-1.3 7-5.4 7-9.8V5l-7-3Zm3.4 7.8-4.1 4.1-2.2-2.2 1.3-1.3.9.9 2.8-2.8 1.3 1.3Z",
  shieldInfo:
    "M12 2 5 5v6c0 4.4 2.9 8.5 7 9.8 4.1-1.3 7-5.4 7-9.8V5l-7-3Zm1 6v4h3v2h-5V8h2Z",
  shieldPin:
    "M12 3 4 7v5c0 4.1 3.4 7.8 8 9 4.6-1.2 8-4.9 8-9V7l-8-4Zm0 5a3 3 0 0 1 3 3c0 2.2-3 5-3 5s-3-2.8-3-5a3 3 0 0 1 3-3Z",
  receipt: "M4 6h16v3H4V6Zm1 5h14v7H5v-7Zm3 2v3h2v-3H8Zm4 0v3h4v-3h-4Z",
  lock: "M7 10V8a5 5 0 0 1 10 0v2h1v10H6V10h1Zm2 0h6V8a3 3 0 0 0-6 0v2Zm2 4v2h2v-2h-2Z",
  layers: "M12 3 3 7l9 4 9-4-9-4Zm-7 7v6l7 3 7-3v-6l-7 3-7-3Z",
  star: "M12 3 14.7 8.5 21 9.4l-4.5 4.4 1.1 6.2L12 17.1 6.4 20l1.1-6.2L3 9.4l6.3-.9L12 3Z",
  hands:
    "M12 4a4 4 0 0 1 4 4v2h1a3 3 0 0 1 3 3v6h-2v-6a1 1 0 0 0-1-1h-1v2h-2V8a2 2 0 0 0-4 0v6H8v-2H7a1 1 0 0 0-1 1v6H4v-6a3 3 0 0 1 3-3h1V8a4 4 0 0 1 4-4Z",
  ball:
    "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm4.6 5.2a7 7 0 0 1 1.3 3.1 12 12 0 0 0-4.2-.4 12.5 12.5 0 0 0-.8-2.1 8.5 8.5 0 0 0 3.7-.6ZM12 5a7 7 0 0 1 2.7.5 6.5 6.5 0 0 1-2.9 1.4 13.5 13.5 0 0 0-1.6-1.7A7.5 7.5 0 0 1 12 5ZM7.9 6.3c.6.5 1.2 1.1 1.7 1.8A10.4 10.4 0 0 1 5.4 10a7 7 0 0 1 2.5-3.7Zm-2.7 6.1a12.7 12.7 0 0 0 5.4-2.3c.3.6.5 1.2.7 1.9a10.7 10.7 0 0 0-4.2 4 7 7 0 0 1-1.9-3.6Zm3.5 4.9a8.8 8.8 0 0 1 3-3.1 15.4 15.4 0 0 1 .1 4.8 7 7 0 0 1-3.1-1.7Zm5.2 1.4a16 16 0 0 0-.1-5.3 9.2 9.2 0 0 1 4.1.3 7 7 0 0 1-4 5Z",
  nutrition:
    "M7 3c4.4 0 8 3.6 8 8v1h-1c-4.4 0-8-3.6-8-8V3h1Zm10 1h2v5a5 5 0 0 1-5 5h-1v-1a5 5 0 0 1 4-4.9V4ZM5 14h14v2a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5v-2Z",
  family:
    "M8 11a4 4 0 1 1 8 0v1h1a3 3 0 0 1 3 3v5h-2v-5a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1v5H4v-5a3 3 0 0 1 3-3h1v-1Zm4-2a2 2 0 0 0-2 2v1h4v-1a2 2 0 0 0-2-2ZM5.5 4a2.5 2.5 0 0 1 2.2 3.7A4.9 4.9 0 0 0 6.2 10H4a3 3 0 0 0-3 3v2h2v-2a1 1 0 0 1 1-1h1.1a6.5 6.5 0 0 1 .8-3.4A2.5 2.5 0 0 1 5.5 4Zm13 0a2.5 2.5 0 0 0-.4 4.6 6.5 6.5 0 0 1 .8 3.4H20a1 1 0 0 1 1 1v2h2v-2a3 3 0 0 0-3-3h-2.2a4.9 4.9 0 0 0-1.5-2.3A2.5 2.5 0 0 1 18.5 4Z",
  briefcase:
    "M9 4h6l1 2h4v14H4V6h4l1-2Zm1.2 2-.5 1h4.6l-.5-1h-3.6ZM6 9v3h12V9H6Zm0 5v4h12v-4h-5v2h-2v-2H6Z",
} as const;

export type IconName = keyof typeof PATHS;

interface IconProps {
  name: IconName;
  /** Size and colour come from here. Defaults to 1.25rem square. */
  className?: string;
}

export function Icon({ name, className }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={cn("h-5 w-5", className)}>
      <path fill="currentColor" d={PATHS[name]} />
    </svg>
  );
}

export type IconBadgeTone = "signal" | "highlight" | "positive" | "quiet";

const BADGE_TONES: Record<IconBadgeTone, string> = {
  signal: "bg-signal-soft text-signal-deep",
  highlight: "bg-highlight-soft text-ink",
  positive: "bg-positive-soft text-positive",
  quiet: "bg-surface text-ink-soft",
};

/** An icon in a tinted rounded square — the recurring "feature bullet" motif. */
export function IconBadge({
  name,
  tone = "signal",
  className,
}: IconProps & { tone?: IconBadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-card",
        BADGE_TONES[tone],
        className,
      )}
    >
      <Icon name={name} />
    </span>
  );
}
