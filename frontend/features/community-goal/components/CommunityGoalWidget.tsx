"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button, Card, ProgressBar } from "@/components/ui";
import { formatHkd } from "@/lib/format";
import { communityGoalWidgetContent } from "../data";

/** Breathing room between this card and whatever stacks on top of it. */
const STACK_GAP_PX = 12;

/**
 * The floating "community goal" card pinned to the bottom of the landing page.
 * Minimisable, because a fixed panel that cannot be dismissed is a trap on a
 * small screen.
 *
 * This card shares the bottom-right corner with the chat launcher, which lives
 * in the root layout and knows nothing about this page. So rather than the two
 * hard-coding offsets against each other, this one publishes the space it
 * occupies as `--corner-stack` on <html> and the launcher sits above it. The
 * measurement is live, so minimising the card drops the launcher back down
 * instead of leaving it floating over nothing.
 */
export function CommunityGoalWidget() {
  const [isMinimized, setIsMinimized] = useState(false);
  const titleId = useId();
  const content = communityGoalWidgetContent;
  const shellRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = shellRef.current;
    if (!node) return;

    const root = document.documentElement;
    const publish = () =>
      root.style.setProperty("--corner-stack", `${node.offsetHeight + STACK_GAP_PX}px`);

    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(node);

    return () => {
      observer.disconnect();
      // Leave nothing behind: every other route wants the launcher in the corner.
      root.style.removeProperty("--corner-stack");
    };
  }, []);

  return (
    <aside
      ref={shellRef}
      className="fixed inset-x-4 bottom-4 z-50 sm:inset-x-auto sm:right-6 sm:bottom-6"
    >
      {isMinimized ? (
        <Button
          variant="secondary"
          className="ml-auto shadow-lift"
          onClick={() => setIsMinimized(false)}
          aria-label="Reopen community goal progress widget"
        >
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-positive" />
          Help fund 20 sessions
        </Button>
      ) : (
        <Card
          as="section"
          className="w-full max-w-sm shadow-lift"
          aria-labelledby={titleId}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-display text-sm font-bold uppercase tracking-[0.18em] text-signal-deep">
                {content.title}
              </p>
              <h2
                id={titleId}
                className="mt-1 font-display text-lg font-bold leading-tight text-ink"
              >
                {content.monthlyGoalLabel}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              aria-label="Minimize community goal progress widget"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-edge text-ink-soft hover:border-signal hover:text-ink"
            >
              <span aria-hidden="true" className="text-xl leading-none">
                −
              </span>
            </button>
          </div>

          <div className="mt-5 rounded-card bg-surface p-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-bold text-ink">{formatHkd(content.amountRaisedHkd)} raised</p>
              <p className="text-sm text-ink-soft">of {formatHkd(content.amountGoalHkd)}</p>
            </div>

            <ProgressBar
              className="mt-4"
              value={content.amountRaisedHkd}
              max={content.amountGoalHkd}
              label="Monthly funding goal"
              hint={`${content.sessionsSupported} sessions supported`}
            />

            <p className="mt-2 text-sm text-ink-soft">
              {content.sessionsSupported} of {content.sessionsGoal} sports sessions supported so
              far.
            </p>
          </div>

          <Button href="/donate" block className="mt-5">
            {content.ctaLabel}
          </Button>

          <p className="mt-3 text-sm text-ink-soft" aria-live="polite">
            {content.socialProof}
          </p>
        </Card>
      )}
    </aside>
  );
}
