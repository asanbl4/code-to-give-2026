import { Card, ProgressBar, Section } from "@/components/ui";
import { formatHkd } from "@/lib/format";
import type { ContributionSummary, DonationImpactRecord } from "../types";

interface DonationImpactSectionProps {
  donations: ReadonlyArray<DonationImpactRecord>;
  contributionSummary: ContributionSummary;
}

export function DonationImpactSection({
  donations,
  contributionSummary,
}: DonationImpactSectionProps) {
  // `Math.max()` with no arguments is -Infinity, which turned every bar width
  // into NaN the moment the donation list was empty.
  const maxDonation = donations.length
    ? Math.max(...donations.map((donation) => donation.amountHkd))
    : 0;

  const summaryRows = [
    { term: "One-time total", value: formatHkd(contributionSummary.oneTimeTotalHkd) },
    { term: "Monthly total", value: formatHkd(contributionSummary.monthlyTotalHkd) },
    { term: "Monthly entries", value: String(contributionSummary.monthlyCount) },
  ];

  return (
    <Section
      card
      title="Donation impact"
      description="Donation totals are grouped by supporter interest. They do not show or prove legally restricted fund allocation."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Card as="article" tone="surface">
          <h3 className="font-display text-lg font-bold text-ink">Contribution summary</h3>
          <dl className="mt-4 space-y-3">
            {summaryRows.map((row) => (
              <div key={row.term} className="flex justify-between gap-4">
                <dt className="text-ink-soft">{row.term}</dt>
                <dd className="font-bold text-ink">{row.value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <div className="space-y-3">
          {donations.map((donation) => (
            <Card as="article" key={donation.id}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <h3 className="font-display text-lg font-bold text-ink">
                  {donation.programmeInterest}
                </h3>
                <p className="font-bold text-ink">{formatHkd(donation.amountHkd)}</p>
              </div>
              <p className="mt-2 text-sm capitalize text-ink-soft">
                {donation.contributionType.replace("-", " ")} contribution
              </p>
              <ProgressBar
                className="mt-3"
                value={donation.amountHkd}
                max={maxDonation}
                label="Programme-interest total"
                hint={formatHkd(donation.amountHkd)}
              />
              <p className="mt-2 text-sm leading-6 text-ink-soft">{donation.note}</p>
            </Card>
          ))}
        </div>
      </div>
    </Section>
  );
}
