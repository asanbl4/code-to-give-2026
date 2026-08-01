import { IconBadge, Section, type IconBadgeTone } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { SupporterBadge } from "../types";

const TONES: Record<SupporterBadge["tone"], { card: string; badge: IconBadgeTone }> = {
  volunteer: { card: "bg-positive-soft ring-positive/25", badge: "positive" },
  community: { card: "bg-signal-soft ring-signal/25", badge: "signal" },
  support: { card: "bg-highlight-soft ring-highlight/45", badge: "highlight" },
};

export function MilestonesSection({ badges }: { badges: ReadonlyArray<SupporterBadge> }) {
  return (
    <Section
      card
      title="Milestones and badges"
      description="Badges recognise participation. They do not rank supporters by wealth or suggest that larger donors are better people."
    >
      <ul className="grid gap-4 sm:grid-cols-2">
        {badges.map((badge) => {
          const tone = TONES[badge.tone];

          return (
            <li key={badge.id} className={cn("rounded-card p-4 ring-1", tone.card)}>
              <div className="flex items-start gap-3">
                <IconBadge name="star" tone={tone.badge} className="bg-paper" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink-soft">
                    Earned badge
                  </p>
                  <h3 className="mt-2 font-display text-lg font-bold text-ink">{badge.label}</h3>
                </div>
              </div>
              <p className="mt-2 leading-6 text-ink-soft">{badge.description}</p>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
