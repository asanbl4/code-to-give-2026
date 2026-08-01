import { Card, Section } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { ProfileActivity } from "../types";

export function RecentActivitySection({
  activities,
}: {
  activities: ReadonlyArray<ProfileActivity>;
}) {
  return (
    <Section
      card
      title="Recent activity"
      description="Recent giving and volunteering activity linked to this supporter profile."
    >
      <ul>
        {activities.map((activity) => (
          <li key={activity.id} className="relative border-l-2 border-edge pb-6 pl-6 last:pb-0">
            <span className="absolute -left-[9px] top-0 flex h-4 w-4 rounded-full bg-paper ring-2 ring-edge">
              <span
                className={cn(
                  "m-auto h-2 w-2 rounded-full",
                  activity.kind === "donation" ? "bg-signal" : "bg-positive",
                )}
              />
            </span>
            <Card as="article" tone="surface">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink-soft">
                    {activity.kind}
                  </p>
                  <h3 className="mt-2 font-display text-lg font-bold text-ink">{activity.title}</h3>
                </div>
                <p className="font-bold text-ink-soft">{activity.dateLabel}</p>
              </div>
              <p className="mt-3 leading-6 text-ink-soft">{activity.description}</p>
            </Card>
          </li>
        ))}
      </ul>
    </Section>
  );
}
