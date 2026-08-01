import type { Metadata } from "next";
import Link from "next/link";
import { DonationExperience } from "@/features/donation/components/DonationExperience";
import { TRUST_TRANSPARENCY_ITEMS } from "@/features/donation/data";

export const metadata: Metadata = {
  title: "Donate — Love 21 Foundation",
  description: "A prototype donation journey for Love 21 Foundation.",
};

export default function DonatePage() {
  return (
    <main className="min-h-screen bg-[#fff8ef] font-sans text-zinc-950">
      <header className="border-b border-orange-200 bg-white/85 px-5 py-4 backdrop-blur sm:px-8">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
          <Link
            href="/"
            className="text-base font-semibold text-zinc-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-600"
          >
            Love 21 Foundation
          </Link>
          <Link
            href="/"
            className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:border-orange-300 hover:bg-orange-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 motion-reduce:transition-none"
          >
            Back to home
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        <section
          aria-labelledby="donation-introduction-heading"
          className="grid gap-8 overflow-hidden rounded-[2rem] border border-orange-200 bg-white p-6 shadow-sm sm:p-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-center"
        >
          <div>
            <p className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-orange-800">
              Demo mode
            </p>
            <h1
              id="donation-introduction-heading"
              className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl"
            >
              Help support Love 21 members and families
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-700">
              Choose a donation frequency, amount, and support interest, then review a
              clearly labelled confirmation.
            </p>
            <p className="mt-4 max-w-2xl rounded-2xl border border-orange-200 bg-[#fff8ef] px-4 py-3 text-sm leading-6 text-zinc-700">
              This demo does not process real donations, collect personal information, or
              request payment details.
            </p>
          </div>

          <div className="relative min-h-56 rounded-[1.75rem] bg-orange-50 p-5">
            <svg
              aria-hidden="true"
              viewBox="0 0 280 220"
              className="h-full min-h-48 w-full text-orange-500"
            >
              <circle cx="74" cy="72" r="34" fill="currentColor" opacity="0.16" />
              <circle cx="198" cy="58" r="26" fill="#14b8a6" opacity="0.18" />
              <circle cx="188" cy="158" r="42" fill="#f97316" opacity="0.16" />
              <path
                d="M88 84 C122 124, 154 120, 178 75"
                fill="none"
                stroke="#0f766e"
                strokeLinecap="round"
                strokeWidth="8"
                opacity="0.5"
              />
              <path
                d="M83 127 C111 154, 147 170, 183 158"
                fill="none"
                stroke="#ea580c"
                strokeLinecap="round"
                strokeWidth="8"
                opacity="0.55"
              />
              <g fill="#ffffff" stroke="#27272a" strokeWidth="4">
                <circle cx="74" cy="72" r="18" />
                <circle cx="198" cy="58" r="18" />
                <circle cx="188" cy="158" r="18" />
                <circle cx="88" cy="140" r="18" />
              </g>
              <path
                d="M135 91 c10-18 39-11 39 10 0 23-39 41-39 41s-39-18-39-41c0-21 29-28 39-10z"
                fill="#fb923c"
              />
            </svg>
            <p className="absolute bottom-5 left-5 right-5 rounded-2xl bg-white/90 px-4 py-3 text-sm font-medium leading-6 text-zinc-800 shadow-sm">
              A warm prototype journey for choosing, reviewing, and confirming support.
            </p>
          </div>
        </section>

        <div className="mt-10">
          <DonationExperience />
        </div>

        <section
          aria-labelledby="trust-note-heading"
          className="mt-10 rounded-3xl border border-orange-100 bg-white/85 p-5 shadow-sm sm:p-6"
        >
          <h2 id="trust-note-heading" className="text-xl font-semibold text-zinc-950">
            Trust and transparency
          </h2>
          <div className="mt-4 grid gap-3 text-sm leading-6 text-zinc-700 sm:grid-cols-2 lg:grid-cols-4">
            {TRUST_TRANSPARENCY_ITEMS.map((item, index) => (
              <article key={item.title} className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4">
                <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-orange-700 ring-1 ring-orange-100">
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
                    {index === 0 && <path fill="currentColor" d="M4 6h16v3H4V6Zm1 5h14v7H5v-7Zm3 2v3h2v-3H8Zm4 0v3h4v-3h-4Z" />}
                    {index === 1 && <path fill="currentColor" d="M12 2 5 5v6c0 4.4 2.9 8.5 7 9.8 4.1-1.3 7-5.4 7-9.8V5l-7-3Zm3.4 7.8-4.1 4.1-2.2-2.2 1.3-1.3.9.9 2.8-2.8 1.3 1.3Z" />}
                    {index === 2 && <path fill="currentColor" d="M7 10V8a5 5 0 0 1 10 0v2h1v10H6V10h1Zm2 0h6V8a3 3 0 0 0-6 0v2Zm2 4v2h2v-2h-2Z" />}
                    {index === 3 && <path fill="currentColor" d="M12 3 3 7l9 4 9-4-9-4Zm-7 7v6l7 3 7-3v-6l-7 3-7-3Z" />}
                  </svg>
                </span>
                <h3 className="font-semibold text-zinc-950">{item.title}</h3>
                <p className="mt-2">{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <footer className="mt-10 border-t border-amber-200 pt-8 text-sm leading-6 text-zinc-600">
          <p>
            Built as a standalone accessible prototype for Code to Give 2026. For real
            donation handling, Love 21 would connect this journey to an approved
            payment provider and privacy-reviewed data flow.
          </p>
        </footer>
      </div>
    </main>
  );
}
