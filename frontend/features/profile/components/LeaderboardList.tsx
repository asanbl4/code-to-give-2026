import type { LeaderboardEntry, RecognitionCategory } from "../types";
import { LeaderboardRow } from "./LeaderboardRow";

const VISIBLE_ROWS = 5;

interface LeaderboardListProps {
  category: RecognitionCategory;
  entries: ReadonlyArray<LeaderboardEntry>;
}

export function LeaderboardList({ category, entries }: LeaderboardListProps) {
  const visibleEntries = entries.slice(0, VISIBLE_ROWS);
  const currentProfileOutsideTop =
    entries.slice(VISIBLE_ROWS).find((entry) => entry.isCurrentProfile) ?? null;

  return (
    <div>
      <ol className="space-y-3">
        {visibleEntries.map((entry) => (
          <LeaderboardRow key={entry.id} category={category} entry={entry} />
        ))}
      </ol>

      {/* Someone outside the top five still sees where they stand, without the
          page implying they should have given more. */}
      {currentProfileOutsideTop && (
        <div className="mt-5 rounded-card border-2 border-dashed border-edge bg-surface p-4">
          <h3 className="font-bold text-ink">Your position</h3>
          <p className="mt-2 text-ink-soft">
            Your result remains visible without ranking language that suggests shame or comparison
            pressure.
          </p>
          <ol className="mt-4">
            <LeaderboardRow
              category={category}
              entry={currentProfileOutsideTop}
              labelPrefix="Your position"
            />
          </ol>
        </div>
      )}
    </div>
  );
}
