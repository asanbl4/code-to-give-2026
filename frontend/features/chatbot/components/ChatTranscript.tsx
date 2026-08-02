"use client";

import { CONTACT_EMAIL } from "@/components/layout/navigation";
import type { ChatStrings, Turn } from "../types";
import { ChatAvatar } from "./ChatAvatar";

interface ChatTranscriptProps {
  turns: Turn[];
  pending: boolean;
  /** Shown before the first question. */
  greeting: string;
  strings: ChatStrings;
}

/**
 * The conversation so far, and the single live region that announces answers.
 *
 * One `aria-live="polite" aria-atomic="true"` region wraps the transcript and
 * each answer is rendered complete, in one go. That is why this feature does
 * not stream tokens: a screen reader re-announces a region that mutates
 * repeatedly, so streaming would read a partial answer several times over. The
 * definition of done asks for names announced once, not twice.
 *
 * The greeting sits OUTSIDE that region. It is present the moment the panel
 * opens rather than arriving as an update, and announcing it as a live change
 * would talk over the dialog's own label.
 */
export function ChatTranscript({ turns, pending, greeting, strings }: ChatTranscriptProps) {
  return (
    <div className="flex flex-col gap-5">
      {turns.length === 0 && (
        <div className="flex items-start gap-3">
          <ChatAvatar />
          <p className="rounded-2xl rounded-tl-sm bg-surface px-4 py-3 text-[0.95rem] leading-relaxed text-ink">
            {greeting}
          </p>
        </div>
      )}

      <div aria-live="polite" aria-atomic="true" className="flex flex-col gap-5">
        {turns.map((turn, position) => (
          <div key={`${position}-${turn.question}`} className="flex flex-col gap-3">
            <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-signal px-4 py-2 text-sm font-bold text-white">
              <span className="sr-only">{strings.you} </span>
              {turn.question}
            </p>

            {turn.error !== null && (
              <div className="flex items-start gap-3">
                <ChatAvatar />
                {/* Errors are a pale danger-soft panel with bold danger text,
                    never a solid fill — that treatment is what tells them apart
                    from the brand crimson. See globals.css. */}
                <div
                  role="alert"
                  className="rounded-2xl rounded-tl-sm bg-danger-soft px-4 py-3 text-sm text-danger"
                >
                  <p className="font-bold">{strings.failed}</p>
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="mt-2 inline-block font-bold underline underline-offset-2"
                  >
                    {strings.contact}
                  </a>
                </div>
              </div>
            )}

            {turn.response !== null && (
              <div className="flex items-start gap-3">
                <ChatAvatar />
                <div className="min-w-0 rounded-2xl rounded-tl-sm bg-surface px-4 py-3">
                  <p className="whitespace-pre-line text-[0.95rem] leading-relaxed text-ink">
                    {turn.response.answer}
                  </p>

                  {turn.response.action !== null && (
                    <a
                      href={turn.response.action.href}
                      className="mt-3 inline-flex min-h-11 items-center rounded-[var(--radius-button)] bg-signal px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-signal-deep"
                    >
                      {turn.response.action.label}
                    </a>
                  )}

                  {turn.response.route === "fallback" && (
                    <p className="mt-3 text-xs text-ink-soft">{strings.savedAnswers}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {pending && (
          <div className="flex items-start gap-3">
            <ChatAvatar />
            <p className="rounded-2xl rounded-tl-sm bg-surface px-4 py-3 text-sm text-ink-soft">
              {strings.thinking}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
