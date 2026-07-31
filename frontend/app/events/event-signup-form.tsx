"use client";

import { useState, type FormEvent, type JSX } from "react";

import { submitEventSignup } from "./signup";
import type { EventSession, EventSignupResult } from "./events.types";

export function EventSignupForm({
  session,
  onSuccess,
}: {
  session: EventSession;
  onSuccess(result: EventSignupResult): void;
}): JSX.Element {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const result = await submitEventSignup({
        sessionId: session.id,
        name: String(formData.get("name") ?? ""),
        email: String(formData.get("email") ?? ""),
        participationType: "volunteer",
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
        if (submitError) {
          setSubmitError(null);
        }
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-800">
          Name
          <input
            required
            name="name"
            type="text"
            autoComplete="name"
            disabled={isSubmitting}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200/70 disabled:cursor-wait disabled:bg-slate-100"
          />
        </label>

        <label className="block text-sm font-medium text-slate-800">
          Email
          <input
            required
            name="email"
            type="email"
            autoComplete="email"
            disabled={isSubmitting}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200/70 disabled:cursor-wait disabled:bg-slate-100"
          />
        </label>
      </div>

      <label className="block text-sm font-medium text-slate-800">
        Note
        <textarea
          name="note"
          rows={3}
          disabled={isSubmitting}
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200/70 disabled:cursor-wait disabled:bg-slate-100"
          placeholder="Anything you'd like us to know before the session."
        />
      </label>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p
          className={`text-sm leading-6 ${submitError ? "text-rose-700" : "text-slate-500"}`}
          aria-live="polite"
        >
          {submitError ??
            (isSubmitting
              ? "Saving your place..."
              : "This demo saves through a mock signup flow and returns an instant confirmation.")}
        </p>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:bg-slate-400"
        >
          {isSubmitting ? "Signing you up..." : "Confirm signup"}
        </button>
      </div>
    </form>
  );
}
