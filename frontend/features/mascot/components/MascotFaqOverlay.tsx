'use client';

// The Love 21 helper's "tap to ask" mode: tapping the header badge glides
// the trio from the corner to the middle of the page (mirroring the fly
// animation MascotIntroOverlay uses on its way out, in reverse), where it
// loops through a little wave/jump/spin/wink routine while a short FAQ list
// sits to its right. Picking a question navigates straight to the relevant
// page; closing it glides the trio back to the header.
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/cn';
import { ChromosomeTrio, type ChromosomeTrioHandle, type ChromosomeActionName } from '@/components/chromosome-trio';
import { FLY_DURATION_MS, FLY_TO_CORNER_TRANSFORM, SLIDE_FROM_CORNER_TRANSFORM } from '../flyAnimation';
import { MASCOT_FAQS } from '../data';
import { useMascot } from '../MascotContext';

const LOOP_STEPS: Array<{ action: ChromosomeActionName; expression: 'happy' | 'wink' }> = [
  { action: 'wave', expression: 'wink' },
  { action: 'jump', expression: 'happy' },
  { action: 'spin', expression: 'happy' },
  { action: 'wave', expression: 'happy' },
];
const LOOP_INTERVAL_MS = 1600;

export function MascotFaqOverlay() {
  const router = useRouter();
  const { phase, faqOpen, closeFaq, replayIntro } = useMascot();
  const trioRef = useRef<ChromosomeTrioHandle>(null);

  // `entered` flips true one frame after mount so the CSS transition
  // actually animates from "at the corner" to "centered" instead of
  // starting there. `closing` reverses that for the glide-back-out.
  const [entered, setEntered] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!faqOpen) return;
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, [faqOpen]);

  // Looping wave/jump/spin/wink routine while the assistant is up.
  useEffect(() => {
    if (!faqOpen || closing) return;
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % LOOP_STEPS.length;
      const step = LOOP_STEPS[i];
      trioRef.current?.playAction(1, step.action);
      trioRef.current?.setExpression(1, step.expression);
    }, LOOP_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [faqOpen, closing]);

  if (phase !== 'corner' || !faqOpen) return null;

  function requestClose() {
    setClosing(true);
    setTimeout(() => {
      closeFaq();
      // Reset for the next time this opens — otherwise a stale `closing:
      // true` or `entered: true` from this close would make the box render
      // "already at the corner" instead of animating in on the next open.
      setClosing(false);
      setEntered(false);
    }, FLY_DURATION_MS);
  }

  function selectFaq(href: string) {
    closeFaq();
    // Same reset as requestClose (see its comment) — matters here too since
    // an in-page anchor link (e.g. /#newsletter) can navigate without
    // unmounting this component, unlike a real route change.
    setEntered(false);
    router.push(href);
  }

  const atCorner = closing || !entered;

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] flex items-center justify-center gap-6 px-4 transition-colors duration-700',
        atCorner ? 'pointer-events-none bg-transparent backdrop-blur-none' : 'bg-ink/45 backdrop-blur-sm',
      )}
      role="dialog"
      aria-label="Love 21 helper"
    >
      {!atCorner && (
        <button
          type="button"
          onClick={requestClose}
          aria-label="Close Love 21 helper"
          className="absolute right-5 top-5 rounded-full bg-white/90 px-4 py-2 text-sm font-bold text-ink shadow-lift hover:bg-white"
        >
          Close
        </button>
      )}

      <div
        className="h-[300px] w-[300px] shrink-0 p-0 transition-transform duration-700 ease-in-out"
        style={
          // Closing: scale+translate is safe here — the canvas has already
          // been mounted and correctly sized for a while by this point.
          // Opening (mount to first "entered" flip): translate-only — see
          // the long comment on FLY_TO_CORNER_TRANSFORM in flyAnimation.ts
          // for why scaling this box before its first paint would otherwise
          // permanently wreck the canvas's size.
          closing ? { transform: FLY_TO_CORNER_TRANSFORM } : !entered ? { transform: SLIDE_FROM_CORNER_TRANSFORM } : undefined
        }
      >
        {/* scale 0.75 keeps this square container's framing safely within
            the camera's visible width — see MascotIntroOverlay's comment on
            why square containers clip at higher scales. */}
        <ChromosomeTrio ref={trioRef} scale={0.75} />
      </div>

      {!atCorner && (
        <div role="menu" aria-label="Frequently asked questions" className="w-full max-w-sm rounded-card bg-white p-4 shadow-lift">
          <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-ink-soft">How can I help?</p>
          <ul className="flex flex-col gap-1.5">
            {MASCOT_FAQS.map((faq) => (
              <li key={faq.question}>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => selectFaq(faq.href)}
                  className="block w-full rounded-md px-3 py-2 text-left text-sm font-semibold text-ink hover:bg-surface"
                >
                  {faq.question}
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => {
              closeFaq();
              replayIntro();
            }}
            className="mt-2 w-full rounded-md border-t border-edge px-3 pt-3 text-left text-xs font-bold text-ink-soft hover:text-ink"
          >
            ↺ Watch the intro again
          </button>
        </div>
      )}
    </div>
  );
}
