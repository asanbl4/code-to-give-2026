import { Button, Section } from "@/components/ui";
import { RECENT_EVENTS } from "../data";

export function RecentEvents() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 pb-14 sm:px-8">
      <Section title="Recent activity">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {RECENT_EVENTS.map((event) => (
            <li key={event.id}>
              <div
                className="flex h-56 flex-col justify-end rounded-card bg-surface bg-cover bg-center p-4 ring-1 ring-edge"
                style={{ backgroundImage: `url(${event.image})` }}
              >
                <span className="rounded-card bg-ink/80 px-3 py-2 font-bold text-white">
                  {event.caption}
                </span>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-6">
          <Button href="/news-stories" variant="secondary">
            Read more
          </Button>
        </div>
      </Section>
    </div>
  );
}
