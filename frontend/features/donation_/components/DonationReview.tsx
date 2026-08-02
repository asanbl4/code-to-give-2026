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
      className="rounded-[2rem] border border-orange-100 bg-white p-6 shadow-sm sm:p-8"
    >
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">
        Review
      </p>
      <h2
        ref={headingRef}
        id="donation-review-heading"
        tabIndex={-1}
        className="mt-3 text-2xl font-semibold text-zinc-950 outline-none focus-visible:ring-2 focus-visible:ring-orange-600"
      >
        Review your donation selection
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
        Check your selections before moving to the demo confirmation. No payment
        details or personal information are requested.
      </p>

      <dl className="mt-8 grid gap-4 text-sm sm:grid-cols-2">
        <div className="rounded-2xl bg-zinc-50 p-4">
          <dt className="text-zinc-500">Frequency</dt>
          <dd className="mt-1 font-semibold text-zinc-950">{details.frequencyLabel}</dd>
        </div>
        <div className="rounded-2xl bg-zinc-50 p-4">
          <dt className="text-zinc-500">Amount</dt>
          <dd className="mt-1 font-semibold text-zinc-950">{details.amountLabel}</dd>
        </div>
        {details.monthlyTotalLabel && (
          <div className="rounded-2xl bg-zinc-50 p-4">
            <dt className="text-zinc-500">12-month total</dt>
            <dd className="mt-1 font-semibold text-zinc-950">
              {details.monthlyTotalLabel}
            </dd>
          </div>
        )}
        <div className="rounded-2xl bg-zinc-50 p-4">
          <dt className="text-zinc-500">Support interest</dt>
          <dd className="mt-1 font-semibold text-zinc-950">{details.interestLabel}</dd>
        </div>
      </dl>

      <div className="mt-6 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm leading-6 text-zinc-800">
        <p>
          This is a hackathon prototype. Completing this step will show a confirmation
          state only; it will not process a real donation.
        </p>
        {details.impactStatement && (
          <p className="mt-3">
            <span className="font-semibold text-zinc-950">Verified impact: </span>
            {details.impactStatement}
          </p>
        )}
      </div>

      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-800 transition hover:border-orange-300 hover:bg-orange-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 motion-reduce:transition-none"
        >
          Back to edit
        </button>
        <button
          type="button"
          onClick={onComplete}
          className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
          Complete donation
        </button>
      </div>
    </section>
  );
}
