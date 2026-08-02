"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { track } from "@/features/analytics";
import { LANGUAGES, findLanguage, isRightToLeft } from "../languages";
import { useTranslate } from "../TranslateProvider";

/**
 * The header's language control: a globe, the current language's badge, and a
 * searchable list of everything in `languages.ts`.
 *
 * It is searchable because forty-four rows is past the point where scanning
 * works, and because someone can only find their language by typing if both
 * spellings match — so the filter reads the English name and the native one.
 *
 * `translate="no"` on the whole thing is load-bearing. Without it Google
 * translates the list itself, so choosing Thai leaves you looking at forty-four
 * language names rendered in Thai, unable to find your way back to English.
 *
 * Not built on `components/ui/Combobox`: that one is a form control (full
 * width, `rounded-card`, a visible label above it) and this is a 40px chrome
 * button. Sizing it down would have meant adding three props to the shared
 * primitive that only this caller ever sets.
 */

function GlobeIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="shrink-0"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18" />
    </svg>
  );
}

export function LanguagePicker({ className }: { className?: string }) {
  const { language, setLanguage } = useTranslate();
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeRaw, setActive] = useState(0);
  const wrapper = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const current = findLanguage(language);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return LANGUAGES;
    return LANGUAGES.filter(
      (entry) =>
        entry.label.toLowerCase().includes(needle) ||
        entry.native.toLowerCase().includes(needle) ||
        entry.code.toLowerCase().startsWith(needle),
    );
  }, [query]);

  // Clamped at render, not corrected in an effect: typing shrinks the list, and
  // the pointer has to be in range for the render that shows the shorter one.
  const active = Math.min(activeRaw, Math.max(matches.length - 1, 0));

  useEffect(() => {
    if (!open) return;
    input.current?.focus();
  }, [open]);

  // Pointer-down rather than click, so the menu closes on the press that starts
  // a scroll elsewhere on the page rather than waiting for a full click.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (wrapper.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const close = () => {
    setOpen(false);
    setQuery("");
    setActive(0);
  };

  const choose = (code: string) => {
    close();
    // Which languages get chosen is the one number here that could change what
    // the charity does — it argues for translating a page properly rather than
    // leaving it to Google.
    track("language_changed");
    setLanguage(code);
  };

  return (
    <div
      ref={wrapper}
      translate="no"
      className={cn("notranslate relative", className)}
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !open) return;
        event.stopPropagation();
        close();
      }}
    >
      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Language: ${current.label}. Change language`}
        className="flex min-h-9 items-center gap-1.5 rounded-md border border-edge px-2.5 py-1 text-sm font-bold text-ink transition-colors hover:bg-surface"
      >
        <GlobeIcon />
        <span>{current.short}</span>
        <svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
          <path d="M7 10h10l-5 6-5-6Z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-72 rounded-card border-2 border-edge bg-paper p-2 shadow-lift">
          <input
            ref={input}
            type="text"
            role="combobox"
            aria-expanded
            aria-controls={listboxId}
            aria-activedescendant={matches[active] ? `${listboxId}-${active}` : undefined}
            aria-autocomplete="list"
            aria-label="Search languages"
            autoComplete="off"
            placeholder="Search languages…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                if (matches.length === 0) return;
                const step = event.key === "ArrowDown" ? 1 : -1;
                setActive((active + step + matches.length) % matches.length);
                return;
              }
              if (event.key === "Home") {
                event.preventDefault();
                setActive(0);
                return;
              }
              if (event.key === "End") {
                event.preventDefault();
                setActive(matches.length - 1);
                return;
              }
              if (event.key === "Enter" && matches[active]) {
                event.preventDefault();
                choose(matches[active].code);
              }
            }}
            className="w-full rounded-md border-2 border-edge bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-soft/70"
          />

          <span aria-live="polite" className="sr-only">
            {`${matches.length} of ${LANGUAGES.length} languages match`}
          </span>

          <ul
            id={listboxId}
            role="listbox"
            aria-label="Language"
            className="mt-2 max-h-72 overflow-y-auto"
          >
            {matches.length === 0 && (
              <li className="px-3 py-2 text-sm text-ink-soft">No language matches that.</li>
            )}
            {matches.map((entry, index) => (
              <li
                key={entry.code}
                id={`${listboxId}-${index}`}
                role="option"
                aria-selected={entry.code === current.code}
                className={cn(
                  "flex cursor-pointer items-baseline justify-between gap-3 rounded-md px-3 py-2 text-sm",
                  index === active && "bg-surface",
                  entry.code === current.code && "font-bold text-signal",
                )}
                // mousedown, not click: click fires after the input's blur, and
                // the outside-pointerdown handler closes the menu first.
                onMouseDown={(event) => {
                  event.preventDefault();
                  choose(entry.code);
                }}
                onMouseEnter={() => setActive(index)}
              >
                <span className="flex min-w-0 items-baseline gap-2">
                  {/* Decoration only. A screen reader announcing "flag of India"
                      six times adds nothing the native name has not said. */}
                  <span aria-hidden="true" className="shrink-0">
                    {entry.flag}
                  </span>
                  <span dir={isRightToLeft(entry.code) ? "rtl" : "ltr"} className="truncate">
                    {entry.native}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-ink-soft">{entry.label}</span>
              </li>
            ))}
          </ul>

          {/* Machine translation, named as such. People trust a wrong sentence
              less once they know a machine wrote it. */}
          {/* <p className="mt-2 border-t border-edge px-3 pt-2 text-xs text-ink-soft">
            Translated automatically by Google. Wording may not be exact.
          </p> */}
        </div>
      )}
    </div>
  );
}
