import type { DonationSummaryDetails } from "../types";

interface DonationSummaryProps {
  details: DonationSummaryDetails;
  customAmountError?: string;
}

export function DonationSummary({ details, customAmountError }: DonationSummaryProps) {
  return (
    <aside
      aria-labelledby="donation-summary-heading"
      aria-live="polite"
      className="overflow-hidden rounded-[2rem] border border-signal/25 bg-white shadow-sm"
    >
      <div className="bg-gradient-to-br from-signal-soft to-white px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-signal-deep">
          Your selection
        </p>
        <h2 id="donation-summary-heading" className="mt-2 text-xl font-semibold text-ink">
          Donation summary
        </h2>
      </div>

      <dl className="space-y-4 px-5 py-5 text-sm transition-opacity duration-200 motion-reduce:transition-none">
        <div className="flex items-start justify-between gap-4">
          <dt className="text-ink-soft">Frequency</dt>
          <dd className="text-right font-medium text-ink">{details.frequencyLabel}</dd>
        </div>
        <div className="flex items-start justify-between gap-4">
          <dt className="text-ink-soft">Amount</dt>
          <dd className="text-right font-medium text-ink">{details.amountLabel}</dd>
        </div>
        {details.monthlyTotalLabel && (
          <div className="flex items-start justify-between gap-4">
            <dt className="text-ink-soft">12-month total</dt>
            <dd className="text-right font-medium text-ink">
              {details.monthlyTotalLabel}
            </dd>
          </div>
        )}
        <div className="flex items-start justify-between gap-4">
          <dt className="text-ink-soft">Support interest</dt>
          <dd className="text-right font-medium text-ink">{details.interestLabel}</dd>
        </div>
      </dl>

      {customAmountError ? (
        <p className="mx-5 mb-5 rounded-2xl border border-danger/40 bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
          Please fix the custom amount before reviewing.
        </p>
      ) : details.impactStatement ? (
        <div className="mx-5 mb-5 rounded-2xl border border-signal/25 bg-signal-soft px-4 py-3 text-sm leading-6 text-ink">
          <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-white text-signal">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
              <path fill="currentColor" d="M12 21s-7-4.4-9.2-8.6C.9 8.8 3.3 5 7.2 5c2 0 3.6 1 4.8 2.5C13.2 6 14.8 5 16.8 5c3.9 0 6.3 3.8 4.4 7.4C19 16.6 12 21 12 21Z" />
            </svg>
          </span>
          <p>
            <span className="font-semibold text-ink">Verified impact: </span>
            {details.impactStatement}
          </p>
        </div>
      ) : (
        <p className="mx-5 mb-5 rounded-2xl border border-edge bg-surface px-4 py-3 text-sm leading-6 text-ink">
          Custom amounts are welcome. This prototype does not generate a custom impact
          description.
        </p>
      )}
    </aside>
  );
}
