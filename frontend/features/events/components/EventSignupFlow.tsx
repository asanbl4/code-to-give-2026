"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card } from "@/components/ui";
import { track } from "@/features/analytics";
import { formatTimestamp } from "@/lib/format";
import { buildGoogleCalendarUrl, buildIcsFile } from "../calendar";
import type { EventSession, EventSignupResult } from "../types";
import { EventSignupForm } from "./EventSignupForm";

export function EventSignupFlow({ session }: { session: EventSession }) {
  const [isOpen, setIsOpen] = useState(false);
  const [result, setResult] = useState<EventSignupResult | null>(null);
  const successRef = useRef<HTMLDivElement | null>(null);
  const googleUrl = useMemo(() => buildGoogleCalendarUrl(session), [session]);
  const icsFile = useMemo(() => buildIcsFile(session), [session]);

  useEffect(() => {
    if (result) successRef.current?.focus();
  }, [result]);

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
      <Card
        as="section"
        tone="positive"
        className="mt-6 focus:outline-none"
        aria-labelledby={`event-signup-success-${session.id}`}
      >
        <div ref={successRef} tabIndex={-1} className="focus:outline-none">
          <p className="font-display text-sm font-bold uppercase tracking-[0.18em] text-positive">
            Signup confirmed
          </p>
          <h3
            id={`event-signup-success-${session.id}`}
            className="mt-3 font-display text-xl font-bold text-ink"
          >
            You are signed up
          </h3>
          <p className="mt-2 text-ink-soft">
            We&apos;ve saved your spot for {session.title}. Your confirmation reference is{" "}
            <span className="font-bold text-ink">{result.confirmationId}</span>.
          </p>
          <p className="mt-2 text-sm text-ink-soft">
            Submitted on {formatTimestamp(result.submittedAt)}.
          </p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button href={googleUrl} target="_blank" rel="noreferrer">
              Add to Google Calendar
            </Button>
            <Button variant="secondary" onClick={downloadIcs}>
              Download .ics
            </Button>
            <Button
              variant="quiet"
              onClick={() => {
                setResult(null);
                setIsOpen(false);
              }}
            >
              Browse sessions again
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  if (!isOpen) {
    return (
      <div className="mt-6">
        <Button
          onClick={() => {
            track("event_signup_started");
            setIsOpen(true);
          }}
        >
          Sign up
        </Button>
      </div>
    );
  }

  return (
    <Card tone="surface" className="mt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-display text-xl font-bold text-ink">Sign up for this session</h3>
          <p className="mt-2 text-ink-soft">
            Share your details and we&apos;ll prepare your mock confirmation right away.
          </p>
        </div>
        <Button variant="quiet" size="sm" onClick={() => setIsOpen(false)}>
          Not now
        </Button>
      </div>

      <div className="mt-5">
        <EventSignupForm session={session} onSuccess={setResult} />
      </div>
    </Card>
  );
}
