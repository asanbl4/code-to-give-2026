import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { IconBadge, type IconBadgeTone, type IconName } from "./Icon";

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
 */
export function StatCard({
  value,
  label,
  helperText,
  icon,
  tone = "signal",
  className,
}: StatCardProps) {
  return (
    <article className={cn("rounded-card bg-surface p-5 ring-1 ring-edge", className)}>
      {icon && <IconBadge name={icon} tone={tone} className="mb-4 bg-paper" />}
      <p className="font-display text-3xl font-bold leading-tight text-ink sm:text-4xl">{value}</p>
      <p className="mt-2 font-bold text-ink">{label}</p>
      {helperText && <p className="mt-2 text-sm leading-6 text-ink-soft">{helperText}</p>}
    </article>
  );
}
