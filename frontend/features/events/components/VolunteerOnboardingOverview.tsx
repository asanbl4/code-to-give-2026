import { Button, Card, Tag } from "@/components/ui";

const ONBOARDING_STEPS = [
  {
    title: "Send your application",
    description: "Share your basic details, age group, preferred role, and areas of interest.",
  },
  {
    title: "Receive your application reference",
    description: "Love 21 records your application immediately. The Comms team reviews applications each Wednesday.",
  },
  {
    title: "Wait for account setup",
    description: "The team aims to create your volunteer account and send login details within 14 working days.",
  },
  {
    title: "Complete your checks",
    description: "Read the rules, provide any required documents, and wait for approval before joining a class.",
  },
] as const;

export function VolunteerOnboardingOverview() {
  return (
    <Card as="section" panel padding="lg" tone="surface" className="mt-10" aria-labelledby="onboarding-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-3xl">
          <p className="font-display text-sm font-bold uppercase tracking-[0.18em] text-signal-deep">
            Before you choose a session
          </p>
          <h2 id="onboarding-heading" className="mt-2 font-display text-2xl font-bold text-ink">
            Your volunteer onboarding journey
          </h2>
          <p className="mt-3 leading-7 text-ink-soft">
            Your application stays with Love 21. Submitting it records your interest, but it does not reserve a class place yet.
          </p>
        </div>
        <Tag tone="outline">About 14 working days</Tag>
      </div>

      <ol className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {ONBOARDING_STEPS.map((step, index) => (
          <li key={step.title} className="rounded-card border border-edge bg-paper p-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-signal-soft font-display font-bold text-signal-deep">
              {index + 1}
            </span>
            <h3 className="mt-4 font-display text-lg font-bold text-ink">{step.title}</h3>
            <p className="mt-2 text-sm leading-6 text-ink-soft">{step.description}</p>
          </li>
        ))}
      </ol>

      <p className="mt-6 rounded-card bg-highlight-soft px-4 py-3 text-sm leading-6 text-ink">
        Volunteers under 18 need a parent or guardian for the required in-person paperwork. Love 21 will explain the exact documents after reviewing your application.
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button href="/volunteer/login" variant="secondary" size="sm">
          Volunteer portal sign in
        </Button>
        <p className="text-sm text-ink-soft">Use this after Love 21 sends your portal invitation.</p>
      </div>
    </Card>
  );
}
