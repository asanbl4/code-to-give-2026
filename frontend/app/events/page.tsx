import type { Metadata } from "next";
import { PageShell } from "@/components/layout";
import { PageIntro } from "@/components/ui";
import { EventsList } from "@/features/events/components/EventsList";
import { VolunteerOnboardingOverview } from "@/features/events/components/VolunteerOnboardingOverview";
import { eventSessions } from "@/features/events/data";

export const metadata: Metadata = {
  title: "Events",
  description: "Apply to volunteer with Love 21 and preview upcoming community sessions.",
};

export default function EventsPage() {
  return (
    <PageShell>
      <PageIntro
        eyebrow="Events"
        title="Volunteer with Love 21"
        lede="Submit one application directly to Love 21, learn what happens next, and preview upcoming sessions while the team completes your onboarding."
      />

      <VolunteerOnboardingOverview />

      <div className="mt-10">
        <EventsList sessions={eventSessions} />
      </div>
    </PageShell>
  );
}
