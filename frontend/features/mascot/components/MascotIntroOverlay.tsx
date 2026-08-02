'use client';

// The Love 21 helper's first-visit welcome: a near-fullscreen, blurred-
// backdrop sequence that plays through INTRO_BEATS (see ../data) once per
// browser session. On the last beat it signs off, then visibly shrinks and
// glides toward the header (phase 'intro-exit') before handing off to
// <MascotHeaderBadge />. Phase/timing lives in MascotContext so both this
// overlay and the header badge agree on when the intro is (or isn't) active.
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import { ChromosomeTrio, type ChromosomeTrioHandle } from '@/components/chromosome-trio';
import { computeFlyTransform, mascotStageClass } from '../overlay';
import { INTRO_BEATS } from '../data';
import { useMascot } from '../MascotContext';

export function MascotIntroOverlay() {
  const router = useRouter();
  const { phase, beatIndex, finishIntro, badgeRef } = useMascot();
  const introTrioRef = useRef<ChromosomeTrioHandle>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // Fires the current beat's character actions/expressions whenever the
  // provider advances beatIndex (it owns the timers; this just reacts).
  useEffect(() => {
    INTRO_BEATS[beatIndex].actions?.forEach(({ character, action, expression }) => {
      if (action) introTrioRef.current?.playAction(character, action);
      if (expression) introTrioRef.current?.setExpression(character, expression);
    });
  }, [beatIndex]);

  // Measured once, the instant the exit begins: at that moment this box is
  // still at its full-size, centred rest position, and the header badge
  // (see MascotHeaderBadge — it renders an invisible placeholder there even
  // during the intro, specifically so this measurement is possible) is
  // sitting at its real on-screen spot. That single measurement is then
  // just animated via the CSS transition below, since neither element moves
  // again during the 700ms fly-out.
  const [flyTransform, setFlyTransform] = useState<string | null>(null);
  useEffect(() => {
    // Deliberately setState-in-effect: this reads the real DOM layout of
    // two elements (an external system, in the sense the rule cares about,
    // not React state) and there's no other point in the render cycle where
    // that measurement is valid — it must happen exactly when `phase`
    // becomes 'intro-exit', before the box's own transform-driven CSS
    // transition starts animating away from its rest position.
    if (phase !== 'intro-exit') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFlyTransform(null);
      return;
    }
    setFlyTransform(computeFlyTransform(boxRef.current, badgeRef.current));
  }, [phase, badgeRef]);

  if (phase !== 'intro' && phase !== 'intro-exit') return null;

  const flying = phase === 'intro-exit';
  const currentBeat = INTRO_BEATS[beatIndex];

  return (
    <div
      className={cn(mascotStageClass(!flying), 'flex-col gap-6 px-4')}
      role={flying ? undefined : 'dialog'}
      aria-label={flying ? undefined : 'Welcome to Love 21 Foundation'}
    >
      {!flying && (
        <button
          type="button"
          onClick={finishIntro}
          className="absolute right-5 top-5 rounded-full bg-white/90 px-4 py-2 text-sm font-bold text-ink shadow-lift hover:bg-white"
        >
          Skip
        </button>
      )}

      {/*
        Deliberately wide, not square: ChromosomeTrio's camera has a fixed
        vertical FOV, so a perspective camera's HORIZONTAL field of view
        (and therefore how much world-space width is actually visible)
        grows with the container's aspect ratio, not its pixel size. All
        three characters together are ~5.5 world units wide before scaling,
        which does not fit inside a square viewport at this camera distance
        no matter how many CSS pixels that square is — the two outer
        (yellow) characters get clipped off the sides. A ~1.7:1 wide box
        plus the wider 38° fov (see ChromosomeTrio.tsx) gives the whole trio
        a comfortable margin at scale 1.2 — nudged down slightly from 1.35
        both to help that margin and because it read as a touch large.
      */}
      <div
        ref={boxRef}
        className="h-[280px] w-[480px] p-0 transition-transform duration-700 ease-in-out sm:h-[420px] sm:w-[720px]"
        style={flying && flyTransform ? { transform: flyTransform } : undefined}
      >
        <ChromosomeTrio ref={introTrioRef} scale={1.2} />
      </div>

      {!flying && (
        <>
          {/* aria-live so screen reader users get the script too, not just
              the visual caption swap. */}
          <p
            aria-live="polite"
            className="max-w-md rounded-card bg-white px-6 py-4 text-center text-xl font-bold text-ink shadow-lift"
          >
            {currentBeat.text}
          </p>

          {currentBeat.cta && (
            <Button
              variant="donate"
              size="lg"
              onClick={() => {
                finishIntro();
                router.push(currentBeat.cta!.href);
              }}
              className="rounded-full shadow-lift"
            >
              {currentBeat.cta.label}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
