"use client";

import { useState } from "react";
import type { GivingLeaderboardEntry, RecognitionCategory, VolunteerLeaderboardEntry } from "../types";
import { CurrentUserPosition } from "./CurrentUserPosition";
import { LeaderboardRow } from "./LeaderboardRow";

type LeaderboardEntry = VolunteerLeaderboardEntry | GivingLeaderboardEntry;

interface LeaderboardListProps {
  category: RecognitionCategory;
  entries: ReadonlyArray<LeaderboardEntry>;
}

export function LeaderboardList({ category, entries }: LeaderboardListProps) {
  const [expanded, setExpanded] = useState(false);
  const visibleEntries = entries.slice(0, 3);
  const currentProfileOutsideTopThree =
    entries.find((entry) => entry.isCurrentProfile && !visibleEntries.includes(entry)) ?? null;
  const fullListId = `recognition-full-list-${category}`;

  return (
    <div className="space-y-4">
      <ol className="grid gap-3">
        {visibleEntries.map((entry) => (
          <LeaderboardRow key={entry.id} category={category} entry={entry} />
        ))}
      </ol>
      <CurrentUserPosition category={category} entry={currentProfileOutsideTopThree} />

      <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-4">
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={fullListId}
          onClick={() => setExpanded((current) => !current)}
          className="flex w-full items-center justify-between gap-3 text-left text-sm font-semibold text-zinc-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-700"
        >
          <span>View full recognition list</span>
          <span className="rounded-full bg-white px-3 py-1 text-xs text-purple-800 ring-1 ring-purple-100">
            {entries.length} entries
          </span>
        </button>
        {expanded && (
          <div id={fullListId}>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              Demonstration recognition data is shown for review. Recognition remains
              optional and can include anonymous display.
            </p>
            <ol className="mt-4 grid gap-3">
              {entries.map((entry) => (
                <LeaderboardRow
                  key={`full-${entry.id}`}
                  category={category}
                  entry={entry}
                  labelPrefix="Rank"
                />
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
