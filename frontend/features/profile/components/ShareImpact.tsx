"use client";

import { useState } from "react";
import { Button, Section } from "@/components/ui";

export function ShareImpact({ summary }: { summary: string }) {
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
    <Section
      card
      title="Share your impact"
      description="Copy a short summary if you want to share it yourself. This action does not publish anything automatically and includes no private account details."
    >
      <blockquote className="rounded-card bg-surface p-4 leading-6 text-ink">{summary}</blockquote>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button onClick={copySummary}>Copy impact summary</Button>
        <p aria-live="polite" className="text-ink-soft">
          {status}
        </p>
      </div>
    </Section>
  );
}
