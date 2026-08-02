import { UserRound } from "lucide-react";
import { Card } from "@/components/ui";
import type { Participant } from "@/lib/api";

/**
 * A member who is not tagged in any published photo, shown as a plain card.
 *
 * Styled to match the inner cards on /what-we-do and /get-involved, so the
 * members grid reads as part of the same site rather than as the one page that
 * came out of a different toolbox.
 */
export function MemberCard({ person }: { person: Participant }) {
  return (
    <Card as="article" tone="surface" padding="lg" className="flex w-full flex-col">
      <div className="flex items-center gap-4">
        {person.avatar_url ? (
          /* eslint-disable-next-line @next/next/no-img-element -- signed URL with an
             expiring token; the image optimizer would cache it past its life. */
          <img
            src={person.avatar_url}
            alt=""
            className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-signal/30"
          />
        ) : (
          /* A member with no portrait still gets a round slot, so a row of
             cards does not step up and down where one is missing. */
          <span
            aria-hidden="true"
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-paper text-ink-soft ring-1 ring-edge"
          >
            <UserRound className="h-7 w-7 stroke-[1.5]" />
          </span>
        )}
        <div className="min-w-0">
          <h3 className="font-display text-xl font-bold leading-tight text-ink">{person.name}</h3>
          <span className="mt-1 inline-flex items-center rounded-full border border-signal/20 bg-signal-soft px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-signal-deep">
            Member
          </span>
        </div>
      </div>

      {person.headline && (
        <p className="mt-4 text-sm leading-relaxed text-ink-soft">{person.headline}</p>
      )}
    </Card>
  );
}
