"use client";

import { useState } from "react";
import { Card, Section, TabPanel, Tabs, type TabDefinition } from "@/components/ui";
import type { CommunityRecognitionData, RecognitionCategory } from "../types";
import { LeaderboardList } from "./LeaderboardList";

const RECOGNITION_TABS: ReadonlyArray<TabDefinition<RecognitionCategory>> = [
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

export function CommunityRecognition({
  recognition,
}: {
  recognition: CommunityRecognitionData;
}) {
  const [activeCategory, setActiveCategory] = useState<RecognitionCategory>("volunteer");

  const entriesFor = (category: RecognitionCategory) =>
    category === "volunteer" ? recognition.volunteerChampions : recognition.givingSupporters;

  return (
    <Section
      card
      eyebrow="Community appreciation"
      title="Community Recognition"
      description="Recognition is optional. Every gift and every hour of support matters, regardless of size."
      aside={
        <Card tone="surface" className="lg:max-w-xs">
          <p className="text-ink-soft">
            Giving recognition can be shown anonymously. Every contribution matters, whether someone
            gives time, funds, skills, or encouragement.
          </p>
        </Card>
      }
    >
      <Tabs
        label="Community recognition categories"
        idPrefix="recognition"
        tabs={RECOGNITION_TABS}
        value={activeCategory}
        onChange={setActiveCategory}
      />

      <div className="mt-6">
        {RECOGNITION_TABS.map((tab) => (
          <TabPanel key={tab.value} idPrefix="recognition" value={tab.value} active={activeCategory}>
            <LeaderboardList category={tab.value} entries={entriesFor(tab.value)} />
          </TabPanel>
        ))}
      </div>
    </Section>
  );
}
