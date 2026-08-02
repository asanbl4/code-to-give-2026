"use client";

import { useId, useState } from "react";
import { Button, Card, ProgressBar } from "@/components/ui";
import { formatHkd } from "@/lib/format";
import { communityGoalWidgetContent } from "../data";

/**
 * The floating "community goal" card pinned to the bottom of the landing page.
 * Minimisable, because a fixed panel that cannot be dismissed is a trap on a
 * small screen.
 *
 * This card used to share the corner with the chat launcher and published its
 * own height as `--corner-stack` so the launcher could sit above it. The
 * assistant moved into the mascot's header overlay, so it has the corner to
 * itself and that measurement machinery is gone. Anything new that floats here
 * needs to negotiate with this card again.
 */
export function CommunityGoalWidget() {
  const [isMinimized, setIsMinimized] = useState(true);
  const titleId = useId();
  const content = communityGoalWidgetContent;

  return (
    <aside className="fixed inset-x-4 bottom-4 z-50 sm:inset-x-auto sm:right-6 sm:bottom-6">
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

          <Button href="/donate" variant="donate" block className="mt-5">
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
