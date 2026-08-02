"use client";

import { useState } from "react";

interface ShareImpactProps {
  summary: string;
}

export function ShareImpact({ summary }: ShareImpactProps) {
  const [status, setStatus] = useState("Ready to copy a privacy-safe summary.");

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(summary);
      setStatus("Impact summary copied. Nothing was published automatically.");
    } catch {
      setStatus("Copy was not available in this browser. You can select the text manually.");
    }
  }

  return (
    <section
      aria-labelledby="share-impact-heading"
      className="overflow-hidden rounded-[2rem] border border-positive/25 bg-paper shadow-sm"
    >
      <div className="p-5 sm:p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-positive">
          Optional sharing
        </p>
        <h2 id="share-impact-heading" className="mt-2 text-2xl font-semibold text-ink">
          Share your impact
        </h2>
        <p className="mt-3 text-sm leading-6 text-ink-soft">
          Copy a short summary if you want to share it yourself. This action does
          not publish anything automatically and includes no private account details.
        </p>

        <blockquote className="mt-5 rounded-2xl border border-positive/25 bg-positive-soft p-4 text-sm leading-6 text-ink-soft">
          {summary}
        </blockquote>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={copySummary}
            className="rounded-full bg-signal px-5 py-3 text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-signal-deep motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            Copy impact summary
          </button>
          <p aria-live="polite" className="text-sm text-ink-soft">
            {status}
          </p>
        </div>
      </div>
    </section>
  );
}
