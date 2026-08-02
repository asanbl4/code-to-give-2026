'use client';

import { MASCOT_FAQS } from '../data';

interface MascotQuickLinksProps {
  /** Navigate to a shortcut's destination (`kind: 'link'` questions). */
  onSelect: (href: string) => void;
  /** Feed a question straight to the chatbot (`kind: 'ask'` questions) —
   *  for things that don't map to a page, like "why is your mascot 3
   *  chromosomes". */
  onAsk: (question: string) => void;
  /** Re-play the full-screen welcome sequence. */
  onReplayIntro: () => void;
}

/**
 * The half of the helper that navigates: the common questions, each of which
 * either jumps straight to the page that answers it or asks the chatbot
 * directly, plus the intro replay.
 *
 * Buttons rather than links, because picking a `link` one has to reset the
 * overlay's animation state before routing — see `selectFaq` in
 * MascotFaqOverlay.
 */
export function MascotQuickLinks({ onSelect, onAsk, onReplayIntro }: MascotQuickLinksProps) {
  return (
    <nav aria-label="Quick links">
      <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-ink-soft">
        Popular questions
      </p>
      <ul className="flex flex-col gap-1.5">
        {MASCOT_FAQS.map((faq) => (
          <li key={faq.question}>
            <button
              type="button"
              onClick={() => (faq.kind === 'ask' ? onAsk(faq.question) : onSelect(faq.href))}
              className="block w-full rounded-[var(--radius-button)] px-3 py-2 text-left text-sm font-bold text-ink hover:bg-surface"
            >
              {faq.question}
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onReplayIntro}
        className="mt-2 w-full rounded-[var(--radius-button)] border-t border-edge px-3 pt-3 text-left text-xs font-bold text-ink-soft hover:text-ink"
      >
        ↺ Watch the intro again
      </button>
    </nav>
  );
}
