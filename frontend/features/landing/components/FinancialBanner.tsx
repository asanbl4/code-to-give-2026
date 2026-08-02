import { Button, Card } from "@/components/ui";
import { ImpactDonut } from "./ImpactDonut";

export function FinancialBanner() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 pb-14 sm:px-8">
      <Card tone="signal" panel padding="lg" aria-labelledby="financial-banner-heading">
        <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2
              id="financial-banner-heading"
              className="font-display text-2xl font-bold text-ink sm:text-4xl"
            >
              90% of every dollar goes directly to families
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-ink-soft">
              Families in our programmes are never charged a single dollar. Your donation funds
              sport, nutrition, and family support sessions directly.
            </p>
            {/* /quiz, not /get-involved/quiz — the latter has never existed.
                The matching quiz is a top-level route, and get-involved's own
                "Take the Matching Quiz" button has always pointed at it. */}
            <Button href="/quiz" className="mt-6">
              Take a short quiz to find how you can help
            </Button>
          </div>

          <ImpactDonut percent={90} label="of every dollar reaches families directly" />
        </div>
      </Card>
    </section>
  );
}
