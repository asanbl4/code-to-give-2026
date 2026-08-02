import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "quiet" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "handwritten-button--filled bg-signal text-white hover:bg-signal-deep",
  secondary:
    "handwritten-button--outline border-2 border-edge bg-paper text-ink hover:border-signal hover:bg-surface",
  quiet:
    "handwritten-button--quiet text-ink-soft hover:bg-surface hover:text-ink",
  danger:
    "handwritten-button--outline border-2 border-danger bg-paper text-danger hover:bg-danger-soft",
};

const SIZES: Record<ButtonSize, string> = {
  // 44px minimum height at every size: the WCAG target-size floor, and this
  // audience includes people who find small targets genuinely hard to hit.
  sm: "min-h-11 px-4 py-2 text-sm",
  md: "min-h-11 px-5 py-2.5",
  lg: "min-h-12 px-6 py-3 text-lg",
};

const BASE =
  "handwritten-button inline-flex items-center justify-center gap-2 rounded-full text-center " +
  "transition-colors disabled:pointer-events-none disabled:opacity-45";

interface Shared {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Stretch to the width of the parent. */
  block?: boolean;
  className?: string;
  children: ReactNode;
}

type AsButton = Shared & ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
type AsLink = Shared & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: string };

/**
 * Every button and every call-to-action link on the site.
 *
 * Pass `href` and it renders a link — `next/link` for an in-app route, a plain
 * `<a>` for anything external or a `mailto:`. That keeps client-side navigation
 * without making each caller remember which element to reach for, which is how
 * the donate and profile pages ended up with six near-identical copies of the
 * same 180-character class string.
 *
 * There is deliberately no focus-visible class here: `globals.css` owns focus.
 */
export function Button({
  variant = "primary",
  size = "md",
  block,
  className,
  children,
  ...rest
}: AsButton | AsLink) {
  const classes = cn(BASE, VARIANTS[variant], SIZES[size], block && "w-full", className);

  if (rest.href !== undefined) {
    const { href, ...anchorProps } = rest;

    // next/link for in-app routes so navigation stays client-side; a plain <a>
    // for anything external, a mailto:, or a #fragment.
    if (href.startsWith("/")) {
      return (
        <Link href={href} className={classes} {...anchorProps}>
          {children}
        </Link>
      );
    }
    return (
      <a href={href} className={classes} {...anchorProps}>
        {children}
      </a>
    );
  }

  // `href` is narrowed to undefined here, so it is safe to spread.
  const { type, ...buttonProps } = rest;
  // Default to "button": an unspecified <button> inside a form submits it.
  return (
    <button type={type ?? "button"} className={classes} {...buttonProps}>
      {children}
    </button>
  );
}
