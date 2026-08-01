import type { RefObject } from "react";
import Link from "next/link";
import type { DonationSummaryDetails } from "../types";

interface DonationThankYouProps {
  details: DonationSummaryDetails;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onStartAgain: () => void;
}

export function DonationThankYou({
  details,
  headingRef,
  onStartAgain,
}: DonationThankYouProps) {
  return (
    <section
      aria-labelledby="donation-thank-you-heading"
      className="rounded-[2rem] border border-teal-200 bg-teal-50 p-6 shadow-sm sm:p-8"
    >
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">
        Prototype complete
      </p>
      <h2
        ref={headingRef}
        id="donation-thank-you-heading"
        tabIndex={-1}
        className="mt-3 text-2xl font-semibold text-zinc-950 outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
      >
        Thank you for trying the donation journey
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-700">
        No real donation was processed, and no payment or personal details were
        collected. This confirmation only summarizes the prototype selection.
      </p>

      <dl className="mt-8 grid gap-4 text-sm sm:grid-cols-2">
        <div className="rounded-2xl bg-white p-4">
          <dt className="text-zinc-500">Frequency</dt>
          <dd className="mt-1 font-semibold text-zinc-950">{details.frequencyLabel}</dd>
        </div>
        <div className="rounded-2xl bg-white p-4">
          <dt className="text-zinc-500">Amount</dt>
          <dd className="mt-1 font-semibold text-zinc-950">{details.amountLabel}</dd>
        </div>
        {details.monthlyTotalLabel && (
          <div className="rounded-2xl bg-white p-4">
            <dt className="text-zinc-500">12-month total</dt>
            <dd className="mt-1 font-semibold text-zinc-950">
              {details.monthlyTotalLabel}
            </dd>
          </div>
        )}
        <div className="rounded-2xl bg-white p-4">
          <dt className="text-zinc-500">Support interest</dt>
          <dd className="mt-1 font-semibold text-zinc-950">{details.interestLabel}</dd>
        </div>
      </dl>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onStartAgain}
          className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
          Start again
        </button>
        <Link
          href="/profile"
          className="rounded-full border border-teal-700 bg-white px-5 py-3 text-center text-sm font-semibold text-teal-800 transition hover:bg-teal-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 motion-reduce:transition-none"
        >
          View impact profile
        </Link>
        <Link
          href="/"
          className="rounded-full border border-zinc-300 px-5 py-3 text-center text-sm font-semibold text-zinc-800 transition hover:border-teal-300 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 motion-reduce:transition-none"
        >
          Return home
        </Link>
        <button
          type="button"
          disabled
          className="rounded-full border border-zinc-200 px-5 py-3 text-sm font-semibold text-zinc-400"
        >
          Learn about volunteering — coming soon
        </button>
      </div>
    </section>
  );
}
