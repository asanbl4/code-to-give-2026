import type { RefObject } from "react";
import { Button, Card } from "@/components/ui";
import type { DonationSummaryDetails } from "../types";
import { DonationDetails } from "./DonationDetails";

interface DonationReviewProps {
  details: DonationSummaryDetails;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onBack: () => void;
  onComplete: () => void;
}

export function DonationReview({
  details,
  headingRef,
  onBack,
  onComplete,
}: DonationReviewProps) {
  return (
    <Card as="section" panel padding="lg" aria-labelledby="donation-review-heading">
      <p className="font-display text-sm font-bold uppercase tracking-[0.18em] text-signal-deep">
        Review
      </p>
      <h2
        ref={headingRef}
        id="donation-review-heading"
        tabIndex={-1}
        className="mt-2 font-display text-2xl font-bold text-ink outline-none sm:text-3xl"
      >
        Review your donation selection
      </h2>
      <p className="mt-3 max-w-2xl text-ink-soft">
        Check your selections before moving to the demo confirmation. No payment details or personal
        information are requested.
      </p>

      <DonationDetails details={details} className="mt-8" />

      <div className="mt-6 rounded-card bg-highlight-soft p-4 leading-6 text-ink">
        <p>
          This is a hackathon prototype. Completing this step will show a confirmation state only;
          it will not process a real donation.
        </p>
        {details.impactStatement && (
          <p className="mt-3">
            <span className="font-bold">Verified impact: </span>
            {details.impactStatement}
          </p>
        )}
      </div>

      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onBack}>
          Back to edit
        </Button>
        <Button variant="donate" onClick={onComplete}>
          Complete prototype donation
        </Button>
      </div>
    </Card>
  );
}
