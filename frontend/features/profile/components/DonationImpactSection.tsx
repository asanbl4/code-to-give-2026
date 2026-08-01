import type { ContributionSummary, DonationImpactRecord } from "../types";

function formatHkd(amount: number): string {
  return `HK$${amount.toLocaleString("en-HK")}`;
}

interface DonationImpactSectionProps {
  donations: ReadonlyArray<DonationImpactRecord>;
  contributionSummary: ContributionSummary;
}

export function DonationImpactSection({
  donations,
  contributionSummary,
}: DonationImpactSectionProps) {
  const maxDonation = Math.max(...donations.map((donation) => donation.amountHkd));

  return (
    <section
      aria-labelledby="donation-impact-heading"
      className="rounded-[2rem] border border-orange-100 bg-white p-6 shadow-sm sm:p-8"
    >
      <h2 id="donation-impact-heading" className="text-2xl font-semibold text-zinc-950">
        Donation impact
      </h2>
      <p className="mt-3 text-sm leading-6 text-zinc-600">
        Donation totals are grouped by supporter interest. They do not show or prove
        legally restricted fund allocation.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl bg-orange-50 p-4">
          <h3 className="font-semibold text-zinc-950">Contribution summary</h3>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-600">One-time total</dt>
              <dd className="font-semibold text-zinc-950">
                {formatHkd(contributionSummary.oneTimeTotalHkd)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-600">Monthly total</dt>
              <dd className="font-semibold text-zinc-950">
                {formatHkd(contributionSummary.monthlyTotalHkd)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-600">Monthly entries</dt>
              <dd className="font-semibold text-zinc-950">
                {contributionSummary.monthlyCount}
              </dd>
            </div>
          </dl>
        </article>

        <div className="space-y-3">
          {donations.map((donation) => (
            <article key={donation.id} className="rounded-2xl border border-zinc-200 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <h3 className="font-semibold text-zinc-950">
                  {donation.programmeInterest}
                </h3>
                <p className="font-semibold text-zinc-950">{formatHkd(donation.amountHkd)}</p>
              </div>
              <p className="mt-2 text-sm capitalize text-zinc-600">
                {donation.contributionType.replace("-", " ")} contribution
              </p>
              <div className="mt-3" aria-label={`${donation.programmeInterest} total ${formatHkd(donation.amountHkd)}`}>
                <div className="flex items-center justify-between gap-3 text-xs text-zinc-600">
                  <span>Programme-interest total</span>
                  <span>{formatHkd(donation.amountHkd)}</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-orange-100">
                  <div
                    className="h-2 rounded-full bg-orange-500"
                    style={{ width: `${Math.max(12, (donation.amountHkd / maxDonation) * 100)}%` }}
                  />
                </div>
              </div>
              <p className="mt-2 text-sm leading-6 text-zinc-600">{donation.note}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
