import type { SupporterBadge } from "../types";

interface MilestonesSectionProps {
  badges: ReadonlyArray<SupporterBadge>;
}

function getBadgeClasses(tone: SupporterBadge["tone"]): string {
  if (tone === "volunteer") {
    return "border-positive/40 bg-positive-soft text-positive";
  }
  if (tone === "community") {
    return "border-highlight/60 bg-highlight-soft text-ink";
  }
  return "border-signal/25 bg-signal-soft text-signal-deep";
}

function getBadgePath(tone: SupporterBadge["tone"]): string {
  if (tone === "volunteer") {
    return "M16 4a5 5 0 0 1 5 5v2h1a4 4 0 0 1 4 4v9h-3v-9a1 1 0 0 0-1-1h-1v3h-3V9a2 2 0 0 0-4 0v8h-3v-3h-1a1 1 0 0 0-1 1v9H6v-9a4 4 0 0 1 4-4h1V9a5 5 0 0 1 5-5Z";
  }
  if (tone === "community") {
    return "M16 4 6 8v7c0 6 4.2 11.2 10 13 5.8-1.8 10-7 10-13V8L16 4Zm-4 12a4 4 0 1 1 8 0v1h1a3 3 0 0 1 3 3v2h-3v-2h-10v2H8v-2a3 3 0 0 1 3-3h1v-1Zm4-2a2 2 0 0 0-2 2v1h4v-1a2 2 0 0 0-2-2Z";
  }
  return "M16 4 6 8v7c0 6 4.2 11.2 10 13 5.8-1.8 10-7 10-13V8L16 4Zm0 7c2-3 7-1.8 7 2.2 0 4.6-7 8.2-7 8.2s-7-3.6-7-8.2C9 9.2 14 8 16 11Z";
}

export function MilestonesSection({ badges }: MilestonesSectionProps) {
  return (
    <section
      aria-labelledby="milestones-heading"
      className="rounded-[2rem] border border-highlight/40 bg-paper p-5 shadow-sm sm:p-6"
    >
      <h2 id="milestones-heading" className="text-2xl font-semibold text-ink">
        Milestones and badges
      </h2>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {badges.map((badge) => (
          <li
            key={badge.id}
            aria-label={`${badge.label}, earned badge. ${badge.description}`}
            className={`rounded-2xl border p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-sm motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${getBadgeClasses(badge.tone)}`}
          >
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-paper/80">
                <svg aria-hidden="true" viewBox="0 0 32 32" className="h-8 w-8">
                  <path fill="currentColor" d={getBadgePath(badge.tone)} />
                </svg>
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em]">
                  Earned badge
                </p>
                <h3 className="mt-2 font-semibold">{badge.label}</h3>
              </div>
            </div>
            <p className="mt-2 text-sm leading-6">{badge.description}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
