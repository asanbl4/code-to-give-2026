"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, ProgressBar, Tag } from "@/components/ui";
import { formatTimestamp } from "@/lib/format";
import {
  listMyVolunteerApplications,
  VolunteerPortalError,
  type VolunteerApplication,
  type VolunteerApplicationStatus,
} from "@/lib/volunteer";

const STATUS_COPY: Record<
  VolunteerApplicationStatus,
  { label: string; description: string; tone: "signal" | "quiet" | "warn" | "positive" | "danger" }
> = {
  submitted: { label: "Submitted", description: "Love 21 has received your application.", tone: "quiet" },
  under_review: { label: "Under review", description: "The team is reviewing your eligibility and preferred session.", tone: "signal" },
  account_pending: { label: "Account ready", description: "Your portal account is linked and onboarding checks can begin.", tone: "signal" },
  onboarding: { label: "Onboarding", description: "Complete the requested documents and acknowledgements.", tone: "warn" },
  assistant_approved: { label: "Approved as assistant", description: "Your assistant onboarding is approved.", tone: "positive" },
  coach_assessment: { label: "Coach assessment", description: "The programme team is assessing coach suitability.", tone: "warn" },
  trial_pending: { label: "Trial pending", description: "Complete the supervised trial arranged by the programme team.", tone: "warn" },
  coach_approved: { label: "Approved as coach", description: "Your coach onboarding is approved.", tone: "positive" },
  rejected: { label: "Not progressing", description: "Love 21 will contact you with more information.", tone: "danger" },
  withdrawn: { label: "Withdrawn", description: "This application is no longer active.", tone: "quiet" },
};

function ApplicationProgress({ application }: { application: VolunteerApplication }) {
  const documentCheck =
    application.age_group === "18-plus"
      ? { label: "SCRC verified", done: application.scrc_status === "verified" }
      : { label: "Guardian documents verified", done: application.guardian_documents_verified };
  const checks = [
    { label: "Application received", done: true },
    { label: "Receipt sent", done: application.receipt_status === "sent" },
    { label: "Identity verified", done: application.identity_verified },
    documentCheck,
    { label: "Terms acknowledged", done: application.terms_acknowledged },
    ...(application.volunteer_role === "coach"
      ? [{ label: "Coach trial passed", done: application.trial_status === "passed" }]
      : []),
  ];
  const complete = checks.filter((check) => check.done).length;
  const status = STATUS_COPY[application.status];

  return (
    <Card as="article" panel padding="lg">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.15em] text-signal-deep">
            {application.reference}
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold text-ink">
            {application.session_id.replaceAll("-", " ")}
          </h2>
        </div>
        <Tag tone={status.tone}>{status.label}</Tag>
      </div>

      <p className="mt-5 text-lg leading-7 text-ink">{status.description}</p>
      <p className="mt-2 text-sm text-ink-soft">Last updated {formatTimestamp(application.updated_at)}</p>

      <ProgressBar
        className="mt-6"
        value={complete}
        max={checks.length}
        label="Onboarding progress"
        hint={`${complete} of ${checks.length} checkpoints complete`}
        tone={complete === checks.length ? "positive" : "signal"}
      />

      <ol className="mt-6 grid gap-3 sm:grid-cols-2">
        {checks.map((check, index) => (
          <li key={check.label} className="flex items-center gap-3 rounded-card bg-surface p-4">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                check.done ? "bg-positive text-white" : "bg-surface-deep text-ink-soft"
              }`}
            >
              {check.done ? "Done" : index + 1}
            </span>
            <span className={check.done ? "font-bold text-ink" : "text-ink-soft"}>{check.label}</span>
          </li>
        ))}
      </ol>

      <dl className="mt-6 grid gap-4 border-t border-edge pt-5 sm:grid-cols-3">
        <div><dt className="text-sm text-ink-soft">Role</dt><dd className="font-bold capitalize text-ink">{application.volunteer_role}</dd></div>
        <div><dt className="text-sm text-ink-soft">Interest</dt><dd className="font-bold capitalize text-ink">{application.interest}</dd></div>
        <div><dt className="text-sm text-ink-soft">Submitted</dt><dd className="font-bold text-ink">{formatTimestamp(application.submitted_at)}</dd></div>
      </dl>
    </Card>
  );
}

export function VolunteerDashboard() {
  const router = useRouter();
  const [applications, setApplications] = useState<VolunteerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleFailure = useCallback(
    (cause: unknown) => {
      if (cause instanceof VolunteerPortalError && cause.status === 401) {
        router.push("/volunteer/login");
        router.refresh();
        return;
      }
      setError(cause instanceof Error ? cause.message : String(cause));
      setLoading(false);
    },
    [router],
  );

  const refresh = useCallback(
    () =>
      listMyVolunteerApplications().then((next) => {
        setApplications(next);
        setError(null);
        setLoading(false);
      }, handleFailure),
    [handleFailure],
  );

  useEffect(() => {
    let cancelled = false;
    listMyVolunteerApplications().then(
      (next) => {
        if (cancelled) return;
        setApplications(next);
        setError(null);
        setLoading(false);
      },
      (cause) => {
        if (!cancelled) handleFailure(cause);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [handleFailure]);

  if (loading) {
    return <Card className="mt-8"><p className="text-ink-soft">Loading your applications…</p></Card>;
  }

  if (error) {
    return (
      <Card tone="danger" className="mt-8">
        <p className="font-bold text-danger">{error}</p>
        <Button variant="secondary" className="mt-4" onClick={refresh}>Try again</Button>
      </Card>
    );
  }

  if (applications.length === 0) {
    return (
      <Card className="mt-8">
        <h2 className="font-display text-2xl font-bold text-ink">No linked application yet</h2>
        <p className="mt-3 leading-7 text-ink-soft">
          Sign in with the same email used on your application. If it still does not appear, ask Love 21 to send your portal invitation.
        </p>
        <Button href="/events" variant="secondary" className="mt-5">Browse volunteer sessions</Button>
      </Card>
    );
  }

  return (
    <div className="mt-8 space-y-5">
      <div className="flex justify-end">
        <Button variant="quiet" size="sm" onClick={refresh}>Refresh status</Button>
      </div>
      {applications.map((application) => (
        <ApplicationProgress key={application.application_id} application={application} />
      ))}
    </div>
  );
}
