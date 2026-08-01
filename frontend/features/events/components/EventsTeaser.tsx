import { Button, Card, Section } from "@/components/ui";
import { formatEventLine } from "@/lib/format";
import { eventSessions } from "../data";

/** The three-up preview of upcoming sessions that sits on the landing page. */
export function EventsTeaser() {
  const featuredSessions = eventSessions.slice(0, 3);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8">
      <Section
        card
        eyebrow="Upcoming sessions"
        title="A few calm, friendly ways to get involved"
        description="Browse the next sessions, then visit the events page when you are ready to register interest and add a session to your calendar."
      >
        <ul className="grid gap-4 md:grid-cols-3">
          {featuredSessions.map((session) => (
            <li key={session.id}>
              <Card as="article" tone="surface" className="h-full">
                <h3 className="font-display text-xl font-bold text-ink">{session.title}</h3>
                <p className="mt-2 text-ink-soft">{session.summary}</p>
                <p className="mt-4 font-bold text-ink">
                  {formatEventLine(session.startsAt, session.location)}
                </p>
                <p className="mt-1 text-sm text-ink-soft">{session.capacityLabel}</p>
              </Card>
            </li>
          ))}
        </ul>

        <div className="mt-6">
          <Button href="/events">View all sessions</Button>
        </div>
      </Section>
    </div>
  );
}
