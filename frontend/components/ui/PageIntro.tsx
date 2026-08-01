import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface PageIntroProps {
  /** Small uppercase line above the title. */
  eyebrow?: string;
  title: ReactNode;
  /** The standfirst paragraph. */
  lede?: ReactNode;
  /** Buttons, notes, anything under the lede. */
  children?: ReactNode;
  className?: string;
}

/**
 * The `<h1>` block at the top of a page.
 *
 * Every page had its own version of this with a different type scale — 3xl on
 * events, 4xl on donate, 5xl on stories — so the site read as five sites.
 */
export function PageIntro({ eyebrow, title, lede, children, className }: PageIntroProps) {
  return (
    <div className={cn("max-w-3xl", className)}>
      {eyebrow && (
        <p className="font-display text-sm font-bold uppercase tracking-[0.18em] text-signal-deep">
          {eyebrow}
        </p>
      )}
      <h1 className="mt-4 font-display text-4xl font-bold leading-[1.1] text-ink sm:text-6xl">
        {title}
      </h1>
      {lede && <p className="mt-6 text-xl leading-8 text-ink-soft">{lede}</p>}
      {children}
    </div>
  );
}
