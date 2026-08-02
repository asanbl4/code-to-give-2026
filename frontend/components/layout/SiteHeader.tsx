"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui";
import { MascotHeaderBadge } from "@/features/mascot/components/MascotHeaderBadge";
import { cn } from "@/lib/cn";
import Grainient from "@/components/vendor/Grainient/Grainient";
import { NAV_LINKS } from "./navigation";

/**
 * One header for the whole site.
 *
 * Sticky: stays visible while scrolling, so Donate and the nav are always one
 * tap away.
 *
 * Bar is a near-white Grainient (barely-there warmth, not the earlier
 * yellow-orange one) so it reads as neutral rather than colouring the whole
 * top of every page.
 *
 * Nav links: red border, square-ish corners (rounded-lg, not rounded-full)
 * for contrast against the pale bar — a deliberate change from the softer
 * grey-border pill look.
 *
 * Right side is two stacked rows, not one: a small utility row (log in /
 * register, language toggle) sits above the main nav row, using the vertical
 * room the 192px mascot badge already forces the bar to have — this does
 * NOT grow the header, both rows together are still shorter than the badge.
 *
 * Nav (and the utility row) only go inline at 2xl — logo + mascot badge
 * alone need ~550px, so anything narrower falls back to the "Menu" dropdown
 * rather than the two colliding (see MascotHeaderBadge overlap fix).
 */
const NAV_LINK_CLASSES =
  "whitespace-nowrap rounded-lg border-2 border-signal px-6 py-3 text-lg font-bold text-ink " +
  "transition-colors hover:bg-signal hover:text-white";

function HeartIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="currentColor"
      className="shrink-0"
    >
      <path d="M12 21s-6.7-4.35-9.5-8.2C.6 10.1 1 6.6 3.6 4.9c2.2-1.4 5-1 6.6 1 .6.7 1.3 1.7 1.8 2.5.5-.8 1.2-1.8 1.8-2.5 1.6-2 4.4-2.4 6.6-1 2.6 1.7 3 5.2 1.1 7.9C18.7 16.65 12 21 12 21z" />
    </svg>
  );
}

// UI-only for now: there's no i18n/locale routing set up in this repo (single
// English tree under app/), so this just toggles which label looks active —
// it doesn't translate anything yet. Wire it up to real locale routes before
// this goes live.
function LanguageToggle() {
  const [lang, setLang] = useState<"en" | "zh">("en");

  return (
    <div className="flex overflow-hidden rounded-md border border-edge text-sm font-bold" role="group" aria-label="Language">
      <button
        type="button"
        onClick={() => setLang("en")}
        aria-pressed={lang === "en"}
        className={cn("px-2.5 py-1", lang === "en" ? "bg-signal text-white" : "text-ink-soft hover:bg-surface")}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang("zh")}
        aria-pressed={lang === "zh"}
        className={cn("px-2.5 py-1", lang === "zh" ? "bg-signal text-white" : "text-ink-soft hover:bg-surface")}
      >
        繁
      </button>
    </div>
  );
}

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 overflow-hidden bg-white shadow-card">
      {/* Purely decorative — aria-hidden, pointer-events none, absolutely
          positioned so it never affects layout or interaction. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <Grainient
          color1="#FFFFFF"
          color2="#F5F3EE"
          color3="#FAF9F6"
          timeSpeed={0.05}
          warpFrequency={3}
          warpAmplitude={20}
          grainAmount={0.03}
          contrast={1.05}
          saturation={0.9}
          zoom={1.4}
          blendSoftness={0.2}
        />
      </div>

      <div className="relative mx-auto flex w-full items-center justify-between gap-4 px-5 py-2 sm:px-8">
        <div className="flex min-w-0 items-center gap-2">
          <Link href="/" aria-label="Love 21 Foundation home" className="shrink-0">
            {/* Plain <img>, not next/image — the Tailwind height class was not
                visibly taking effect through next/image's own sizing.
                Sized to roughly match the header bar's own height (which the
                192px mascot badge next to it now sets) rather than a fixed
                small size, so it reads as the dominant leftmost mark instead
                of a small icon dwarfed by the mascot. */}
            <img
              src="/images/love21-logo.png"
              alt="Love 21 Foundation"
              style={{ height: "168px", width: "auto" }}
            />
          </Link>
          <MascotHeaderBadge />
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="site-nav"
          className="min-h-11 rounded-full border-2 border-edge px-5 text-lg font-bold text-ink 2xl:hidden"
        >
          Menu
        </button>

        <div className="hidden flex-col items-end gap-2 2xl:flex">
          <div className="flex items-center gap-3">
            <Button href="/profile" variant="quiet" size="sm">
              Log in / Register
            </Button>
            <LanguageToggle />
          </div>

          <nav aria-label="Main" className="flex items-center gap-2">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className={NAV_LINK_CLASSES}>
                {link.label}
              </Link>
            ))}
            <Button
              href="/donate"
              variant="secondary"
              size="lg"
              className="ml-2"
              style={{ backgroundColor: "#ec4899", borderColor: "#ec4899", color: "#fff" }}
            >
              <HeartIcon />
              Donate
            </Button>
          </nav>
        </div>

        {/* Mobile/narrow fallback: the same links, stacked, in a floating
            card — separate from the <nav> above since that one only mounts
            at 2xl and this is the opposite. */}
        {menuOpen && (
          <nav
            aria-label="Main"
            className="absolute inset-x-4 top-20 z-40 flex flex-col gap-2 rounded-card bg-paper p-4 shadow-lift ring-1 ring-edge 2xl:hidden"
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={NAV_LINK_CLASSES}
              >
                {link.label}
              </Link>
            ))}
            <Button
              href="/donate"
              variant="secondary"
              size="lg"
              style={{ backgroundColor: "#ec4899", borderColor: "#ec4899", color: "#fff" }}
              onClick={() => setMenuOpen(false)}
            >
              <HeartIcon />
              Donate
            </Button>
            <div className="mt-2 flex items-center gap-3 border-t border-edge pt-3">
              <Button href="/profile" variant="quiet" size="sm" onClick={() => setMenuOpen(false)}>
                Log in / Register
              </Button>
              <LanguageToggle />
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
