import type { SupporterBadge } from "../types";

interface MilestonesSectionProps {
  badges: ReadonlyArray<SupporterBadge>;
}

function getBadgeClasses(tone: SupporterBadge["tone"]): string {
  if (tone === "volunteer") {
    return "border-teal-200 bg-teal-50 text-teal-900";
  }
  if (tone === "community") {
    return "border-purple-200 bg-purple-50 text-purple-900";
  }
  return "border-orange-200 bg-orange-50 text-orange-900";
}

export function MilestonesSection({ badges }: MilestonesSectionProps) {
  return (
    <section
      aria-labelledby="milestones-heading"
      className="rounded-[2rem] border border-purple-100 bg-white p-6 shadow-sm sm:p-8"
    >
      <h2 id="milestones-heading" className="text-2xl font-semibold text-zinc-950">
        Milestones and badges
      </h2>
      <p className="mt-3 text-sm leading-6 text-zinc-600">
        Badges recognise participation. They do not rank supporters by wealth or
        suggest that larger donors are better people.
      </p>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {badges.map((badge) => (
          <li key={badge.id} className={`rounded-2xl border p-4 ${getBadgeClasses(badge.tone)}`}>
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/80">
                <svg aria-hidden="true" viewBox="0 0 32 32" className="h-8 w-8">
                  <path fill="currentColor" d="M16 2 6 6v8c0 6.5 4.2 12.4 10 14 5.8-1.6 10-7.5 10-14V6L16 2Z" opacity="0.22" />
                  <path fill="currentColor" d="M16 6 9 8.8V14c0 4.5 2.8 8.5 7 10 4.2-1.5 7-5.5 7-10V8.8L16 6Zm0 5 1.4 2.8 3.1.5-2.3 2.2.6 3.1-2.8-1.5-2.8 1.5.6-3.1-2.3-2.2 3.1-.5L16 11Z" />
                </svg>
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em]">Earned badge</p>
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
