"use client";

import { useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export interface ComboboxOption {
  value: string;
  label: string;
  /** A second line under the label — a headline, a match score. */
  hint?: string;
}

interface ComboboxProps {
  id: string;
  label: string;
  /** Keep the label for screen readers but not on screen. */
  labelHidden?: boolean;
  options: ComboboxOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  /** The "nobody" entry pinned above the results. Omit to make clearing impossible. */
  clearLabel?: string;
  /** An entry pinned below the results, handed whatever was typed. */
  action?: { label: string; onSelect: (query: string) => void };
  className?: string;
}

const CONTROL =
  "w-full rounded-card border-2 border-edge bg-paper px-4 py-3 text-ink " +
  "transition-colors placeholder:text-ink-soft/70 " +
  "disabled:cursor-not-allowed disabled:bg-surface disabled:opacity-70";

/**
 * A select you can type into.
 *
 * The admin lists every member in a dropdown per detected face. That was a
 * native `<select>`, which is fine at a dozen members and unusable at two
 * hundred — and it had nowhere to put "this person isn't in the list yet".
 *
 * Follows the ARIA 1.2 combobox pattern: focus never leaves the input, and the
 * active option is pointed at with `aria-activedescendant` rather than moved
 * to. No focus-visible classes here — `globals.css` owns focus.
 */
export function Combobox({
  id,
  label,
  labelHidden,
  options,
  value,
  onChange,
  placeholder = "Search…",
  disabled,
  clearLabel,
  action,
  className,
}: ComboboxProps) {
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeRaw, setActive] = useState(0);
  const wrapper = useRef<HTMLDivElement>(null);

  const selected = options.find((option) => option.value === value) ?? null;

  // Closed, the input shows the chosen person. Open, it shows what is being
  // typed — so typing filters without destroying the current selection.
  const display = open ? query : (selected?.label ?? "");

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(needle) ||
        option.hint?.toLowerCase().includes(needle),
    );
  }, [options, query]);

  /**
   * The keyboard ring: the clear entry, then the matches, then the action.
   * Flattened so arrow keys treat all three the same, because to someone using
   * the keyboard they are all just entries in a list.
   */
  const entries = useMemo(() => {
    const rows: { key: string; label: string; hint?: string; onSelect: () => void }[] = [];
    if (clearLabel) {
      rows.push({ key: "__clear", label: clearLabel, onSelect: () => onChange(null) });
    }
    for (const option of matches) {
      rows.push({
        key: option.value,
        label: option.label,
        hint: option.hint,
        onSelect: () => onChange(option.value),
      });
    }
    if (action) {
      rows.push({ key: "__action", label: action.label, onSelect: () => action.onSelect(query) });
    }
    return rows;
  }, [action, clearLabel, matches, onChange, query]);

  // Clamped here rather than corrected in an effect: typing shrinks the list,
  // and the pointer has to be in range for the render that shows the shorter
  // list, not one render later.
  const active = Math.min(activeRaw, Math.max(entries.length - 1, 0));

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  const commit = (index: number) => {
    entries[index]?.onSelect();
    close();
  };

  return (
    <div ref={wrapper} className={cn("relative", className)}>
      <label htmlFor={id} className={cn("block font-bold text-ink", labelHidden && "sr-only")}>
        {label}
      </label>

      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={open && entries[active] ? `${listboxId}-${active}` : undefined}
        aria-autocomplete="list"
        autoComplete="off"
        disabled={disabled}
        value={display}
        placeholder={selected ? selected.label : placeholder}
        className={cn(CONTROL, !labelHidden && "mt-2")}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          setActive(0);
        }}
        onBlur={(event) => {
          // Ignore focus moving between the input and its own options.
          if (wrapper.current?.contains(event.relatedTarget)) return;
          close();
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            if (!open) return;
            // Without this the Escape would keep travelling and close the
            // dialog this combobox is sitting in.
            event.stopPropagation();
            event.preventDefault();
            close();
            return;
          }
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (!open) {
              setOpen(true);
              return;
            }
            const step = event.key === "ArrowDown" ? 1 : -1;
            setActive((active + step + entries.length) % entries.length);
            return;
          }
          if (event.key === "Home" && open) {
            event.preventDefault();
            setActive(0);
            return;
          }
          if (event.key === "End" && open) {
            event.preventDefault();
            setActive(entries.length - 1);
            return;
          }
          if (event.key === "Enter" && open && entries[active]) {
            event.preventDefault();
            commit(active);
          }
        }}
      />

      <span aria-live="polite" className="sr-only">
        {open ? `${matches.length} of ${options.length} match` : ""}
      </span>

      {open && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={label}
          className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-card border-2 border-edge bg-paper py-1 shadow-card"
        >
          {entries.length === 0 && (
            <li className="px-4 py-3 text-ink-soft">No one matches that.</li>
          )}
          {entries.map((entry, index) => (
            <li
              key={entry.key}
              id={`${listboxId}-${index}`}
              role="option"
              aria-selected={entry.key === value}
              className={cn(
                "cursor-pointer px-4 py-2.5",
                index === active && "bg-surface",
                entry.key === value && "font-bold",
                entry.key === "__action" && "border-t-2 border-edge text-signal",
              )}
              // mousedown, not click: click fires after blur, and blur closes
              // the list before the selection would land.
              onMouseDown={(event) => {
                event.preventDefault();
                commit(index);
              }}
              onMouseEnter={() => setActive(index)}
            >
              {entry.label}
              {entry.hint && <span className="block text-sm text-ink-soft">{entry.hint}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
