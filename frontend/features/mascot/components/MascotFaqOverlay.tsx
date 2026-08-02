'use client';

// The Love 21 helper's "tap to ask" mode: tapping the header badge glides
// the trio from the corner to the middle of the page (mirroring the fly
// animation MascotIntroOverlay uses on its way out, in reverse), where it
// loops through a little wave/jump/spin/wink routine while a panel sits to
// its right.
//
// That panel is the assistant. It holds both halves of "how can I help":
// MascotQuickLinks, which navigates, and the chatbot, which answers in words.
// The chat used to be a separate floating button in the bottom-right corner —
// two competing helpers on one screen, one of which the community-goal widget
// kept covering up. There is one now, and it is the mascot.
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui';
import { ChromosomeTrio, type ChromosomeTrioHandle, type ChromosomeActionName } from '@/components/chromosome-trio';
import { ChatAvatar } from '@/features/chatbot/components/ChatAvatar';
import { ChatComposer } from '@/features/chatbot/components/ChatComposer';
import { ChatTranscript } from '@/features/chatbot/components/ChatTranscript';
import { useChatConversation } from '@/features/chatbot/useChatConversation';
import {
  FLY_DURATION_MS,
  FLY_TO_CORNER_TRANSFORM,
  SLIDE_FROM_CORNER_TRANSFORM,
  mascotStageClass,
} from '../overlay';
import { useMascot } from '../MascotContext';
import { MascotQuickLinks } from './MascotQuickLinks';

const LOOP_STEPS: Array<{ action: ChromosomeActionName; expression: 'happy' | 'wink' }> = [
  { action: 'wave', expression: 'wink' },
  { action: 'jump', expression: 'happy' },
  { action: 'spin', expression: 'happy' },
  { action: 'wave', expression: 'happy' },
];
const LOOP_INTERVAL_MS = 1600;

/** Everything inside the panel that a Tab can land on. */
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function MascotFaqOverlay() {
  const router = useRouter();
  const { phase, faqOpen, closeFaq, replayIntro, badgeRef } = useMascot();
  const trioRef = useRef<ChromosomeTrioHandle>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Set when this overlay closes itself (Escape, Close, backdrop) rather than
  // navigating away, so focus goes back to whatever opened it.
  const restoreFocusRef = useRef(false);

  const { turns, pending, strings, ask } = useChatConversation();

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

  // Escape closes, and Tab cycles inside the panel.
  //
  // The trap is what earns the `aria-modal` below: this overlay dims the page
  // and swallows its clicks, so tabbing out into content nobody can reach
  // would be the "keyboard trap" failure in reverse — focus somewhere the eye
  // cannot follow. The trio's canvas is not focusable, so the panel is the
  // whole focusable world here.
  useEffect(() => {
    if (!faqOpen || closing) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        requestClose();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      // Wrap at both ends, and pull focus back in if it has escaped entirely
      // (it starts on the panel container itself, which the query misses).
      if (event.shiftKey && (active === first || !panelRef.current.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
    // requestClose is stable in everything it touches (two setStates and a
    // context setter), so it is deliberately not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faqOpen, closing]);

  // Move focus into the panel on open so the next Tab lands inside it.
  useEffect(() => {
    if (faqOpen && entered && !closing) panelRef.current?.focus();
  }, [faqOpen, entered, closing]);

  // Hand focus back to the badge, but only once the overlay has actually
  // closed: MascotHeaderBadge renders itself `invisible` (visibility: hidden)
  // for as long as this is open, and a hidden element silently refuses focus.
  // Focusing inside requestClose would therefore drop focus onto <body>.
  useEffect(() => {
    if (faqOpen || !restoreFocusRef.current) return;
    restoreFocusRef.current = false;
    badgeRef.current?.focus();
  }, [faqOpen, badgeRef]);

  // Follow the conversation as it grows. Guarded on there being a turn at all,
  // so opening the panel leaves the quick links in view rather than scrolling
  // straight past them to an empty transcript.
  useEffect(() => {
    if (turns.length === 0 || !scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [turns, pending]);

  if (phase !== 'corner' || !faqOpen) return null;

  function requestClose() {
    setClosing(true);
    restoreFocusRef.current = true;
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
      className={cn(mascotStageClass(!atCorner), 'flex-col gap-4 px-4 py-4 md:flex-row md:gap-6')}
      onClick={(event) => {
        // Backdrop only — a click that started on the panel is not a dismissal.
        if (event.target === event.currentTarget && !atCorner) requestClose();
      }}
    >
      {/* Smaller on a phone: at 300px the trio plus a usable chat panel does
          not fit in a short viewport, and the panel is the part you came for. */}
      <div
        className="h-[150px] w-[150px] shrink-0 p-0 transition-transform duration-700 ease-in-out md:h-[300px] md:w-[300px]"
        style={
          // Closing: scale+translate is safe here — the canvas has already
          // been mounted and correctly sized for a while by this point.
          // Opening (mount to first "entered" flip): translate-only — see
          // the long comment on FLY_TO_CORNER_TRANSFORM in overlay.ts for
          // why scaling this box before its first paint would otherwise
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
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Love 21 helper"
          tabIndex={-1}
          className="flex w-full min-h-0 max-w-md flex-1 flex-col overflow-hidden rounded-card bg-paper shadow-lift outline-none md:h-[32rem] md:max-h-[85vh] md:flex-none"
        >
          <header className="flex items-center justify-between gap-3 border-b border-edge px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <ChatAvatar size={10} />
              <h2 className="truncate font-display text-lg font-bold text-ink">How can I help?</h2>
            </div>
            <Button variant="quiet" size="sm" onClick={requestClose}>
              {/* Text, not an X glyph: non-negotiable #4 forbids icon-only controls. */}
              Close
            </Button>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
            {/* The quick links stay mounted once a conversation starts rather
                than being swapped out for the transcript — they scroll up out
                of view on their own, and scrolling back is how you get the
                menu again. Nothing is destroyed by asking a question. */}
            <MascotQuickLinks
              onSelect={selectFaq}
              onAsk={(question) => void ask(question)}
              onReplayIntro={() => {
                closeFaq();
                replayIntro();
              }}
            />

            <hr className="my-4 border-edge" />

            <ChatTranscript turns={turns} pending={pending} greeting={strings.greeting} strings={strings} />
          </div>

          <ChatComposer pending={pending} strings={strings} onAsk={(question) => void ask(question)} />
        </div>
      )}
    </div>
  );
}
