import type { Metadata } from "next";
import { PageShell } from "@/components/layout";
import { Card, IconBadge, PageIntro, Section, Tag } from "@/components/ui";
import { DonationExperience } from "@/features/donation/components/DonationExperience";
import { TRUST_TRANSPARENCY_ITEMS } from "@/features/donation/data";

export const metadata: Metadata = {
  title: "Donate",
  description: "A prototype donation journey for Love 21 Foundation.",
};

export default function DonatePage() {
  return (
    <PageShell>
      <Card panel padding="lg" tone="surface">
        <Tag tone="outline">Demo mode</Tag>
        <PageIntro
          className="mt-4"
          title="Help support Love 21 members and families"
          lede="Choose a donation frequency, amount, and support interest, then review a clearly labelled confirmation."
        >
          <p className="mt-6 max-w-2xl rounded-card bg-paper px-4 py-3 leading-6 text-ink-soft">
            This demo does not process real donations, collect personal information, or request
            payment details.
          </p>
        </PageIntro>
      </Card>

      <div className="mt-10">
        <DonationExperience />
      </div>

      <Section card className="mt-10" title="Trust and transparency">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST_TRANSPARENCY_ITEMS.map((item) => (
            <Card as="article" key={item.title} tone="surface">
              <IconBadge name={item.icon} className="bg-paper" />
              <h3 className="mt-3 font-display text-lg font-bold text-ink">{item.title}</h3>
              <p className="mt-2 leading-6 text-ink-soft">{item.description}</p>
            </Card>
          ))}
        </div>
      </Section>

      <p className="mt-10 border-t border-edge pt-8 leading-6 text-ink-soft">
        Built as a standalone accessible prototype for Code to Give 2026. For real donation
        handling, Love 21 would connect this journey to an approved payment provider and
        privacy-reviewed data flow.
      </p>
    </PageShell>
  );
}
