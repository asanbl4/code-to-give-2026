"use client";

import { useId, useState } from "react";

import {
  communityGoalWidgetContent,
  type CommunityGoalWidgetContent,
} from "./community-goal-widget.data";

function formatHkd(amount: number): string {
  return new Intl.NumberFormat("en-HK", {
    style: "currency",
    currency: "HKD",
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace("HK$", "HK$");
}

function getProgressPercent(content: CommunityGoalWidgetContent): number {
  if (content.amountGoalHkd <= 0) {
    return 0;
  }

  return Math.min(
    100,
    Math.round((content.amountRaisedHkd / content.amountGoalHkd) * 100),
  );
}

export function CommunityGoalWidget() {
  const [isMinimized, setIsMinimized] = useState(false);
  const titleId = useId();
  const progressLabelId = useId();
  const content = communityGoalWidgetContent;
  const progressPercent = getProgressPercent(content);

  if (isMinimized) {
    return (
      <div className="fixed inset-x-4 bottom-4 z-50 sm:inset-x-auto sm:right-6 sm:bottom-6">
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="ml-auto flex items-center gap-2 rounded-full border border-sky-200 bg-white/95 px-4 py-2 text-sm font-medium text-slate-800 shadow-lg shadow-sky-950/10 ring-1 ring-white/70 backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2"
          aria-label="Reopen community goal progress widget"
        >
          <span
            aria-hidden="true"
            className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"
          />
          Help fund 20 sessions
        </button>
      </div>
    );
  }

  return (
    <aside className="fixed inset-x-4 bottom-4 z-50 sm:inset-x-auto sm:right-6 sm:bottom-6">
      <section
        aria-labelledby={titleId}
        className="w-full max-w-sm rounded-[1.5rem] border border-sky-100 bg-white/95 p-5 text-slate-900 shadow-2xl shadow-sky-950/12 ring-1 ring-white/70 backdrop-blur"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
              {content.title}
            </p>
            <h2 id={titleId} className="text-lg font-semibold leading-tight text-slate-900">
              {content.monthlyGoalLabel}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2"
            aria-label="Minimize community goal progress widget"
          >
            <span aria-hidden="true" className="text-lg leading-none">
              −
            </span>
          </button>
        </div>

        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-base font-semibold text-slate-900">
              {formatHkd(content.amountRaisedHkd)} raised
            </p>
            <p className="text-sm text-slate-500">
              of {formatHkd(content.amountGoalHkd)}
            </p>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <p id={progressLabelId} className="font-medium text-slate-700">
                {progressPercent}% funded
              </p>
              <p className="text-slate-500">
                {content.sessionsSupported} sessions supported
              </p>
            </div>
            <div
              role="progressbar"
              aria-labelledby={progressLabelId}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPercent}
              className="h-3 overflow-hidden rounded-full bg-sky-100"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-700 via-sky-600 to-cyan-500 transition-[width]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-sm text-slate-600">
              {content.sessionsSupported} of {content.sessionsGoal} sports sessions supported so
              far.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-sky-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2"
          aria-label="Help complete the community goal"
        >
          {content.ctaLabel}
        </button>

        <p className="mt-3 text-sm text-slate-500" aria-live="polite">
          {content.socialProof}
        </p>
      </section>
    </aside>
  );
}
