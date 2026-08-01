import { cn } from "@/lib/cn";
import type { DonationSummaryDetails } from "../types";

/**
 * The frequency / amount / 12-month total / interest list.
 *
 * It appeared three times — sidebar summary, review step and thank-you step —
 * each with its own copy of the same four `<dt>`/`<dd>` pairs and its own rule
 * for hiding the 12-month row. One definition, two layouts.
 */
export function DonationDetails({
  details,
  layout = "grid",
  className,
}: {
  details: DonationSummaryDetails;
  /** `grid` for the full-width steps, `rows` for the narrow sidebar. */
  layout?: "grid" | "rows";
  className?: string;
}) {
  const rows = [
    { term: "Frequency", value: details.frequencyLabel },
    { term: "Amount", value: details.amountLabel },
    ...(details.monthlyTotalLabel
      ? [{ term: "12-month total", value: details.monthlyTotalLabel }]
      : []),
    { term: "Support interest", value: details.interestLabel },
  ];

  if (layout === "rows") {
    return (
      <dl className={cn("space-y-4", className)}>
        {rows.map((row) => (
          <div key={row.term} className="flex items-start justify-between gap-4">
            <dt className="text-ink-soft">{row.term}</dt>
            <dd className="text-right font-bold text-ink">{row.value}</dd>
          </div>
        ))}
      </dl>
    );
  }

  return (
    <dl className={cn("grid gap-4 sm:grid-cols-2", className)}>
      {rows.map((row) => (
        <div key={row.term} className="rounded-card bg-surface p-4">
          <dt className="text-sm text-ink-soft">{row.term}</dt>
          <dd className="mt-1 font-bold text-ink">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
