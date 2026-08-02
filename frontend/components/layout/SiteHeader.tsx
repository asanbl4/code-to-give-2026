"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import Grainient from "@/components/vendor/Grainient/Grainient";
import { track } from "@/features/analytics";
import { LanguagePicker } from "@/features/i18n";
import { MascotHeaderBadge } from "@/features/mascot/components/MascotHeaderBadge";
import { cn } from "@/lib/cn";
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
 * Nav links share the hand-drawn treatment with Donate, while Donate keeps a
 * filled berry colour so the primary action remains visually distinct.
 *
 * Right side is two stacked rows, not one: a small utility row (log in /
 * register, language picker) sits above the main nav row, using the vertical
 * room the 192px mascot badge already forces the bar to have — this does
 * NOT grow the header, both rows together are still shorter than the badge.
 *
 * ## Why the "Menu" fallback is measured rather than a breakpoint
 *
 * This used to collapse to a dropdown below `2xl` (1536px), which was a guess
 * made against the widest the bar could ever be. The bar is nowhere near that
 * wide in practice — logo and mascot come to ~475px and the nav rail to ~850px
 * — so every laptop between roughly 1400 and 1536px got the phone treatment for
 * no reason.
 *
 * A smaller hardcoded breakpoint would just move the guess. So the header
 * measures instead: if the brand block and the nav rail both fit across the
 * bar, the nav goes inline; if they don't, it collapses. That is the condition
 * the breakpoint was standing in for all along, and it keeps holding when the
 * inputs change — a fifth nav link, a longer label, a bigger mascot, or the
 * language picker switching the page to German and making every word longer.
 *
 * The rail stays mounted while collapsed (`invisible absolute`, so it keeps
 * reporting a natural width, and `inert` so it is not tabbable or read out).
 * Measuring something that isn't in the DOM is not possible, and re-measuring
 * only after showing it is how you get a flicker loop.
 */
const NAV_LINK_CLASSES =
  "whitespace-nowrap rounded-lg border-2 border-signal px-6 py-3 text-lg font-bold text-ink " +
  "transition-colors hover:bg-signal hover:text-white";

/** `gap-4` between the brand block and the nav rail, in pixels. */
const SHELL_GAP = 16;

/**
 * Breathing room demanded on top of a bare fit. Without it the nav goes inline
 * at the exact pixel it stops overflowing, which looks cramped and sits one
 * rounding error away from flipping back.
 */
const SLACK = 12;

/** `useLayoutEffect` warns when React renders this on the server. */
const useMeasureEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

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

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  // Starts collapsed so the server-rendered markup is the narrow one: a phone
  // briefly showing "Menu" before hydration is nothing, a phone briefly
  // showing an 850px nav rail is a horizontal scrollbar.
  const [inlineNav, setInlineNav] = useState(false);
  const shell = useRef<HTMLDivElement>(null);
  const brand = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);

  const measure = useCallback(() => {
    const shellEl = shell.current;
    const brandEl = brand.current;
    const railEl = rail.current;
    if (!shellEl || !brandEl || !railEl) return;

    const styles = getComputedStyle(shellEl);
    const available =
      shellEl.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
    const needed = brandEl.offsetWidth + railEl.offsetWidth + SHELL_GAP;
    const fits = needed + SLACK <= available;

    setInlineNav(fits);
    // Widening the window back into the inline nav while the dropdown is open
    // would leave a second copy of the same links floating over the page.
    if (fits) setMenuOpen(false);
  }, []);

  useMeasureEffect(() => {
    const targets = [shell.current, brand.current, rail.current];
    if (targets.some((target) => target === null)) return;

    measure();

    // Deferred a frame: a ResizeObserver callback that resizes something is how
    // you get "ResizeObserver loop completed with undelivered notifications" in
    // the console, and this one always does — flipping the nav changes the
    // layout of everything it observes.
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    });
    for (const target of targets) observer.observe(target!);

    // Web fonts land after first paint and change every label's width. The
    // observers above catch that too, but only once something reflows.
    document.fonts?.ready.then(measure).catch(() => {});

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [measure]);

  // No `overflow-hidden` on the <header>, deliberately. It used to be there to
  // keep the Grainient inside the bar, but it also clipped anything hanging
  // *below* the bar — the language menu and the "Menu" dropdown were cut off at
  // the header's bottom edge, which reads as the hero image sitting on top of
  // them. The clip now lives on the Grainient wrapper, the only thing that ever
  // needed it.
  return (
    <header className="sticky top-0 z-30 bg-white shadow-card">
      {/* Purely decorative — aria-hidden, pointer-events none, absolutely
          positioned so it never affects layout or interaction. `overflow-hidden`
          so the canvas stays within the bar. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
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

      <div
        ref={shell}
        className="relative mx-auto flex w-full items-center justify-between gap-4 px-5 py-1.5 sm:px-8"
      >
        {/* `shrink-0`, not `min-w-0`: this block is what the measurement reads,
            and a box flex has been allowed to squeeze reports a width the nav
            would not actually have room beside. */}
        <div ref={brand} className="flex shrink-0 items-center gap-2">
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
              // Kept just under the mascot badge's height (the other half of
              // what sets the bar's height, in MascotHeaderBadge) so the
              // wordmark and the mascot read as a pair rather than competing.
              className="h-20 w-auto sm:h-[98px]"
            />
          </Link>
          <MascotHeaderBadge />
        </div>

        {!inlineNav && (
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="site-nav"
            className="min-h-11 shrink-0 rounded-full border-2 border-edge px-5 text-lg font-bold text-ink"
          >
            Menu
          </button>
        )}

        <div
          ref={rail}
          inert={!inlineNav}
          className={cn(
            // `w-max` in both states, so the width this reports is the width
            // the content actually wants. Collapsed, this box is absolutely
            // positioned and would otherwise be shrink-to-fit against the
            // viewport — on a phone it would measure 375px while its children
            // overflowed it, and report a fit that isn't one.
            "flex w-max shrink-0 flex-col items-end gap-2",
            !inlineNav && "pointer-events-none invisible fixed left-0 top-0",
          )}
        >
          <div className="flex items-center gap-3">
            <Button href="/profile" variant="quiet" size="sm">
              Log in / Register
            </Button>
            <LanguagePicker />
          </div>

          <nav aria-label="Main" className="flex items-center gap-2">
            {NAV_LINKS.map((link) => (
              <Button
                key={link.href}
                href={link.href}
                variant="secondary"
                size="lg"
                onClick={() => track("nav_link_clicked")}
                className="nav-handwritten-button whitespace-nowrap"
              >
                {link.label}
              </Button>
            ))}
            <Button
              href="/donate"
              variant="donate"
              size="lg"
              onClick={() => track("donate_clicked")}
              className="donate-button ml-2"
            >
              Donate
              <Heart aria-hidden="true" size={22} strokeWidth={2.8} />
            </Button>
          </nav>
        </div>

        {/* Narrow fallback: the same links, stacked, in a floating card —
            separate from the rail above, which is hidden whenever this exists. */}
        {menuOpen && !inlineNav && (
          <nav
            id="site-nav"
            aria-label="Main"
            className="absolute inset-x-4 top-20 z-40 flex flex-col gap-2 rounded-card bg-paper p-4 shadow-lift ring-1 ring-edge"
          >
            {NAV_LINKS.map((link) => (
              <Button
                key={link.href}
                href={link.href}
                variant="secondary"
                size="lg"
                onClick={() => {
                  track("nav_link_clicked");
                  setMenuOpen(false);
                }}
                className="nav-handwritten-button"
              >
                {link.label}
              </Button>
            ))}
            <Button
              href="/donate"
              variant="donate"
              size="lg"
              className="donate-button"
              onClick={() => {
                track("donate_clicked");
                setMenuOpen(false);
              }}
            >
              Donate
              <Heart aria-hidden="true" size={22} strokeWidth={2.8} />
            </Button>
            <div className="mt-2 flex items-center gap-3 border-t border-edge pt-3">
              <Button href="/profile" variant="quiet" size="sm" onClick={() => setMenuOpen(false)}>
                Log in / Register
              </Button>
              <LanguagePicker />
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
