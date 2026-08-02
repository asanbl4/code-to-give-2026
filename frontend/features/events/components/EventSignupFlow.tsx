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
    const isUnder18 = result.ageGroup !== "18-plus";
    const isCoach = result.volunteerRole === "coach";

    return (
      <Card
        as="section"
        tone="positive"
        className="mt-6"
        aria-labelledby={`event-signup-success-${session.id}`}
      >
        <div ref={successRef} tabIndex={-1}>
          <p className="font-display text-sm font-bold uppercase tracking-[0.18em] text-positive">
            Application received
          </p>
          <h3
            id={`event-signup-success-${session.id}`}
            className="mt-3 font-display text-xl font-bold text-ink"
          >
            Thank you for volunteering
          </h3>
          <p className="mt-2 text-ink-soft">
            Love 21 has received your application and noted your interest in {session.title}. Your application reference is{" "}
            <span className="font-bold text-ink">{result.applicationId}</span>.
          </p>
          <p className="mt-2 text-sm text-ink-soft">
            Your volunteer portal account is ready. Use the email and password you just created to follow this application.
          </p>
          <p className="mt-2 text-sm text-ink-soft">
            Submitted on {formatTimestamp(result.submittedAt)}.
          </p>

          <div className="mt-5 rounded-card border border-edge bg-paper p-4">
            <p className="font-bold text-ink">Your place is not confirmed yet</p>
            <p className="mt-2 text-sm leading-6 text-ink-soft">
              Your application is now in the Love 21 review queue. The Comms team reviews applications each Wednesday, and Love 21 aims to send account details within 14 working days.
            </p>
          </div>

          <ol className="mt-5 grid gap-3 sm:grid-cols-2">
            <li className="rounded-card bg-surface p-4">
              <p className="font-bold text-ink">1. Keep your reference</p>
              <p className="mt-1 text-sm leading-6 text-ink-soft">Use the reference above if you need to contact Love 21 about your application.</p>
            </li>
            <li className="rounded-card bg-surface p-4">
              <p className="font-bold text-ink">2. Wait for team review</p>
              <p className="mt-1 text-sm leading-6 text-ink-soft">Comms shares suitable applications with Admin and Programme teams.</p>
            </li>
            <li className="rounded-card bg-surface p-4">
              <p className="font-bold text-ink">3. Complete onboarding</p>
              <p className="mt-1 text-sm leading-6 text-ink-soft">Use your account to read and acknowledge the terms, rules, and regulations.</p>
            </li>
            <li className="rounded-card bg-surface p-4">
              <p className="font-bold text-ink">4. Get approval before booking</p>
              <p className="mt-1 text-sm leading-6 text-ink-soft">You can preview classes first; class signup opens after the required checks are complete.</p>
            </li>
          </ol>

          <div className="mt-5 rounded-card bg-highlight-soft p-4 text-sm leading-6 text-ink">
            <p className="font-bold">Next steps for your application</p>
            {isCoach ? (
              <p className="mt-2">
                The Programme team will contact you within 14 working days for a suitability check. Suitable Coach applicants complete a trial class before official sessions
                {isUnder18
                  ? ", and a guardian or school teacher must attend your first three classes."
                  : " and you must provide an SCRC, physical form, and photo ID before official classes begin."}
              </p>
            ) : (
              <p className="mt-2">
                {isUnder18
                  ? "A parent or guardian must attend before your first session to complete the physical consent documents and ID verification."
                  : "You must provide an SCRC, physical form, and photo ID before joining a class."}
              </p>
            )}
          </div>

          <div className="mt-6 border-t border-edge pt-5">
            <p className="font-bold text-ink">Save a reminder</p>
            <p className="mt-1 text-sm leading-6 text-ink-soft">
              Adding {session.title} to your calendar is only a personal reminder. It does not reserve a volunteer place.
            </p>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button href="/volunteer">
              Open volunteer portal
            </Button>
            <Button href={googleUrl} target="_blank" rel="noreferrer">
              Save to Google Calendar
            </Button>
            <Button variant="secondary" onClick={downloadIcs}>
              Download calendar reminder
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
          Apply to volunteer
        </Button>
      </div>
    );
  }

  return (
    <Card tone="surface" className="mt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-display text-xl font-bold text-ink">Volunteer application</h3>
          <p className="mt-2 text-ink-soft">
            Tell Love 21 about yourself and which role interests you. Choosing this session records your interest but does not reserve a place.
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
