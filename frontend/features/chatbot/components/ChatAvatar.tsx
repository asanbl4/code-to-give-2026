interface ChatAvatarProps {
  /** 8 = beside an answer, 10 = in the panel header. */
  size?: 8 | 10;
}

/**
 * PLACEHOLDER. Swap the contents for the real asset.
 *
 * Deliberately a styled `<div>` rather than an `<img>`: there is no approved
 * avatar art yet, and a missing-image icon in a demo is worse than a mark that
 * looks intentional. When the real one arrives, drop an `<img>`/`<Image>` in
 * here and keep the wrapper's sizing and `aria-hidden`.
 *
 * `aria-hidden` because it is decorative — the panel header already names the
 * assistant in text, and a screen reader announcing "Love 21 avatar" before
 * every answer is noise (definition of done: names announced once, not twice).
 */
export function ChatAvatar({ size = 8 }: ChatAvatarProps) {
  const box = size === 10 ? "h-10 w-10 text-base" : "h-8 w-8 text-sm";

  return (
    <div
      aria-hidden="true"
      className={`${box} flex shrink-0 select-none items-center justify-center rounded-full bg-zinc-900 font-semibold text-zinc-50`}
    >
      21
    </div>
  );
}
