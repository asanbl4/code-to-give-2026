"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { IconBadge, type IconBadgeTone, type IconName } from "./Icon";
import { useCountUp } from "./useCountUp";

interface StatCardProps {
  /** The number, large. "500+", "HK$7,500", "12". */
  value: ReactNode;
  label: string;
  helperText?: string;
  icon?: IconName;
  tone?: IconBadgeTone;
  className?: string;
}

/**
 * One big number with a caption. Used by the landing stats strip and the
 * profile impact summary, which had grown two unrelated implementations of the
 * same card — one in hand-written CSS, one in Tailwind with a colour lookup
 * keyed on a hardcoded id string.
 *
 * When `value` is a plain string that reads as "prefix + digits + suffix"
 * ("500+", "HK$7,500"), it counts up from 0 the moment the card scrolls into
 * view. Anything else (JSX, non-numeric text) renders as-is — the count-up is
 * a progressive enhancement, not something callers need to opt into.
 */
export function StatCard({
  value,
  label,
  helperText,
  icon,
  tone = "signal",
  className,
}: StatCardProps) {
  const isCountable = typeof value === "string";
  // Hooks can't be called conditionally, so this always runs — it's just a
  // no-op (returns `value` unchanged, no ref attached) when uncountable.
  const { ref, display } = useCountUp(isCountable ? value : "");

  return (
    <article className={cn("rounded-card bg-surface p-5 ring-1 ring-edge", className)}>
      {icon && <IconBadge name={icon} tone={tone} className="mb-4 bg-paper" />}
      <p
        ref={isCountable ? ref : undefined}
        className="font-display text-3xl font-bold leading-tight text-ink sm:text-4xl"
      >
        {isCountable ? display : value}
      </p>
      <p className="mt-2 font-bold text-ink">{label}</p>
      {helperText && <p className="mt-2 text-sm leading-6 text-ink-soft">{helperText}</p>}
    </article>
  );
}
