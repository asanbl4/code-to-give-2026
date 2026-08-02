"use client";

import { useRef, useState } from "react";
import type { CommunityRecognitionData, RecognitionCategory } from "../types";
import { LeaderboardList } from "./LeaderboardList";
import { RecognitionTabs } from "./RecognitionTabs";

const RECOGNITION_TABS: ReadonlyArray<{
  value: RecognitionCategory;
  label: string;
  description: string;
}> = [
  {
    value: "volunteer",
    label: "Volunteer Champions",
    description: "Hours and activities contributed.",
  },
  {
    value: "giving",
    label: "Giving Supporters",
    description: "Optional giving recognition with anonymous display support.",
  },
];

interface CommunityRecognitionProps {
  recognition: CommunityRecognitionData;
}

export function CommunityRecognition({ recognition }: CommunityRecognitionProps) {
  const [activeCategory, setActiveCategory] = useState<RecognitionCategory>("volunteer");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeEntries =
    activeCategory === "volunteer"
      ? recognition.volunteerChampions
      : recognition.givingSupporters;

  return (
    <section
      aria-labelledby="community-recognition-heading"
      className="rounded-[2rem] border border-purple-100 bg-white p-5 shadow-sm sm:p-6"
    >
      <p className="inline-flex rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-purple-800">
        Demo recognition data
      </p>
      <h2
        id="community-recognition-heading"
        className="mt-3 text-2xl font-semibold text-zinc-950"
      >
        Community Recognition
      </h2>

      <div className="mt-6">
        <RecognitionTabs
          activeCategory={activeCategory}
          tabs={RECOGNITION_TABS}
          tabRefs={tabRefs}
          onChange={setActiveCategory}
        />
      </div>

      {RECOGNITION_TABS.map((tab) => {
        const selected = activeCategory === tab.value;

        return (
          <div
            key={tab.value}
            id={`recognition-panel-${tab.value}`}
            role="tabpanel"
            aria-labelledby={`recognition-tab-${tab.value}`}
            hidden={!selected}
            tabIndex={0}
            className="mt-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          >
            {selected && (
              <LeaderboardList category={activeCategory} entries={activeEntries} />
            )}
          </div>
        );
      })}
    </section>
  );
}
