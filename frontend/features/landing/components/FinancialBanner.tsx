import { Button, Card } from "@/components/ui";

export function FinancialBanner() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 pb-14 sm:px-8">
      <Card tone="signal" panel padding="lg" aria-labelledby="financial-banner-heading">
        <h2
          id="financial-banner-heading"
          className="font-display text-2xl font-bold text-ink sm:text-4xl"
        >
          90% of every dollar goes directly to families
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-ink-soft">
          Families in our programmes are never charged a single dollar. Your donation funds sport,
          nutrition, and family support sessions directly.
        </p>
        <Button href="/get-involved/quiz" className="mt-6">
          Take a short quiz to find how you can help
        </Button>
      </Card>
    </section>
  );
}
