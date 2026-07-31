import type { EventSession } from "./events.types";
import type { ReactElement } from "react";

function formatDateRange(startsAt: string, endsAt: string): string {
  const formatter = new Intl.DateTimeFormat("en-HK", {
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Hong_Kong",
  });

  return `${formatter.format(new Date(startsAt))} to ${formatter.format(new Date(endsAt))}`;
}

export function EventsList({ sessions }: { sessions: EventSession[] }): ReactElement {
  return (
    <div className="grid gap-4">
      {sessions.map((session) => (
        <article
          key={session.id}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/50 ring-1 ring-slate-950/5 sm:p-7"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-xl font-semibold tracking-tight text-slate-900">{session.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">{session.summary}</p>
            </div>
            <p className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
              {session.capacityLabel}
            </p>
          </div>

          <dl className="mt-6 grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
            <div>
              <dt className="font-medium text-slate-900">When</dt>
              <dd className="mt-1 leading-6">
                {formatDateRange(session.startsAt, session.endsAt)}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Where</dt>
              <dd className="mt-1 leading-6">{session.location}</dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  );
}
