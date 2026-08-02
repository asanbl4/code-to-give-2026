import { PageShell } from "@/components/layout";
import { CommunityGoalWidget } from "@/features/community-goal/components/CommunityGoalWidget";
import { EventsTeaser } from "@/features/events/components/EventsTeaser";
import { DonationToast } from "@/features/landing/components/DonationToast";
import { FinancialBanner } from "@/features/landing/components/FinancialBanner";
import { Hero } from "@/features/landing/components/Hero";
import { NewsletterSignup } from "@/features/landing/components/NewsletterSignup";
import { ProgrammesPreview } from "@/features/landing/components/ProgrammesPreview";
import { RecentEvents } from "@/features/landing/components/RecentEvents";
import { StatsStrip } from "@/features/landing/components/StatsStrip";
import { StoriesSection } from "@/features/landing/components/StoriesSection";

export default function HomePage() {
  return (
    <PageShell width="full">
      <Hero />
      <StatsStrip />
      <FinancialBanner />
      <ProgrammesPreview />
      <StoriesSection />
      <EventsTeaser />
      <RecentEvents />
      <NewsletterSignup />

      {/* Floating overlays, not page flow. */}
      <CommunityGoalWidget />
      <DonationToast />
    </PageShell>
  );
}
