import { Card, Tag } from "@/components/ui";
import { formatEventRange } from "@/lib/format";
import type { EventSession } from "../types";
import { EventSignupFlow } from "./EventSignupFlow";

export function EventsList({ sessions }: { sessions: readonly EventSession[] }) {
  return (
    <ul className="grid gap-4">
      {sessions.map((session) => (
        <li key={session.id}>
          <Card as="article" padding="lg">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-2xl">
                <h2 className="font-display text-2xl font-bold text-ink">{session.title}</h2>
                <p className="mt-3 text-ink-soft">{session.summary}</p>
              </div>
              <Tag tone="outline">{session.capacityLabel}</Tag>
            </div>

            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="font-bold text-ink">When</dt>
                <dd className="mt-1 text-ink-soft">
                  {formatEventRange(session.startsAt, session.endsAt)}
                </dd>
              </div>
              <div>
                <dt className="font-bold text-ink">Where</dt>
                <dd className="mt-1 text-ink-soft">{session.location}</dd>
              </div>
            </dl>

            <EventSignupFlow session={session} />
          </Card>
        </li>
      ))}
    </ul>
  );
}
