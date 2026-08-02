"use client";

import { useCallback, useEffect, useState } from "react";
import { postQuestion } from "./api";
import { CHAT_STRINGS } from "./data";
import type { ChatStrings, Locale, Turn } from "./types";

interface ChatConversation {
  turns: Turn[];
  pending: boolean;
  strings: ChatStrings;
  ask: (question: string) => Promise<void>;
}

/**
 * One conversation: the turns so far, and how to add to them.
 *
 * Extracted from the old floating launcher so the state does not belong to any
 * one piece of chrome — the mascot overlay renders the conversation now, and a
 * second surface (an inline "ask about this page" box, say) would use the same
 * hook rather than reimplementing the request/optimistic-turn dance.
 */
export function useChatConversation(): ChatConversation {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [pending, setPending] = useState(false);
  const [locale, setLocale] = useState<Locale>("en");
  const [easyRead, setEasyRead] = useState(false);

  // Inherit the site's language and Easy Read setting rather than owning our
  // own. The accessibility toolbar (CONTEXT §6.1) sets these on <html>.
  useEffect(() => {
    const root = document.documentElement;
    const read = () => {
      setLocale(root.lang === "zh-Hant" ? "zh-Hant" : "en");
      setEasyRead(root.dataset.easyRead === "true");
    };
    read();

    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ["lang", "data-easy-read"] });
    return () => observer.disconnect();
  }, []);

  const ask = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || pending) return;

      setPending(true);
      // The question lands in the transcript before the answer exists, so the
      // panel shows what was asked while the model works.
      setTurns((previous) => [...previous, { question: trimmed, response: null, error: null }]);

      const result = await postQuestion(trimmed, locale, easyRead);

      setTurns((previous) => {
        const next = [...previous];
        const last = next[next.length - 1];
        next[next.length - 1] = result.ok
          ? { ...last, response: result.response }
          : { ...last, error: result.error };
        return next;
      });
      setPending(false);
    },
    [pending, locale, easyRead],
  );

  return { turns, pending, strings: CHAT_STRINGS[locale], ask };
}
