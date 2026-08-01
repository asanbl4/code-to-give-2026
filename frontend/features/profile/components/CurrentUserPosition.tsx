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
    <div className="mt-5 rounded-3xl border border-dashed border-zinc-300 bg-zinc-50 p-4">
      <h3 className="text-sm font-semibold text-zinc-950">Your position</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-600">
        Your result remains visible without ranking language that suggests shame or
        comparison pressure.
      </p>
      <ol className="mt-4">
        <LeaderboardRow category={category} entry={entry} labelPrefix="Your position" />
      </ol>
    </div>
  );
}
