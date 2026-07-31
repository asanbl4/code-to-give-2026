"use client";

import { useMemo, useState, type JSX } from "react";

import { buildGoogleCalendarUrl, buildIcsFile } from "./calendar";
import { EventSignupForm } from "./event-signup-form";
import type { EventSession, EventSignupResult } from "./events.types";

function formatSubmittedAt(submittedAt: string): string {
  return new Intl.DateTimeFormat("en-HK", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Hong_Kong",
  }).format(new Date(submittedAt));
}

export function EventSignupFlow({ session }: { session: EventSession }): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [result, setResult] = useState<EventSignupResult | null>(null);
  const googleUrl = useMemo(() => buildGoogleCalendarUrl(session), [session]);
  const icsFile = useMemo(() => buildIcsFile(session), [session]);

  function handleSuccess(nextResult: EventSignupResult): void {
    setResult(nextResult);
    setIsOpen(true);
  }

  function downloadIcs(): void {
    const blob = new Blob([icsFile.content], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = icsFile.filename;
    link.click();

    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  if (result) {
    return (
      <section className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50/80 p-5 ring-1 ring-emerald-950/5 sm:p-6">
        <p className="text-sm font-medium uppercase tracking-[0.22em] text-emerald-700">
          Signup confirmed
        </p>
        <h3 className="mt-3 text-xl font-semibold text-slate-950">You are signed up</h3>
        <p className="mt-2 text-sm leading-6 text-slate-700 sm:text-base">
          We&apos;ve saved your spot for {session.title}. Your confirmation reference is{" "}
          <span className="font-semibold text-slate-900">{result.confirmationId}</span>.
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Submitted on {formatSubmittedAt(result.submittedAt)}.
        </p>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <a
            href={googleUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Add to Google Calendar
          </a>
          <button
            type="button"
            onClick={downloadIcs}
            className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Download .ics
          </button>
          <button
            type="button"
            onClick={() => {
              setResult(null);
              setIsOpen(false);
            }}
            className="inline-flex items-center justify-center rounded-full px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-white/70 hover:text-slate-900"
          >
            Browse sessions again
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-6">
      {isOpen ? (
        <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5 ring-1 ring-slate-950/5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Sign up for this session</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Share your details and we&apos;ll prepare your mock confirmation right away.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-white hover:text-slate-900"
            >
              Not now
            </button>
          </div>

          <div className="mt-5">
            <EventSignupForm session={session} onSuccess={handleSuccess} />
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center justify-center rounded-full bg-sky-100 px-5 py-3 text-sm font-medium text-sky-950 transition hover:bg-sky-200"
        >
          Sign up
        </button>
      )}
    </section>
  );
}
