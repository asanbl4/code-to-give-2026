"use client";

import type { ChatResponse } from "../types";

export interface Turn {
  question: string;
  response: ChatResponse | null;
  error: string | null;
}

interface ChatTranscriptProps {
  turns: Turn[];
  pending: boolean;
  strings: {
    you: string;
    thinking: string;
    savedAnswers: string;
    failed: string;
    contact: string;
  };
}

/**
 * The conversation so far, and the single live region that announces answers.
 *
 * One `aria-live="polite" aria-atomic="true"` region wraps the whole transcript
 * and each answer is rendered complete, in one go. That is why this feature does
 * not stream tokens: a screen reader re-announces a region that mutates
 * repeatedly, so streaming would read a partial answer several times over. The
 * definition of done asks for names announced once, not twice.
 */
export function ChatTranscript({ turns, pending, strings }: ChatTranscriptProps) {
  return (
    <div aria-live="polite" aria-atomic="true" className="flex flex-col gap-5">
      {turns.map((turn, position) => (
        <div key={`${position}-${turn.question}`} className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-zinc-600">
            {strings.you} {turn.question}
          </p>

          {turn.error !== null && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p>{strings.failed}</p>
              <a
                href="/contact"
                className="mt-2 inline-block font-medium underline underline-offset-2"
              >
                {strings.contact}
              </a>
            </div>
          )}

          {turn.response !== null && (
            <div className="rounded-lg bg-zinc-100 px-4 py-3">
              <p className="whitespace-pre-line text-[0.95rem] leading-relaxed text-zinc-900">
                {turn.response.answer}
              </p>

              {turn.response.action !== null && (
                <a
                  href={turn.response.action.href}
                  className="mt-3 inline-block min-h-[2.75rem] rounded-lg bg-zinc-900 px-4 py-3 text-sm font-semibold text-zinc-50 hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                >
                  {turn.response.action.label}
                </a>
              )}

              {turn.response.route === "fallback" && (
                <p className="mt-3 text-xs text-zinc-600">{strings.savedAnswers}</p>
              )}
            </div>
          )}
        </div>
      ))}

      {pending && <p className="text-sm text-zinc-600">{strings.thinking}</p>}
    </div>
  );
}
