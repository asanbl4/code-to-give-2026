import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type CardTone = "paper" | "surface" | "signal" | "highlight" | "positive" | "danger";
export type CardPadding = "none" | "sm" | "md" | "lg";

const TONES: Record<CardTone, string> = {
  paper: "bg-paper ring-edge",
  surface: "bg-surface ring-edge",
  signal: "bg-signal-soft ring-signal/25",
  highlight: "bg-highlight-soft ring-highlight/45",
  positive: "bg-positive-soft ring-positive/25",
  danger: "bg-danger-soft ring-danger/30",
};

const PADDING: Record<CardPadding, string> = {
  none: "",
  sm: "p-4",
  md: "p-5 sm:p-6",
  lg: "p-6 sm:p-8",
};

interface OwnProps<T extends ElementType> {
  /** `article`, `li`, `aside`, `form`… Defaults to a plain `div`. */
  as?: T;
  tone?: CardTone;
  padding?: CardPadding;
  /** The larger 2rem radius, for full-width page panels rather than list items. */
  panel?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * Polymorphic, so `<Card as="form" onSubmit={…}>` type-checks `onSubmit`
 * against HTMLFormElement rather than a generic HTMLElement.
 */
type CardProps<T extends ElementType> = OwnProps<T> &
  Omit<ComponentPropsWithoutRef<T>, keyof OwnProps<T>>;

/**
 * The surface every block of content sits on.
 *
 * Replaces ten hand-written copies of
 * `rounded-[2rem] border border-<something>-100 bg-white p-6 shadow-sm sm:p-8`,
 * which had drifted into four different radii and five different border colours
 * depending on which page you were looking at.
 */
export function Card<T extends ElementType = "div">({
  as,
  tone = "paper",
  padding = "md",
  panel = false,
  className,
  children,
  ...rest
}: CardProps<T>) {
  const Tag = (as ?? "div") as ElementType;

  return (
    <Tag
      {...rest}
      className={cn(
        panel ? "rounded-panel" : "rounded-card",
        "shadow-card ring-1",
        TONES[tone],
        PADDING[padding],
        className,
      )}
    >
      {children}
    </Tag>
  );
}
