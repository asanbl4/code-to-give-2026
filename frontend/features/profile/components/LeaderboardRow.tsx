import { Tag } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatHkd } from "@/lib/format";
import type { LeaderboardEntry, RecognitionCategory, VolunteerLeaderboardEntry } from "../types";

function isVolunteerEntry(entry: LeaderboardEntry): entry is VolunteerLeaderboardEntry {
  return entry.category === "volunteer";
}

interface LeaderboardRowProps {
  category: RecognitionCategory;
  entry: LeaderboardEntry;
  labelPrefix?: string;
}

export function LeaderboardRow({ category, entry, labelPrefix = "Rank" }: LeaderboardRowProps) {
  const metrics = isVolunteerEntry(entry)
    ? [
        { label: "Volunteer hours", value: entry.volunteerHours },
        { label: "Activities", value: entry.activitiesAttended },
      ]
    : [
        { label: "Giving total", value: formatHkd(entry.donationTotalHkd) },
        { label: "Contributions", value: entry.contributionCount },
      ];

  return (
    <li
      className={cn(
        "rounded-card border-2 p-4",
        entry.isCurrentProfile
          ? category === "volunteer"
            ? "border-positive bg-positive-soft"
            : "border-signal bg-signal-soft"
          : "border-edge bg-paper",
      )}
    >
      <div className="grid gap-3 sm:grid-cols-[6rem_minmax(0,1fr)_8rem_8rem] sm:items-center">
        <div>
          <span className="block text-xs font-bold uppercase tracking-[0.16em] text-ink-soft">
            {labelPrefix}
          </span>
          <span className="mt-1 block font-bold text-ink">Rank {entry.rank}</span>
        </div>

        <div>
          <p className="font-bold text-ink">{entry.displayName}</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {entry.isAnonymous && <Tag tone="quiet">Anonymous display</Tag>}
            {entry.isCurrentProfile && <Tag tone="outline">Your profile</Tag>}
          </div>
          {entry.supportInterest && (
            <p className="mt-2 text-sm text-ink-soft">Interest: {entry.supportInterest}</p>
          )}
        </div>

        {metrics.map((metric) => (
          <div key={metric.label}>
            <span className="block text-sm text-ink-soft">{metric.label}</span>
            <span className="mt-1 block font-bold text-ink">{metric.value}</span>
          </div>
        ))}
      </div>
    </li>
  );
}
