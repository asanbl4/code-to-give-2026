import type { RefObject } from "react";
import { Button, Card } from "@/components/ui";
import type { DonationSummaryDetails } from "../types";
import { DonationDetails } from "./DonationDetails";

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
    <Card
      as="section"
      tone="positive"
      panel
      padding="lg"
      aria-labelledby="donation-thank-you-heading"
    >
      <p className="font-display text-sm font-bold uppercase tracking-[0.18em] text-positive">
        Prototype complete
      </p>
      <h2
        ref={headingRef}
        id="donation-thank-you-heading"
        tabIndex={-1}
        className="mt-2 font-display text-2xl font-bold text-ink outline-none sm:text-3xl"
      >
        Thank you for trying the donation journey
      </h2>
      <p className="mt-3 max-w-2xl text-ink-soft">
        No real donation was processed, and no payment or personal details were collected. This
        confirmation only summarizes the prototype selection.
      </p>

      <DonationDetails details={details} className="mt-8" />

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button onClick={onStartAgain}>Start again</Button>
        <Button href="/profile" variant="secondary">
          View impact profile
        </Button>
        <Button href="/" variant="secondary">
          Return home
        </Button>
        <Button variant="quiet" disabled>
          Learn about volunteering — coming soon
        </Button>
      </div>
    </Card>
  );
}
