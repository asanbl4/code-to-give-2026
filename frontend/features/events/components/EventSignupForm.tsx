"use client";

import { useId, useState, type FormEvent } from "react";
import { Button, SelectField, TextField, TextareaField } from "@/components/ui";
import { submitEventSignup } from "../signup";
import type { EventSession, EventSignupInput, EventSignupResult } from "../types";

function isParticipationType(
  value: FormDataEntryValue | null,
): value is EventSignupInput["participationType"] {
  return value === "volunteer" || value === "family" || value === "supporter";
}

interface EventSignupFormProps {
  session: EventSession;
  onSuccess: (result: EventSignupResult) => void;
}

export function EventSignupForm({ session, onSuccess }: EventSignupFormProps) {
  const id = useId();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const participationType = formData.get("participationType");

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      if (!isParticipationType(participationType)) {
        throw new Error("Missing participation type");
      }

      const result = await submitEventSignup({
        sessionId: session.id,
        name: String(formData.get("name") ?? ""),
        email: String(formData.get("email") ?? ""),
        participationType,
        note: String(formData.get("note") ?? ""),
      });

      form.reset();
      onSuccess(result);
    } catch {
      setSubmitError("We couldn't save your signup just now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit}
      onChange={() => {
        if (submitError) setSubmitError(null);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id={`${id}-name`}
          name="name"
          label="Name"
          type="text"
          autoComplete="name"
          required
          disabled={isSubmitting}
        />
        <TextField
          id={`${id}-email`}
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          disabled={isSubmitting}
        />
      </div>

      <SelectField
        id={`${id}-participation`}
        name="participationType"
        label="Participation type"
        defaultValue="volunteer"
        required
        disabled={isSubmitting}
      >
        <option value="volunteer">Volunteer</option>
        <option value="family">Family member</option>
        <option value="supporter">Supporter</option>
      </SelectField>

      <TextareaField
        id={`${id}-note`}
        name="note"
        label="Note"
        rows={3}
        disabled={isSubmitting}
        placeholder="Anything you'd like us to know before the session."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p
          aria-live="polite"
          className={submitError ? "font-bold text-danger" : "text-sm text-ink-soft"}
        >
          {submitError ??
            (isSubmitting
              ? "Saving your place…"
              : "This demo saves through a mock signup flow and returns an instant confirmation.")}
        </p>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Signing you up…" : "Confirm signup"}
        </Button>
      </div>
    </form>
  );
}
