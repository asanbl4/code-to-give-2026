import Link from "next/link";
import type { ReactElement } from "react";

import { eventSessions } from "./events.data";

function formatSessionLine(startsAt: string, location: string): string {
  const formatter = new Intl.DateTimeFormat("en-HK", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Hong_Kong",
  });

  return `${formatter.format(new Date(startsAt))} · ${location}`;
}

export function EventsTeaser(): ReactElement {
  const featuredSessions = eventSessions.slice(0, 3);

  return (
    <section className="mx-auto w-full max-w-5xl px-4 pb-12 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm shadow-slate-200/50 ring-1 ring-slate-950/5 sm:p-8">
        <div className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">
            Upcoming sessions
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            A few calm, friendly ways to get involved
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
            Browse the next sessions, then visit the events page when you are ready to register
            interest and add a session to your calendar.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {featuredSessions.map((session) => (
            <article
              key={session.id}
              className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 transition-colors hover:bg-white"
            >
              <h3 className="text-lg font-semibold tracking-tight text-slate-900">{session.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{session.summary}</p>
              <p className="mt-4 text-sm font-medium text-slate-700">
                {formatSessionLine(session.startsAt, session.location)}
              </p>
              <p className="mt-1 text-sm text-slate-500">{session.capacityLabel}</p>
            </article>
          ))}
        </div>

        <div className="mt-6">
          <Link
            href="/events"
            className="inline-flex items-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700"
          >
            View all sessions
          </Link>
        </div>
      </div>
    </section>
  );
}
