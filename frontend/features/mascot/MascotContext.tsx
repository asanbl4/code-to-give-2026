'use client';

// Shared phase/timing state for the Love 21 mascot. Split out from the visual
// components because the mascot has multiple independent DOM locations that
// all need to agree on the same state: the full-screen intro overlay, the
// small header badge, and the FAQ assistant overlay — see
// MascotIntroOverlay.tsx, MascotHeaderBadge.tsx, MascotFaqOverlay.tsx.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { FLY_DURATION_MS } from './flyAnimation';
import { INTRO_BEATS, MASCOT_SESSION_KEY } from './data';

// 'intro-exit' is a distinct phase (not just a local animation flag) so
// MascotIntroOverlay can keep rendering — shrinking and gliding toward the
// header — for FLY_DURATION_MS after the last beat, instead of vanishing
// the instant the sequence ends.
export type MascotPhase = 'loading' | 'intro' | 'intro-exit' | 'corner';

interface MascotContextValue {
  phase: MascotPhase;
  beatIndex: number;
  finishIntro: () => void;
  /** Re-plays the full-screen welcome sequence on demand (e.g. from the FAQ
   *  overlay's "watch the intro again" link), regardless of whether this
   *  session already saw it. Session storage stays marked as seen — this is
   *  a manual replay, not a first-visit state. */
  replayIntro: () => void;
  /** Whether the FAQ assistant overlay (tap-to-center) is open. Only
   *  meaningful once phase === 'corner'. */
  faqOpen: boolean;
  openFaq: () => void;
  closeFaq: () => void;
}

const MascotContext = createContext<MascotContextValue | null>(null);

// Dwell after each beat's caption lands before the next one (or the outro)
// starts, so captions are actually readable rather than flashing by.
const OUTRO_DWELL_SECONDS = 2;

export function MascotProvider({ children }: { children: ReactNode }) {
  // Starts as 'loading' rather than guessing intro/corner, so the very first
  // render (server + client) matches and we avoid a hydration mismatch —
  // sessionStorage is only readable client-side.
  const [phase, setPhase] = useState<MascotPhase>('loading');
  const [beatIndex, setBeatIndex] = useState(0);
  const [faqOpen, setFaqOpen] = useState(false);

  useEffect(() => {
    const alreadySeen = window.sessionStorage.getItem(MASCOT_SESSION_KEY);
    // Deliberately setState-in-effect rather than a lazy useState initializer:
    // an initializer runs during render, including the client's first render
    // before hydration — reading sessionStorage there would make that first
    // client render disagree with the server-rendered 'loading' markup and
    // trigger a hydration error. The effect defers this until after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPhase(alreadySeen ? 'corner' : 'intro');
  }, []);

  useEffect(() => {
    if (phase !== 'intro') return;

    const timers: ReturnType<typeof setTimeout>[] = [];

    INTRO_BEATS.forEach((beat, index) => {
      timers.push(setTimeout(() => setBeatIndex(index), beat.at * 1000));
    });

    const lastBeat = INTRO_BEATS[INTRO_BEATS.length - 1];
    timers.push(setTimeout(() => finishIntro(), (lastBeat.at + OUTRO_DWELL_SECONDS) * 1000));

    return () => timers.forEach(clearTimeout);
    // Intentionally runs once per 'intro' phase entry, not per beat.
  }, [phase]);

  function finishIntro() {
    window.sessionStorage.setItem(MASCOT_SESSION_KEY, '1');
    // Hand off to MascotIntroOverlay's fly-out animation rather than jumping
    // straight to 'corner' — see the MascotPhase comment above.
    setPhase('intro-exit');
    setTimeout(() => setPhase('corner'), FLY_DURATION_MS);
  }

  function replayIntro() {
    setBeatIndex(0);
    setPhase('intro');
  }

  return (
    <MascotContext.Provider
      value={{
        phase,
        beatIndex,
        finishIntro,
        replayIntro,
        faqOpen,
        openFaq: () => setFaqOpen(true),
        closeFaq: () => setFaqOpen(false),
      }}
    >
      {children}
    </MascotContext.Provider>
  );
}

export function useMascot(): MascotContextValue {
  const ctx = useContext(MascotContext);
  if (!ctx) throw new Error('useMascot must be used within a MascotProvider');
  return ctx;
}
