"use client";

import { useId, useState, type FormEvent } from "react";
import { Button, SelectField, TextField, TextareaField } from "@/components/ui";
import { submitEventSignup } from "../signup";
import type {
  EventSession,
  EventSignupResult,
  VolunteerAgeGroup,
  VolunteerInterest,
  VolunteerRole,
} from "../types";

function isAgeGroup(value: FormDataEntryValue | null): value is VolunteerAgeGroup {
  return value === "14-15" || value === "16-17" || value === "18-plus";
}

function isVolunteerRole(value: FormDataEntryValue | null): value is VolunteerRole {
  return value === "assistant" || value === "coach";
}

function isVolunteerInterest(value: FormDataEntryValue | null): value is VolunteerInterest {
  return (
    value === "sports" ||
    value === "creative" ||
    value === "family" ||
    value === "nutrition" ||
    value === "general"
  );
}

interface EventSignupFormProps {
  session: EventSession;
  onSuccess: (result: EventSignupResult) => void;
}

export function EventSignupForm({ session, onSuccess }: EventSignupFormProps) {
  const id = useId();
  const [ageGroup, setAgeGroup] = useState<VolunteerAgeGroup>("18-plus");
  const [volunteerRole, setVolunteerRole] = useState<VolunteerRole>("assistant");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const ageGuidance =
    ageGroup === "14-15"
      ? "You can apply as an assistant for Art Classes and Family Team activities only. A guardian must complete the required paperwork."
      : ageGroup === "16-17"
        ? "You can assist in all classes. Coach applicants need a guardian or school teacher at their first three classes."
        : "You can apply as an assistant or coach. An SCRC is required before you can volunteer.";
  const isEligibleForSession = session.eligibleAgeGroups.includes(ageGroup);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const submittedAgeGroup = formData.get("ageGroup");
    const submittedRole = formData.get("volunteerRole");
    const interest = formData.get("interest");

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      if (
        !isAgeGroup(submittedAgeGroup) ||
        !isVolunteerRole(submittedRole) ||
        !isVolunteerInterest(interest)
      ) {
        throw new Error("Missing volunteer application details");
      }

      if (!session.eligibleAgeGroups.includes(submittedAgeGroup)) {
        throw new Error(
          "Volunteers aged 14-15 can only apply for Art Classes and Family Team activities. Please choose an eligible session.",
        );
      }

      const result = await submitEventSignup({
        sessionId: session.id,
        fullName: String(formData.get("fullName") ?? ""),
        email: String(formData.get("email") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        ageGroup: submittedAgeGroup,
        volunteerRole: submittedRole,
        interest,
        note: String(formData.get("note") ?? ""),
        processAcknowledged: formData.get("processAcknowledged") === "yes",
      });

      form.reset();
      setAgeGroup("18-plus");
      setVolunteerRole("assistant");
      onSuccess(result);
    } catch (cause) {
      setSubmitError(
        cause instanceof Error
          ? cause.message
          : "We couldn't submit your application. Please try again.",
      );
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
          name="fullName"
          label="Full name"
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

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id={`${id}-phone`}
          name="phone"
          label="Phone number"
          type="tel"
          autoComplete="tel"
          required
          disabled={isSubmitting}
        />
        <SelectField
          id={`${id}-age-group`}
          name="ageGroup"
          label="Age group"
          value={ageGroup}
          onChange={(event) => {
            const nextAgeGroup = event.target.value as VolunteerAgeGroup;
            setAgeGroup(nextAgeGroup);
            if (nextAgeGroup === "14-15") setVolunteerRole("assistant");
          }}
          required
          disabled={isSubmitting}
        >
          <option value="14-15">Age 14-15</option>
          <option value="16-17">Age 16-17</option>
          <option value="18-plus">Age 18+</option>
        </SelectField>
      </div>

      <SelectField
        id={`${id}-role`}
        name="volunteerRole"
        label="Preferred volunteer role"
        value={volunteerRole}
        onChange={(event) => setVolunteerRole(event.target.value as VolunteerRole)}
        help={ageGuidance}
        required
        disabled={isSubmitting}
      >
        <option value="assistant">Volunteer Assistant</option>
        <option value="coach" disabled={ageGroup === "14-15"}>
          Volunteer Coach
        </option>
      </SelectField>

      {!isEligibleForSession && (
        <p role="alert" className="rounded-card bg-danger-soft px-4 py-3 text-sm font-bold text-danger">
          This session is not available to volunteers aged 14-15. Please choose an Art or Family Team activity instead.
        </p>
      )}

      <SelectField
        id={`${id}-interest`}
        name="interest"
        label="Area of interest"
        defaultValue="general"
        required
        disabled={isSubmitting}
      >
        <option value="general">Open to different programmes</option>
        <option value="sports">Sports and movement</option>
        <option value="creative">Art and creative activities</option>
        <option value="family">Family team activities</option>
        <option value="nutrition">Nutrition and kitchen support</option>
      </SelectField>

      <TextareaField
        id={`${id}-note`}
        name="note"
        label="Experience or accessibility notes (optional)"
        rows={3}
        disabled={isSubmitting}
        placeholder="Tell the team about relevant experience, support needs, or questions."
      />

      <label className="flex items-start gap-3 rounded-card border border-edge bg-paper p-4 text-sm leading-6 text-ink">
        <input
          type="checkbox"
          name="processAcknowledged"
          value="yes"
          required
          disabled={isSubmitting}
          className="mt-1 h-5 w-5 shrink-0 accent-signal"
        />
        <span>
          I understand this is a volunteer application, not a confirmed class booking. Love 21 will contact me after reviewing my eligibility and required documents.
        </span>
      </label>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p
          aria-live="polite"
          className={submitError ? "font-bold text-danger" : "text-sm text-ink-soft"}
        >
          {submitError ??
            (isSubmitting
              ? "Submitting your application…"
              : "Your details are sent securely to Love 21 and are not shared with an external volunteer platform.")}
        </p>
        <Button type="submit" disabled={isSubmitting || !isEligibleForSession}>
          {isSubmitting ? "Submitting…" : "Submit volunteer application"}
        </Button>
      </div>
    </form>
  );
}
