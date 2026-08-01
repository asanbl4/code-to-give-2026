"use client";

import { useId, useState } from "react";
import { Button, Dialog, TextField, TextareaField, Toggle } from "@/components/ui";
import { admin, type AdminParticipant } from "@/lib/admin";
import { useAsyncAction } from "../useAsyncAction";
import { AdminError } from "./AdminError";

interface MemberDialogProps {
  open: boolean;
  onClose: () => void;
  /** Editing an existing member, or null to add a new one. */
  member?: AdminParticipant | null;
  /** Pre-fills the first name when created from a face in a group photo. */
  initialFirstName?: string;
  /** Called after a successful save; receives the member that now exists. */
  onSaved: (member: AdminParticipant) => Promise<void>;
}

/**
 * Add or edit a member: their name, their two stories, their portrait.
 *
 * The form asks for four things and a photo. It used to ask for a URL slug as
 * well, which required a charity worker to know what one is — the server
 * derives it from the name now.
 *
 * The portrait is not just an avatar: it teaches the matcher who this person is,
 * so their face is suggested automatically in group photos. That is biometric
 * processing, which is why the checkbox beside it is required before the file
 * input does anything, and why it is only required when there *is* a file.
 * Recording a consent for someone with no photo would be recording a consent
 * nobody gave.
 */
export function MemberDialog({
  open,
  onClose,
  member = null,
  initialFirstName,
  onSaved,
}: MemberDialogProps) {
  // Owned here rather than in the form so the dialog can refuse to close on
  // Escape while a save is in flight.
  const action = useAsyncAction();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      busy={action.busy}
      title={member ? `Edit ${member.name}` : "Add a member"}
      description={
        member
          ? "Their web address stays the same, so any link already shared keeps working."
          : "Consent to publish is recorded separately, once they are added."
      }
    >
      {/* Keyed so switching from "add" to "edit" — which happens when a photo
          is refused after the member was created — rebuilds the form around
          the member that now exists. */}
      <MemberForm
        key={member?.id ?? "new"}
        member={member}
        initialFirstName={initialFirstName}
        onClose={onClose}
        onSaved={onSaved}
        action={action}
      />
    </Dialog>
  );
}

function MemberForm({
  member,
  initialFirstName,
  onClose,
  onSaved,
  action,
}: {
  member: AdminParticipant | null;
  initialFirstName?: string;
  onClose: () => void;
  onSaved: (member: AdminParticipant) => Promise<void>;
  action: ReturnType<typeof useAsyncAction>;
}) {
  const id = useId();
  const { busy, error, run } = action;
  const [file, setFile] = useState<File | null>(null);
  // Already recorded, so there is nothing to ask here. Withdrawing it erases
  // their stored face data, which is not a thing to do from a form about names
  // and stories — the Consent dialog owns that, with the warning.
  const consentRecorded = member?.consent_face_recognition ?? false;
  const [faceConsent, setFaceConsent] = useState(consentRecorded);
  /** Set when the member was saved but their photo was not usable. */
  const [photoProblem, setPhotoProblem] = useState<string | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const details = {
      first_name: String(data.get("first_name")).trim(),
      last_name: String(data.get("last_name")).trim() || null,
      headline: String(data.get("headline")).trim() || null,
      story: String(data.get("story")).trim() || null,
    };

    const ok = await run(async () => {
      const saved = member
        ? await admin.updateParticipant(member.id, {
            ...details,
            // Only ever granted here, never withdrawn. Without persisting it
            // first, the enrolment below hits the consent trigger and fails.
            ...(faceConsent && !consentRecorded ? { consent_face_recognition: true } : {}),
          })
        : await admin.createParticipant({ ...details, consent_face_recognition: faceConsent });

      if (!file) {
        setPhotoProblem(null);
        await onSaved(saved);
        onClose();
        return;
      }

      // The member exists from here on, whatever happens to the photo. A
      // rejected portrait must not send staff back to "Add member", or the
      // second attempt creates a duplicate person.
      try {
        await admin.enrollFace(saved.id, file);
      } catch (cause) {
        setPhotoProblem(cause instanceof Error ? cause.message : String(cause));
        setFile(null);
        await onSaved(saved);
        return;
      }

      setPhotoProblem(null);
      await onSaved(saved);
      onClose();
    });

    if (!ok) setPhotoProblem(null);
  };

  return (
    <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
      <TextField
        id={`${id}-first`}
        name="first_name"
        label="First name"
        defaultValue={member?.first_name ?? initialFirstName ?? ""}
        required
        maxLength={80}
      />
      <TextField
        id={`${id}-last`}
        name="last_name"
        label="Last name"
        defaultValue={member?.last_name ?? ""}
        maxLength={80}
      />
      <TextField
        id={`${id}-headline`}
        name="headline"
        label="Short story"
        help="One line, shown when someone taps their face in a photo."
        defaultValue={member?.headline ?? ""}
        maxLength={200}
        fieldClassName="sm:col-span-2"
      />
      <TextareaField
        id={`${id}-story`}
        name="story"
        label="Long story"
        help="The full version, behind “read more”."
        defaultValue={member?.story ?? ""}
        rows={6}
        maxLength={20000}
        fieldClassName="sm:col-span-2"
      />

      <div className="grid gap-3 sm:col-span-2">
        <h3 className="font-bold text-ink">Photo of them</h3>

        {member?.avatar_url && (
          <div className="flex items-center gap-3 text-sm text-ink-soft">
            {/* eslint-disable-next-line @next/next/no-img-element -- expiring signed URL */}
            <img src={member.avatar_url} alt="" className="h-14 w-14 rounded-full object-cover" />
            <span>Choosing a new photo replaces this one.</span>
          </div>
        )}

        {consentRecorded ? (
          <p className="text-sm text-ink-soft">
            Face recognition consent is recorded. Withdrawing it is done under{" "}
            <strong className="text-ink">Consent</strong>, because it erases their stored face
            data.
          </p>
        ) : (
          <Toggle
            checked={faceConsent}
            disabled={busy}
            onChange={setFaceConsent}
            label="They agreed to face recognition"
            hint="Required to add a photo: it is used to suggest them in group photos."
          />
        )}

        <div>
          <label htmlFor={`${id}-photo`} className="block font-bold text-ink">
            Portrait
          </label>
          <input
            id={`${id}-photo`}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={!faceConsent || busy}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="mt-2 w-full rounded-card border-2 border-edge bg-paper p-3 disabled:bg-surface disabled:opacity-70"
          />
          <p className="mt-2 text-sm text-ink-soft">
            A clear, front-on photo of just this person.
          </p>
        </div>
      </div>

      {photoProblem && (
        <p
          role="alert"
          className="rounded-card bg-highlight-soft px-4 py-3 text-sm font-bold text-ink sm:col-span-2"
        >
          They have been saved, but that photo could not be used: {photoProblem} Try another photo,
          or close this and add one later.
        </p>
      )}

      <AdminError message={error} className="sm:col-span-2" />

      <div className="flex flex-wrap gap-3 sm:col-span-2">
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : member ? "Save changes" : "Add member"}
        </Button>
        <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
