import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Card } from "./Card";

/** Deterministic id from the heading text — no hooks, so this stays a Server Component. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

interface SectionProps {
  title: string;
  /** Small uppercase line above the heading. */
  eyebrow?: string;
  description?: ReactNode;
  /** 2 by default. Set 3 when the section is nested inside another. */
  headingLevel?: 2 | 3;
  /** Override the generated id when two sections on one page share a title. */
  id?: string;
  /** Content pinned to the right of the heading on wide screens. */
  aside?: ReactNode;
  /** Wrap in a Card. Off for sections that sit directly on the page. */
  card?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * A labelled section: eyebrow, heading, description, content.
 *
 * The `aria-labelledby` wiring is the reason this exists as a component. Every
 * section on the site needs it, and hand-writing the id in two places is how
 * you end up with three sections all pointing at `#heading`.
 */
export function Section({
  title,
  eyebrow,
  description,
  headingLevel = 2,
  id,
  aside,
  card = false,
  className,
  children,
}: SectionProps) {
  const headingId = id ?? slugify(title);
  const Heading = headingLevel === 3 ? "h3" : "h2";

  const header = (
    <div className={aside ? "flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between" : undefined}>
      <div>
        {eyebrow && (
          <p className="font-display text-sm font-bold uppercase tracking-[0.18em] text-signal-deep">
            {eyebrow}
          </p>
        )}
        <Heading
          id={headingId}
          className={cn(
            "font-display font-bold text-ink",
            headingLevel === 3 ? "text-xl" : "text-2xl sm:text-3xl",
            eyebrow && "mt-2",
          )}
        >
          {title}
        </Heading>
        {description && <div className="mt-3 max-w-3xl text-ink-soft">{description}</div>}
      </div>
      {aside}
    </div>
  );

  const body = (
    <>
      {header}
      <div className="mt-6">{children}</div>
    </>
  );

  if (card) {
    return (
      <Card as="section" panel padding="lg" className={className} aria-labelledby={headingId}>
        {body}
      </Card>
    );
  }

  return (
    <section aria-labelledby={headingId} className={className}>
      {body}
    </section>
  );
}
