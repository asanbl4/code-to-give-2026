import type { NextMilestone as NextMilestoneData } from "../types";

interface NextMilestoneProps {
  milestone: NextMilestoneData;
}

export function NextMilestone({ milestone }: NextMilestoneProps) {
  return (
    <aside
      aria-labelledby="next-milestone-heading"
      className="rounded-[2rem] border border-purple-100 bg-gradient-to-br from-purple-50 to-white p-5 shadow-sm sm:p-6"
    >
      <div className="flex items-start gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-purple-800 shadow-sm ring-1 ring-purple-100">
          <svg aria-hidden="true" viewBox="0 0 32 32" className="h-9 w-9">
            <path fill="currentColor" d="M16 3 7 7v8c0 6 3.7 11 9 13 5.3-2 9-7 9-13V7l-9-4Z" opacity="0.18" />
            <path fill="currentColor" d="M16 7 10 9.5V15c0 4 2.4 7.4 6 9 3.6-1.6 6-5 6-9V9.5L16 7Zm0 4 1.5 3 3.3.5-2.4 2.3.6 3.2-3-1.6-3 1.6.6-3.2-2.4-2.3 3.3-.5L16 11Z" />
          </svg>
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-800">
            Demonstration next milestone
          </p>
          <h2 id="next-milestone-heading" className="mt-2 text-xl font-semibold text-zinc-950">
            {milestone.label}
          </h2>
        </div>
      </div>
      <div className="mt-5" aria-label={milestone.progressLabel}>
        <div className="flex justify-between gap-3 text-sm font-medium text-zinc-700">
          <span>{milestone.progressLabel}</span>
          <span>Demo only</span>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-white ring-1 ring-purple-100">
          <div className="h-3 w-[90%] rounded-full bg-purple-600" />
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-zinc-600">{milestone.encouragement}</p>
    </aside>
  );
}
