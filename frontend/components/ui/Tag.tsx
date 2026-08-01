import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type TagTone = "signal" | "quiet" | "warn" | "positive" | "danger" | "outline";

const TONES: Record<TagTone, string> = {
  signal: "bg-signal text-white",
  quiet: "bg-edge text-ink",
  warn: "bg-highlight text-ink",
  positive: "bg-positive text-white",
  danger: "bg-danger text-white",
  outline: "border-2 border-edge bg-paper text-ink",
};

interface TagProps {
  tone?: TagTone;
  className?: string;
  children: ReactNode;
}

/** A small status pill: "On the website", "3 to review", "Anonymous display". */
export function Tag({ tone = "quiet", className, children }: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-sm font-bold",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
