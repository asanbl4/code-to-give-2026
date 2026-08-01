import type { ProfileActivity } from "../types";

interface RecentActivitySectionProps {
  activities: ReadonlyArray<ProfileActivity>;
}

export function RecentActivitySection({ activities }: RecentActivitySectionProps) {
  return (
    <section
      aria-labelledby="recent-activity-heading"
      className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <h2 id="recent-activity-heading" className="text-2xl font-semibold text-zinc-950">
        Recent activity
      </h2>
      <p className="mt-3 text-sm leading-6 text-zinc-600">
        Recent giving and volunteering activity linked to this supporter profile.
      </p>

      <ul className="mt-6 space-y-0">
        {activities.map((activity) => (
          <li key={activity.id} className="relative grid gap-3 border-l-2 border-zinc-200 pb-6 pl-6 last:pb-0">
            <span className="absolute -left-[9px] top-0 flex h-4 w-4 rounded-full bg-white ring-2 ring-zinc-300">
              <span
                className={`m-auto h-2 w-2 rounded-full ${
                  activity.kind === "donation" ? "bg-orange-500" : "bg-teal-600"
                }`}
              />
            </span>
            <article className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-600">
                    {activity.kind}
                  </p>
                  <h3 className="mt-2 font-semibold text-zinc-950">{activity.title}</h3>
                </div>
                <p className="text-sm font-medium text-zinc-600">{activity.dateLabel}</p>
              </div>
              <p className="mt-3 text-sm leading-6 text-zinc-600">{activity.description}</p>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
