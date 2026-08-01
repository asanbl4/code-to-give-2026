"use client";

import { useId, useState } from "react";
import { Button, Card, Tag, TextField, TextareaField, Toggle } from "@/components/ui";
import { admin, type AdminParticipant } from "@/lib/admin";
import { useAsyncAction } from "../useAsyncAction";
import { AdminError } from "./AdminError";
import { InlineText } from "./InlineText";

interface SectionProps {
  participants: AdminParticipant[];
  onChanged: () => Promise<void>;
}

export function MembersSection({ participants, onChanged }: SectionProps) {
  const [adding, setAdding] = useState(false);

  return (
    <section className="mt-14" aria-labelledby="admin-members">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="admin-members" className="font-display text-2xl font-bold text-ink">
          Members
        </h2>
        <Button variant="quiet" size="sm" onClick={() => setAdding((open) => !open)}>
          {adding ? "Cancel" : "Add a member"}
        </Button>
      </div>

      {adding && (
        <AddMemberForm
          onCreated={async () => {
            setAdding(false);
            await onChanged();
          }}
        />
      )}

      {participants.length === 0 && !adding && (
        <p className="mt-4 text-ink-soft">No members yet. Add the first one.</p>
      )}

      <ul className="mt-6 space-y-4">
        {participants.map((person) => (
          <li key={person.id}>
            <MemberRow person={person} onChanged={onChanged} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function AddMemberForm({ onCreated }: { onCreated: () => Promise<void> }) {
  const id = useId();
  const { busy, error, run } = useAsyncAction();

  return (
    <Card
      as="form"
      tone="surface"
      padding="lg"
      className="mt-4 grid gap-3 sm:grid-cols-2"
      onSubmit={async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const ok = await run(() =>
          admin.createParticipant({
            slug: String(data.get("slug")),
            first_name: String(data.get("first_name")),
            last_name: String(data.get("last_name")) || null,
            headline: String(data.get("headline")) || null,
            progress_summary: String(data.get("progress_summary")) || null,
            story: String(data.get("story")) || null,
          }),
        );
        if (ok) await onCreated();
      }}
    >
      <TextField id={`${id}-first`} name="first_name" label="First name" required />
      <TextField id={`${id}-last`} name="last_name" label="Last name" />
      <TextField
        id={`${id}-slug`}
        name="slug"
        label="Web address (lowercase, dashes)"
        placeholder="maria-k"
        required
      />
      <TextField id={`${id}-headline`} name="headline" label="One line for the photo popup" />
      <TextField
        id={`${id}-progress`}
        name="progress_summary"
        label="Their progress"
        fieldClassName="sm:col-span-2"
      />
      <TextareaField
        id={`${id}-story`}
        name="story"
        label="Full story"
        rows={5}
        fieldClassName="sm:col-span-2"
      />
      <AdminError message={error} className="sm:col-span-2" />
      <Button type="submit" disabled={busy} block className="sm:col-span-2">
        {busy ? "Saving…" : "Add member"}
      </Button>
    </Card>
  );
}

function MemberRow({
  person,
  onChanged,
}: {
  person: AdminParticipant;
  onChanged: () => Promise<void>;
}) {
  const { busy, error, run } = useAsyncAction();

  const patch = async (body: Record<string, unknown>) => {
    if (await run(() => admin.updateParticipant(person.id, body))) await onChanged();
  };

  return (
    <Card as="article" tone="surface" padding="lg">
      <div className="flex flex-wrap items-center gap-3">
        {person.avatar_url && (
          /* eslint-disable-next-line @next/next/no-img-element -- expiring signed URL */
          <img src={person.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
        )}
        <h3 className="font-display text-xl font-bold text-ink">{person.name}</h3>
        <Tag tone={person.is_published ? "positive" : "quiet"}>
          {person.is_published ? "On the website" : "Not published"}
        </Tag>
        <Tag tone={person.enrolled_faces > 0 ? "positive" : "quiet"}>
          {person.enrolled_faces > 0
            ? `${person.enrolled_faces} face${person.enrolled_faces > 1 ? "s" : ""} enrolled`
            : "No face enrolled"}
        </Tag>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Toggle
          checked={person.consent_given}
          disabled={busy}
          onChange={(checked) => patch({ consent_given: checked })}
          label="Consent to publish their story"
          hint={
            person.consented_at
              ? `Recorded ${new Date(person.consented_at).toLocaleDateString()}`
              : "From their signed media-release form"
          }
        />
        <Toggle
          checked={person.consent_face_recognition}
          disabled={busy}
          onChange={(checked) => patch({ consent_face_recognition: checked })}
          label="Consent to face recognition"
          hint="Turning this off deletes their stored face data"
        />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <InlineText
          label="Consent form reference"
          value={person.consent_form_reference}
          disabled={busy}
          onSave={(value) => patch({ consent_form_reference: value })}
        />
        <InlineText
          label="Confirmed by (your name)"
          value={person.consent_recorded_by}
          disabled={busy}
          onSave={(value) => patch({ consent_recorded_by: value })}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          size="sm"
          disabled={busy || !person.consent_given}
          onClick={() => patch({ is_published: !person.is_published })}
        >
          {person.is_published ? "Take off the website" : "Publish to the website"}
        </Button>
        {/* Consent before publication is enforced in Postgres too; this is the
            explanation, not the safeguard. */}
        {!person.consent_given && (
          <span className="text-sm text-ink-soft">Record consent before publishing.</span>
        )}
        <EnrollButton person={person} onChanged={onChanged} />
      </div>

      <AdminError message={error} className="mt-3" />
    </Card>
  );
}

function EnrollButton({
  person,
  onChanged,
}: {
  person: AdminParticipant;
  onChanged: () => Promise<void>;
}) {
  const { busy, error, run } = useAsyncAction();
  const enabled = person.consent_face_recognition && !busy;

  return (
    <span>
      <label
        className={`inline-flex min-h-11 items-center rounded-full border-2 border-signal px-4 font-bold text-signal ${
          enabled ? "cursor-pointer hover:bg-surface" : "opacity-45"
        }`}
      >
        {busy ? "Reading photo…" : "Add a photo of them"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          disabled={!enabled}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            if (await run(() => admin.enrollFace(person.id, file))) await onChanged();
          }}
        />
      </label>
      <AdminError message={error} className="mt-2" />
    </span>
  );
}
