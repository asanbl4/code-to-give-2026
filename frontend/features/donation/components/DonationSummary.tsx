import { Card, IconBadge } from "@/components/ui";
import type { DonationSummaryDetails } from "../types";
import { DonationDetails } from "./DonationDetails";

interface DonationSummaryProps {
  details: DonationSummaryDetails;
  hasAmountError?: boolean;
}

/** The sticky sidebar that mirrors the current selection while you edit it. */
export function DonationSummary({ details, hasAmountError }: DonationSummaryProps) {
  return (
    <Card
      as="aside"
      panel
      padding="none"
      className="overflow-hidden"
      aria-labelledby="donation-summary-heading"
      aria-live="polite"
    >
      <div className="bg-surface px-6 py-5">
        <p className="font-display text-sm font-bold uppercase tracking-[0.18em] text-signal-deep">
          Your selection
        </p>
        <h2 id="donation-summary-heading" className="mt-1 font-display text-xl font-bold text-ink">
          Donation summary
        </h2>
      </div>

      <DonationDetails details={details} layout="rows" className="px-6 py-5" />

      {hasAmountError ? (
        <p className="mx-6 mb-6 rounded-card bg-danger-soft px-4 py-3 font-bold text-danger">
          Please fix the custom amount before reviewing.
        </p>
      ) : details.impactStatement ? (
        <div className="mx-6 mb-6 rounded-card bg-signal-soft px-4 py-3 leading-6 text-ink">
          <IconBadge name="heart" className="mb-2 bg-paper" />
          <p>
            <span className="font-bold">Verified impact: </span>
            {details.impactStatement}
          </p>
        </div>
      ) : (
        <p className="mx-6 mb-6 rounded-card bg-surface px-4 py-3 leading-6 text-ink-soft">
          Custom amounts are welcome. This prototype does not generate a custom impact description.
        </p>
      )}
    </Card>
  );
}
