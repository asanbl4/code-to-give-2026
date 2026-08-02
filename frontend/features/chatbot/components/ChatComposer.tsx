"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui";
import { track } from "@/features/analytics";
import type { ChatStrings } from "../types";

interface ChatComposerProps {
  pending: boolean;
  strings: ChatStrings;
  onAsk: (question: string) => void;
}

/**
 * The "type a question" row.
 *
 * Owns the draft, so the surface rendering the conversation does not have to.
 * The label is visible rather than a placeholder: placeholder-as-label
 * disappears the moment someone starts typing, which is exactly when a reader
 * who needs it is most likely to check what the field was for.
 *
 * No focus styles here — `globals.css` owns the one focus ring.
 */
export function ChatComposer({ pending, strings, onAsk }: ChatComposerProps) {
  const [draft, setDraft] = useState("");
  const inputId = useId();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!draft.trim() || pending) return;
        // The question itself is never recorded — only that one was asked.
        // What a parent types into a chatbot on a Down syndrome charity's site
        // can be extraordinarily sensitive, and a count answers "is anyone
        // using this" without holding any of it.
        track("chatbot_message_sent");
        onAsk(draft);
        setDraft("");
      }}
      className="flex flex-col gap-2 border-t border-edge p-3"
    >
      <label htmlFor={inputId} className="px-1 text-sm font-bold text-ink-soft">
        {strings.inputLabel}
      </label>
      <div className="flex items-end gap-2">
        <input
          id={inputId}
          type="text"
          value={draft}
          maxLength={500}
          autoComplete="off"
          onChange={(event) => setDraft(event.target.value)}
          className="min-h-11 min-w-0 flex-1 rounded-[var(--radius-button)] border-2 border-edge bg-paper px-3 py-2 text-base text-ink"
        />
        <Button type="submit" size="sm" disabled={pending || draft.trim().length === 0}>
          {strings.send}
        </Button>
      </div>
    </form>
  );
}
