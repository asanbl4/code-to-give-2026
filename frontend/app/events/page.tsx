import type { Metadata } from "next";
import { PageShell } from "@/components/layout";
import { PageIntro } from "@/components/ui";
import { EventsList } from "@/features/events/components/EventsList";
import { eventSessions } from "@/features/events/data";

export const metadata: Metadata = {
  title: "Events",
  description: "Upcoming Love 21 Foundation sessions you can join.",
};

export default function EventsPage() {
  return (
    <PageShell>
      <PageIntro
        eyebrow="Events"
        title="Join an upcoming session"
        lede="Register your interest and add the session to your calendar right away."
      />

      <div className="mt-10">
        <EventsList sessions={eventSessions} />
      </div>
    </PageShell>
  );
}
