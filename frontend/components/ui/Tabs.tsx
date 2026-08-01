"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface TabDefinition<T extends string> {
  value: T;
  label: string;
  description?: string;
}

interface TabsProps<T extends string> {
  /** Names the tablist for assistive tech. */
  label: string;
  /** Namespaces the generated tab and panel ids so two tablists can coexist. */
  idPrefix: string;
  tabs: ReadonlyArray<TabDefinition<T>>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/**
 * An accessible tablist: roving tabindex, arrow-key navigation that wraps, and
 * the aria-controls / aria-labelledby pair wired to `<TabPanel>`.
 *
 * This lived inside the profile feature and took a `tabRefs` ref array as a
 * prop, which meant its parent had to know how focus management worked. The
 * refs are the component's own business now.
 */
export function Tabs<T extends string>({
  label,
  idPrefix,
  tabs,
  value,
  onChange,
  className,
}: TabsProps<T>) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const offsets: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1 };
    const offset = offsets[event.key];
    if (offset === undefined) return;

    event.preventDefault();
    const nextIndex = (index + offset + tabs.length) % tabs.length;
    onChange(tabs[nextIndex].value);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn("grid gap-2 rounded-card bg-surface p-2 sm:grid-cols-2", className)}
    >
      {tabs.map((tab, index) => {
        const selected = tab.value === value;

        return (
          <button
            key={tab.value}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            id={`${idPrefix}-tab-${tab.value}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel-${tab.value}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              "rounded-card px-4 py-3 text-left transition-colors",
              selected ? "bg-paper text-ink ring-2 ring-signal" : "text-ink-soft hover:bg-paper/70",
            )}
          >
            <span className="block font-bold">{tab.label}</span>
            {tab.description && <span className="mt-1 block text-sm">{tab.description}</span>}
            {/* State in words, not colour alone. */}
            {selected && <span className="mt-1 block text-sm font-bold">Selected view</span>}
          </button>
        );
      })}
    </div>
  );
}

interface TabPanelProps<T extends string> {
  idPrefix: string;
  value: T;
  active: T;
  children: ReactNode;
}

export function TabPanel<T extends string>({
  idPrefix,
  value,
  active,
  children,
}: TabPanelProps<T>) {
  if (value !== active) return null;

  return (
    <div
      id={`${idPrefix}-panel-${value}`}
      role="tabpanel"
      aria-labelledby={`${idPrefix}-tab-${value}`}
      tabIndex={0}
    >
      {children}
    </div>
  );
}
