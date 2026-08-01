import type { GivingLeaderboardEntry, RecognitionCategory, VolunteerLeaderboardEntry } from "../types";
import { CurrentUserPosition } from "./CurrentUserPosition";
import { LeaderboardRow } from "./LeaderboardRow";

type LeaderboardEntry = VolunteerLeaderboardEntry | GivingLeaderboardEntry;

interface LeaderboardListProps {
  category: RecognitionCategory;
  entries: ReadonlyArray<LeaderboardEntry>;
}

export function LeaderboardList({ category, entries }: LeaderboardListProps) {
  const visibleEntries = entries.slice(0, 5);
  const currentProfileOutsideTopFive =
    entries.find((entry) => entry.isCurrentProfile && !visibleEntries.includes(entry)) ?? null;

  return (
    <div>
      <ol className="space-y-3">
        {visibleEntries.map((entry) => (
          <LeaderboardRow key={entry.id} category={category} entry={entry} />
        ))}
      </ol>
      <CurrentUserPosition category={category} entry={currentProfileOutsideTopFive} />
    </div>
  );
}
