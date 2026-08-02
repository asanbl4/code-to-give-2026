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
      className="overflow-hidden rounded-[2rem] border border-orange-200 bg-white shadow-sm"
    >
      <div className="bg-gradient-to-br from-orange-50 to-white px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-800">
          Your selection
        </p>
        <h2 id="donation-summary-heading" className="mt-2 text-xl font-semibold text-zinc-950">
          Donation summary
        </h2>
      </div>

      <dl className="space-y-4 px-5 py-5 text-sm transition-opacity duration-200 motion-reduce:transition-none">
        <div className="flex items-start justify-between gap-4">
          <dt className="text-zinc-600">Frequency</dt>
          <dd className="text-right font-medium text-zinc-950">{details.frequencyLabel}</dd>
        </div>
        <div className="flex items-start justify-between gap-4">
          <dt className="text-zinc-600">Amount</dt>
          <dd className="text-right font-medium text-zinc-950">{details.amountLabel}</dd>
        </div>
        {details.monthlyTotalLabel && (
          <div className="flex items-start justify-between gap-4">
            <dt className="text-zinc-600">12-month total</dt>
            <dd className="text-right font-medium text-zinc-950">
              {details.monthlyTotalLabel}
            </dd>
          </div>
        )}
        <div className="flex items-start justify-between gap-4">
          <dt className="text-zinc-600">Support interest</dt>
          <dd className="text-right font-medium text-zinc-950">{details.interestLabel}</dd>
        </div>
      </dl>

      {customAmountError ? (
        <p className="mx-5 mb-5 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          Please fix the custom amount before reviewing.
        </p>
      ) : details.impactStatement ? (
        <div className="mx-5 mb-5 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm leading-6 text-zinc-800">
          <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-white text-orange-700">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
              <path fill="currentColor" d="M12 21s-7-4.4-9.2-8.6C.9 8.8 3.3 5 7.2 5c2 0 3.6 1 4.8 2.5C13.2 6 14.8 5 16.8 5c3.9 0 6.3 3.8 4.4 7.4C19 16.6 12 21 12 21Z" />
            </svg>
          </span>
          <p>
            <span className="font-semibold text-zinc-950">Verified impact: </span>
            {details.impactStatement}
          </p>
        </div>
      ) : (
        <p className="mx-5 mb-5 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm leading-6 text-zinc-800">
          Custom amounts are welcome. This prototype does not generate a custom impact
          description.
        </p>
      )}
    </aside>
  );
}
