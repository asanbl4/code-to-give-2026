'use client';

// The Love 21 helper's steady-state form: a large chromosome-trio mark that
// lives at the far left of the site header, ahead of the wordmark. It keeps
// itself alive with idle chatter (a rotating speech-bubble line + a paired
// action, see IDLE_CHATTER in ../data) rather than just sitting still.
// Tapping it opens <MascotFaqOverlay />, which glides the trio to the middle
// of the page as a tap-to-navigate FAQ assistant — this badge goes invisible
// (but keeps its layout space, via `invisible`) for that overlay's duration
// so there's only ever one live WebGL canvas for the mascot at a time.
//
// Before phase 'corner' (i.e. during the intro), this renders an invisible,
// canvas-less placeholder in the exact same spot instead of nothing — no
// second live WebGL context, but `badgeRef` still points at a real, laid-out
// element the whole time, so MascotIntroOverlay can measure this badge's
// actual on-screen position for its fly-out trajectory instead of
// approximating it.
import { useEffect, useRef, useState } from 'react';
import { ChromosomeTrio, type ChromosomeTrioHandle } from '@/components/chromosome-trio';
import { IDLE_CHATTER, IDLE_CHATTER_INTERVAL_MS } from '../data';
import { useMascot } from '../MascotContext';

export function MascotHeaderBadge() {
  const { phase, faqOpen, openFaq, badgeRef } = useMascot();
  const cornerTrioRef = useRef<ChromosomeTrioHandle>(null);
  const [chatterIndex, setChatterIndex] = useState(0);

  // Ambient idle chatter: cycles a speech-bubble line and plays its paired
  // action on a timer, so the badge reads as "alive" rather than a static
  // logo. Paused while the FAQ overlay is open (this badge is invisible then
  // anyway, and its canvas is about to be replaced by the overlay's).
  useEffect(() => {
    if (phase !== 'corner' || faqOpen) return;

    const interval = setInterval(() => {
      setChatterIndex((current) => {
        const next = (current + 1) % IDLE_CHATTER.length;
        cornerTrioRef.current?.playAction(1, IDLE_CHATTER[next].action);
        return next;
      });
    }, IDLE_CHATTER_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [phase, faqOpen]);

  if (phase !== 'corner') {
    return (
      <button
        ref={badgeRef}
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        disabled
        className="invisible block h-48 w-48 shrink-0 p-0"
      />
    );
  }

  return (
    <div className={faqOpen ? 'invisible relative shrink-0' : 'relative shrink-0'}>
      <button
        ref={badgeRef}
        type="button"
        onClick={openFaq}
        aria-haspopup="dialog"
        aria-expanded={faqOpen}

        aria-label="Open Love 21 helper — quick links and chat"
        className="block h-24 w-24 shrink-0 p-0 transition hover:scale-105 sm:h-48 sm:w-48"
      >
        {/*
          Scale stays small (0.55) — only the CSS container grew 3x
          (h-16/w-16 -> h-48/w-48). A camera's visible world-space width at a
          given aspect ratio doesn't depend on the container's pixel size,
          only on scale, so bumping scale here instead of (or in addition
          to) the container would clip the outer characters the same way the
          intro overlay was clipping — see the comment in
          MascotIntroOverlay.tsx. Growing the container alone renders the
          identical framing at 3x the physical size, safely.
        */}
        <ChromosomeTrio ref={cornerTrioRef} scale={0.55} />
      </button>

      {!faqOpen && (
        // Anchored inside the badge's own box (not translated past its top
        // edge): this badge sits at the very top of the page, so a bubble
        // positioned fully above it would be clipped by the viewport itself,
        // not just page content. Scale 0.55 leaves plenty of empty canvas
        // above the characters' heads for a bubble to sit in without
        // overlapping them.
        <p
          aria-live="polite"
          className="pointer-events-none absolute left-1/2 top-1 hidden w-56 -translate-x-1/2 rounded-2xl bg-white px-3 py-1.5 text-center text-xs font-bold leading-snug text-ink shadow-lift ring-1 ring-edge sm:block"
        >
          {IDLE_CHATTER[chatterIndex].text}
        </p>
      )}
    </div>
  );
}
