"use client";

import { useEffect, useRef, useState } from "react";
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
  const sectionRef = useRef<HTMLElement | null>(null);
  const [barsVisible, setBarsVisible] = useState(false);

  useEffect(() => {
    const element = sectionRef.current;
    if (!element || barsVisible) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setBarsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [barsVisible]);

  return (
    <section
      ref={sectionRef}
      aria-labelledby="donation-impact-heading"
      className="rounded-[2rem] border border-edge bg-paper p-5 shadow-sm sm:p-6"
    >
      <h2 id="donation-impact-heading" className="text-2xl font-semibold text-ink">
        Donation impact
      </h2>

      <div className="mt-4 grid gap-4 md:grid-cols-[18rem_minmax(0,1fr)]">
        <article className="rounded-2xl border border-edge bg-signal-soft p-4">
          <h3 className="font-semibold text-ink">Contribution summary</h3>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-soft">One-time total</dt>
              <dd className="font-semibold text-ink">
                {formatHkd(contributionSummary.oneTimeTotalHkd)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-soft">Monthly total</dt>
              <dd className="font-semibold text-ink">
                {formatHkd(contributionSummary.monthlyTotalHkd)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-soft">Monthly entries</dt>
              <dd className="font-semibold text-ink">
                {contributionSummary.monthlyCount}
              </dd>
            </div>
          </dl>
        </article>

        <div className="space-y-3">
          {donations.map((donation) => (
            <article key={donation.id} className="rounded-2xl border border-edge bg-paper p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <h3 className="font-semibold text-ink">
                  {donation.programmeInterest}
                </h3>
                <p className="font-semibold text-ink">{formatHkd(donation.amountHkd)}</p>
              </div>
              <p className="mt-2 text-sm capitalize text-ink-soft">
                {donation.contributionType.replace("-", " ")} contribution
              </p>
              <div className="mt-3" aria-label={`${donation.programmeInterest} total ${formatHkd(donation.amountHkd)}`}>
                <div className="flex items-center justify-between gap-3 text-xs text-ink-soft">
                  <span>Programme-interest total</span>
                  <span>{formatHkd(donation.amountHkd)}</span>
                </div>
                <div className="mt-2 h-3 overflow-hidden rounded-full bg-signal-soft">
                  <div
                    className="h-3 rounded-full bg-signal transition-[width] duration-300 ease-out motion-reduce:transition-none"
                    style={{
                      width: barsVisible
                        ? `${Math.max(12, (donation.amountHkd / maxDonation) * 100)}%`
                        : "0%",
                    }}
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
