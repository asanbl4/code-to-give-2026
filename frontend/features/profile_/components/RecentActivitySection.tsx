import type { ProfileActivity } from "../types";

interface RecentActivitySectionProps {
  activities: ReadonlyArray<ProfileActivity>;
}

export function RecentActivitySection({ activities }: RecentActivitySectionProps) {
  return (
    <section
      aria-labelledby="recent-activity-heading"
      className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <h2 id="recent-activity-heading" className="text-2xl font-semibold text-zinc-950">
        Recent activity
      </h2>
      <p className="mt-3 text-sm leading-6 text-zinc-600">
        Recent giving and volunteering activity linked to this supporter profile.
      </p>

      <ul className="mt-6 space-y-0">
        {activities.map((activity) => (
          <li key={activity.id} className="relative grid gap-3 border-l-2 border-zinc-200 pb-5 pl-7 last:pb-0">
            <span className={`absolute -left-[17px] top-0 flex h-8 w-8 rounded-full bg-white ring-2 ${
              activity.kind === "donation" ? "text-orange-700 ring-orange-200" : "text-teal-700 ring-teal-200"
            }`}>
              <svg aria-hidden="true" viewBox="0 0 24 24" className="m-auto h-4 w-4">
                {activity.kind === "donation" ? (
                  <path fill="currentColor" d="M12 21s-7-4.4-9.2-8.6C.9 8.8 3.3 5 7.2 5c2 0 3.6 1 4.8 2.5C13.2 6 14.8 5 16.8 5c3.9 0 6.3 3.8 4.4 7.4C19 16.6 12 21 12 21Z" />
                ) : (
                  <path fill="currentColor" d="M12 4a4 4 0 0 1 4 4v2h1a3 3 0 0 1 3 3v6h-2v-6a1 1 0 0 0-1-1h-1v2h-2V8a2 2 0 0 0-4 0v6H8v-2H7a1 1 0 0 0-1 1v6H4v-6a3 3 0 0 1 3-3h1V8a4 4 0 0 1 4-4Z" />
                )}
              </svg>
            </span>
            <article className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 transition duration-200 hover:bg-white hover:shadow-sm motion-reduce:transition-none">
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
