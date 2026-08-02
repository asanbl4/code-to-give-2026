import type { GivingLeaderboardEntry, RecognitionCategory, VolunteerLeaderboardEntry } from "../types";
import { LeaderboardRow } from "./LeaderboardRow";

type LeaderboardEntry = VolunteerLeaderboardEntry | GivingLeaderboardEntry;

interface CurrentUserPositionProps {
  category: RecognitionCategory;
  entry: LeaderboardEntry | null;
}

export function CurrentUserPosition({ category, entry }: CurrentUserPositionProps) {
  if (!entry) {
    return null;
  }

  return (
    <div className="rounded-3xl border border-dashed border-edge bg-surface p-4">
      <h3 className="text-sm font-semibold text-ink">Your position</h3>
      <ol className="mt-3">
        <LeaderboardRow category={category} entry={entry} labelPrefix="Your position" />
      </ol>
    </div>
  );
}
