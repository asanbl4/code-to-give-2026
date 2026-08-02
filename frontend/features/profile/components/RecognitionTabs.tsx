import type { KeyboardEvent, RefObject } from "react";
import type { RecognitionCategory } from "../types";

interface RecognitionTab {
  value: RecognitionCategory;
  label: string;
  description: string;
}

interface RecognitionTabsProps {
  activeCategory: RecognitionCategory;
  tabs: ReadonlyArray<RecognitionTab>;
  tabRefs: RefObject<Array<HTMLButtonElement | null>>;
  onChange: (category: RecognitionCategory) => void;
}

export function RecognitionTabs({
  activeCategory,
  tabs,
  tabRefs,
  onChange,
}: RecognitionTabsProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }

    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (index + direction + tabs.length) % tabs.length;
    const nextTab = tabs[nextIndex];

    onChange(nextTab.value);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label="Community recognition categories"
      className="grid gap-2 rounded-2xl bg-zinc-100 p-2 sm:grid-cols-2"
    >
      {tabs.map((tab, index) => {
        const selected = activeCategory === tab.value;

        return (
          <button
            key={tab.value}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            id={`recognition-tab-${tab.value}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`recognition-panel-${tab.value}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`rounded-xl px-4 py-3 text-left text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-700 motion-reduce:transition-none ${
              selected
                ? "bg-white text-zinc-950 shadow-sm ring-1 ring-purple-200"
                : "text-zinc-600 hover:bg-white/70"
            }`}
          >
            <span className="block font-semibold">{tab.label}</span>
            <span className="mt-1 block text-xs">{tab.description}</span>
            {selected && <span className="mt-1 block text-xs font-semibold">Selected view</span>}
          </button>
        );
      })}
    </div>
  );
}
