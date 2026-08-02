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
      className="relative overflow-hidden rounded-[2rem] border border-positive/40 bg-positive-soft p-6 shadow-sm sm:p-8"
    >
      <style>
        {`
          @keyframes thank-you-pop {
            0% { opacity: 0; transform: translateY(10px) scale(0.8); }
            55% { opacity: 1; transform: translateY(-4px) scale(1.05); }
            100% { opacity: 0.75; transform: translateY(0) scale(1); }
          }

          @media (prefers-reduced-motion: reduce) {
            .thank-you-pop {
              animation: none !important;
            }
          }
        `}
      </style>
      <svg
        aria-hidden="true"
        viewBox="0 0 220 120"
        className="pointer-events-none absolute right-0 top-0 h-32 w-56 text-positive opacity-25"
      >
        <circle className="thank-you-pop" style={{ animation: "thank-you-pop 280ms ease-out 40ms both" }} cx="160" cy="28" r="9" fill="currentColor" />
        <circle className="thank-you-pop" style={{ animation: "thank-you-pop 280ms ease-out 110ms both" }} cx="196" cy="58" r="6" fill="var(--color-signal)" />
        <path
          className="thank-you-pop"
          style={{ animation: "thank-you-pop 280ms ease-out 180ms both" }}
          fill="var(--color-signal)"
          d="M125 54c5-9 20-6 20 5 0 13-20 23-20 23s-20-10-20-23c0-11 15-14 20-5Z"
        />
      </svg>
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-positive">
        Prototype complete
      </p>
      <h2
        ref={headingRef}
        id="donation-thank-you-heading"
        tabIndex={-1}
        className="mt-3 text-2xl font-semibold text-ink"
      >
        Thank you for trying the donation journey
      </h2>

      <dl className="mt-8 grid gap-4 text-sm sm:grid-cols-2">
        <div className="rounded-2xl bg-white p-4">
          <dt className="text-ink-soft">Frequency</dt>
          <dd className="mt-1 font-semibold text-ink">{details.frequencyLabel}</dd>
        </div>
        <div className="rounded-2xl bg-white p-4">
          <dt className="text-ink-soft">Amount</dt>
          <dd className="mt-1 font-semibold text-ink">{details.amountLabel}</dd>
        </div>
        {details.monthlyTotalLabel && (
          <div className="rounded-2xl bg-white p-4">
            <dt className="text-ink-soft">12-month total</dt>
            <dd className="mt-1 font-semibold text-ink">
              {details.monthlyTotalLabel}
            </dd>
          </div>
        )}
        <div className="rounded-2xl bg-white p-4">
          <dt className="text-ink-soft">Support interest</dt>
          <dd className="mt-1 font-semibold text-ink">{details.interestLabel}</dd>
        </div>
      </dl>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onStartAgain}
          className="rounded-full bg-signal px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-signal-deep motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
          Start again
        </button>
        <Link
          href="/profile"
          className="rounded-full border border-positive bg-white px-5 py-3 text-center text-sm font-semibold text-positive transition hover:bg-positive-soft motion-reduce:transition-none"
        >
          View impact profile
        </Link>
        <Link
          href="/"
          className="rounded-full border border-edge px-5 py-3 text-center text-sm font-semibold text-ink transition hover:border-positive hover:bg-white motion-reduce:transition-none"
        >
          Return home
        </Link>
        <button
          type="button"
          disabled
          className="rounded-full border border-edge px-5 py-3 text-sm font-semibold text-ink-soft"
        >
          Learn about volunteering — coming soon
        </button>
      </div>
    </section>
  );
}
