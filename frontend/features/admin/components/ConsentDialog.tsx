"use client";

import { useId, useState } from "react";
import { Button, Dialog, TextField, Toggle } from "@/components/ui";
import { admin, type AdminParticipant } from "@/lib/admin";
import { useAsyncAction } from "../useAsyncAction";
import { AdminError } from "./AdminError";

interface ConsentDialogProps {
  open: boolean;
  onClose: () => void;
  member: AdminParticipant;
  onSaved: () => Promise<void>;
}

/**
 * The consent record for one member.
 *
 * Separate from their name and story on purpose. The charity already holds
 * signed paper media-release forms; these fields record *which* form and *who*
 * checked it, so the database carries an attestation rather than an anonymous
 * tick. Mixing them into the details form invites someone to tick a box while
 * thinking about a headline.
 *
 * Two consents, two meanings, and neither implies the other: agreeing to have
 * your story published is not agreeing to be matched by a face recognition
 * model.
 */
export function ConsentDialog({ open, onClose, member, onSaved }: ConsentDialogProps) {
  // Owned here so the dialog can refuse to close on Escape mid-save.
  const action = useAsyncAction();

  return (
    <Dialog open={open} onClose={onClose} busy={action.busy} title={`Consent for ${member.name}`}>
      <ConsentForm
        key={member.id}
        member={member}
        onClose={onClose}
        onSaved={onSaved}
        action={action}
      />
    </Dialog>
  );
}

function ConsentForm({
  member,
  onClose,
  onSaved,
  action,
}: {
  member: AdminParticipant;
  onClose: () => void;
  onSaved: () => Promise<void>;
  action: ReturnType<typeof useAsyncAction>;
}) {
  const id = useId();
  const { busy, error, run } = action;
  const [publishConsent, setPublishConsent] = useState(member.consent_given);
  const [faceConsent, setFaceConsent] = useState(member.consent_face_recognition);

  const withdrawingFaceConsent = member.consent_face_recognition && !faceConsent;
  const withdrawingPublishConsent = member.consent_given && !publishConsent;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    if (
      withdrawingFaceConsent &&
      !window.confirm(
        `Withdrawing face recognition consent permanently deletes ${member.name}'s stored face ` +
          `data. They will stop being suggested in group photos. Continue?`,
      )
    ) {
      return;
    }

    const ok = await run(() =>
      admin.updateParticipant(member.id, {
        consent_given: publishConsent,
        consent_face_recognition: faceConsent,
        consent_form_reference: String(data.get("consent_form_reference")).trim() || null,
        consent_recorded_by: String(data.get("consent_recorded_by")).trim() || null,
      }),
    );
    if (ok) {
      await onSaved();
      onClose();
    }
  };

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <Toggle
        checked={publishConsent}
        disabled={busy}
        onChange={setPublishConsent}
        label="Consent to publish their story"
        hint={
          member.consented_at
            ? `Recorded ${new Date(member.consented_at).toLocaleDateString()}`
            : "From their signed media-release form"
        }
      />
      <Toggle
        checked={faceConsent}
        disabled={busy}
        onChange={setFaceConsent}
        label="Consent to face recognition"
        hint="Lets the tool suggest them in group photos."
      />

      {/* Both warnings appear before saving. Discovering afterwards that the
          embeddings are gone is not a recoverable surprise. */}
      {withdrawingFaceConsent && (
        <p
          role="alert"
          className="rounded-card bg-danger-soft px-4 py-3 text-sm font-bold text-danger"
        >
          Saving this permanently deletes their stored face data. It cannot be undone — they would
          have to be enrolled again from a new photo.
        </p>
      )}
      {withdrawingPublishConsent && (
        <p
          role="alert"
          className="rounded-card bg-highlight-soft px-4 py-3 text-sm font-bold text-ink"
        >
          Saving this also takes their story off the website.
        </p>
      )}

      <TextField
        id={`${id}-reference`}
        name="consent_form_reference"
        label="Consent form reference"
        help="Which signed form this came from."
        defaultValue={member.consent_form_reference ?? ""}
        maxLength={200}
      />
      <TextField
        id={`${id}-by`}
        name="consent_recorded_by"
        label="Confirmed by (your name)"
        defaultValue={member.consent_recorded_by ?? ""}
        maxLength={120}
      />

      <AdminError message={error} />

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save consent"}
        </Button>
        <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
