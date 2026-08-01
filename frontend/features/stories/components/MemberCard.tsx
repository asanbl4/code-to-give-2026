import { Card } from "@/components/ui";
import type { Participant } from "@/lib/api";

/** A member who is not tagged in any published photo, shown as a plain card. */
export function MemberCard({ person }: { person: Participant }) {
  return (
    <Card as="article" tone="surface" padding="lg" className="h-full">
      <div className="flex items-center gap-4">
        {person.avatar_url && (
          /* eslint-disable-next-line @next/next/no-img-element -- signed URL with an
             expiring token; the image optimizer would cache it past its life. */
          <img
            src={person.avatar_url}
            alt=""
            className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-highlight"
          />
        )}
        <h3 className="font-display text-2xl font-bold leading-tight text-ink">{person.name}</h3>
      </div>
      {person.headline && <p className="mt-4 text-ink-soft">{person.headline}</p>}
      {person.progress_summary && (
        <p className="mt-3 border-l-4 border-signal pl-3 font-bold text-ink">
          {person.progress_summary}
        </p>
      )}
    </Card>
  );
}
