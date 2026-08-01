import { eventSessions } from "./events.data";
import { EventsList } from "./events-list";
import type { ReactElement } from "react";

export default function EventsPage(): ReactElement {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_36%,#f8fafc_100%)] py-10 sm:py-14">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">
            Events
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            Join an upcoming session
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
            Register your interest and add the session to your calendar right away.
          </p>
        </div>

        <EventsList sessions={eventSessions} />
      </section>
    </main>
  );
}
