import type { RefObject } from "react";
import type { DonationSummaryDetails } from "../types";

interface DonationReviewProps {
  details: DonationSummaryDetails;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onBack: () => void;
  onComplete: () => void;
}

export function DonationReview({
  details,
  headingRef,
  onBack,
  onComplete,
}: DonationReviewProps) {
  return (
    <section
      aria-labelledby="donation-review-heading"
      className="rounded-[2rem] border border-edge bg-white p-6 shadow-sm sm:p-8"
    >
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-signal-deep">
        Review
      </p>
      <h2
        ref={headingRef}
        id="donation-review-heading"
        tabIndex={-1}
        className="mt-3 text-2xl font-semibold text-ink"
      >
        Review your donation selection
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-soft">
        Check your selections before moving to the demo confirmation. No payment
        details or personal information are requested.
      </p>

      <dl className="mt-8 grid gap-4 text-sm sm:grid-cols-2">
        <div className="rounded-2xl bg-surface p-4">
          <dt className="text-ink-soft">Frequency</dt>
          <dd className="mt-1 font-semibold text-ink">{details.frequencyLabel}</dd>
        </div>
        <div className="rounded-2xl bg-surface p-4">
          <dt className="text-ink-soft">Amount</dt>
          <dd className="mt-1 font-semibold text-ink">{details.amountLabel}</dd>
        </div>
        {details.monthlyTotalLabel && (
          <div className="rounded-2xl bg-surface p-4">
            <dt className="text-ink-soft">12-month total</dt>
            <dd className="mt-1 font-semibold text-ink">
              {details.monthlyTotalLabel}
            </dd>
          </div>
        )}
        <div className="rounded-2xl bg-surface p-4">
          <dt className="text-ink-soft">Support interest</dt>
          <dd className="mt-1 font-semibold text-ink">{details.interestLabel}</dd>
        </div>
      </dl>

      <div className="mt-6 rounded-2xl border border-signal/25 bg-signal-soft p-4 text-sm leading-6 text-ink">
        <p>
          This is a hackathon prototype. Completing this step will show a confirmation
          state only; it will not process a real donation.
        </p>
        {details.impactStatement && (
          <p className="mt-3">
            <span className="font-semibold text-ink">Verified impact: </span>
            {details.impactStatement}
          </p>
        )}
      </div>

      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-edge px-5 py-3 text-sm font-semibold text-ink transition hover:border-signal hover:bg-signal-soft motion-reduce:transition-none"
        >
          Back to edit
        </button>
        <button
          type="button"
          onClick={onComplete}
          className="rounded-full bg-signal px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-signal-deep motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
          Complete donation
        </button>
      </div>
    </section>
  );
}
