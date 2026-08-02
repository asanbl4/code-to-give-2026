"use client";

import { useCallback, useState } from "react";
import { Button, Card, SelectField, TextareaField } from "@/components/ui";
import {
  admin,
  type AdminVolunteerApplication,
  type VolunteerApplicationStatus,
} from "@/lib/admin";
import { formatTimestamp } from "@/lib/format";
import { useAdminData } from "../useAdminData";
import { AdminError } from "./AdminError";

const STATUS_OPTIONS: Array<{ value: VolunteerApplicationStatus; label: string }> = [
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under review" },
  { value: "account_pending", label: "Account pending" },
  { value: "onboarding", label: "Onboarding" },
  { value: "coach_assessment", label: "Coach assessment" },
  { value: "trial_pending", label: "Trial pending" },
  { value: "assistant_approved", label: "Assistant approved" },
  { value: "coach_approved", label: "Coach approved" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
];

function ApplicationCard({
  application,
  onChanged,
}: {
  application: AdminVolunteerApplication;
  onChanged: () => Promise<void>;
}) {
  const [status, setStatus] = useState(application.status);
  const [notes, setNotes] = useState(application.staff_notes);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function update(body: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    try {
      await admin.updateVolunteerApplication(application.application_id, body);
      await onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card as="article" padding="lg">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-signal-deep">
            {application.reference}
          </p>
          <h3 className="mt-1 font-display text-2xl font-bold text-ink">
            {application.full_name}
          </h3>
          <p className="mt-1 text-sm text-ink-soft">
            {application.email} · {application.phone}
          </p>
        </div>
        <p className="text-sm text-ink-soft">{formatTimestamp(application.submitted_at)}</p>
      </div>

      <dl className="mt-5 grid gap-3 rounded-card bg-surface p-4 sm:grid-cols-4">
        <div><dt className="text-sm text-ink-soft">Age</dt><dd className="font-bold text-ink">{application.age_group}</dd></div>
        <div><dt className="text-sm text-ink-soft">Role</dt><dd className="font-bold capitalize text-ink">{application.volunteer_role}</dd></div>
        <div><dt className="text-sm text-ink-soft">Interest</dt><dd className="font-bold capitalize text-ink">{application.interest}</dd></div>
        <div><dt className="text-sm text-ink-soft">Session</dt><dd className="font-bold text-ink">{application.session_id}</dd></div>
      </dl>

      {application.note && <p className="mt-4 text-sm leading-6 text-ink-soft">{application.note}</p>}

      <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <SelectField
          id={`status-${application.application_id}`}
          label="Workflow status"
          value={status}
          onChange={(event) => setStatus(event.target.value as VolunteerApplicationStatus)}
          disabled={saving}
        >
          {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </SelectField>
        <Button onClick={() => update({ status })} disabled={saving || status === application.status}>
          Update status
        </Button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" disabled={saving || application.receipt_status === "sent"} onClick={() => update({ receipt_status: "sent" })}>Mark receipt sent</Button>
        <Button variant="secondary" size="sm" disabled={saving || application.terms_acknowledged} onClick={() => update({ terms_acknowledged: true })}>Terms acknowledged</Button>
        <Button variant="secondary" size="sm" disabled={saving || application.identity_verified} onClick={() => update({ identity_verified: true })}>ID verified</Button>
        {application.age_group === "18-plus" ? (
          <Button variant="secondary" size="sm" disabled={saving || application.scrc_status === "verified"} onClick={() => update({ scrc_status: "verified" })}>SCRC verified</Button>
        ) : (
          <Button variant="secondary" size="sm" disabled={saving || application.guardian_documents_verified} onClick={() => update({ guardian_documents_verified: true })}>Guardian documents verified</Button>
        )}
        <Button variant="secondary" size="sm" disabled={saving || Boolean(application.account_invited_at)} onClick={() => update({ mark_account_invited: true })}>Mark account invite sent</Button>
        {application.volunteer_role === "coach" && (
          <Button variant="secondary" size="sm" disabled={saving || application.trial_status === "passed"} onClick={() => update({ trial_status: "passed" })}>Trial passed</Button>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
        <TextareaField id={`notes-${application.application_id}`} label="Private staff notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} fieldClassName="flex-1" disabled={saving} />
        <Button variant="quiet" onClick={() => update({ staff_notes: notes })} disabled={saving || notes === application.staff_notes}>Save notes</Button>
      </div>
      <AdminError message={error} className="mt-4" />
    </Card>
  );
}

export function VolunteerApplicationsWorkspace() {
  const load = useCallback(() => admin.listVolunteerApplications(), []);
  const { data, error, loading, refresh } = useAdminData(load, []);

  return (
    <section className="mt-8" aria-labelledby="volunteer-applications-heading">
      <h2 id="volunteer-applications-heading" className="font-display text-3xl font-bold text-ink">Volunteer applications</h2>
      <p className="mt-2 text-ink-soft">Review the private intake queue and record each onboarding checkpoint.</p>
      <AdminError message={error} className="mt-4" />
      <p aria-live="polite" className="mt-4 text-sm text-ink-soft">{loading ? "Loading applications…" : `${data.length} application${data.length === 1 ? "" : "s"}`}</p>
      {!loading && data.length === 0 && <Card className="mt-4"><p className="text-ink-soft">No volunteer applications yet.</p></Card>}
      <div className="mt-4 space-y-4">
        {data.map((application) => <ApplicationCard key={application.application_id} application={application} onChanged={refresh} />)}
      </div>
    </section>
  );
}
