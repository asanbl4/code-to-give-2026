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
 * Traditional Chinese, however `features/i18n` spells it.
 *
 * The backend answers in two locales; the language picker offers about forty,
 * as Google Translate codes, and writes the chosen one to `<html lang>`. It
 * says `zh-TW` where this feature says `zh-Hant`, so match on the script rather
 * than the exact tag — otherwise choosing 繁體中文 quietly falls through to the
 * English corpus and machine-translates it, when staff-written Chinese was
 * sitting right there. That matters most for the refusal entries, where the
 * wording is deliberate.
 *
 * Simplified (`zh-CN`, `zh-Hans`) and bare `zh` are intentionally not matched:
 * the corpus has no Simplified text, so English-then-translated is the honest
 * fallback.
 */
const TRADITIONAL_CHINESE = /^zh-(Hant|TW|HK|MO)/i;

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
  // own. The accessibility toolbar (CONTEXT §6.1) and the i18n language picker
  // both write to <html>, so watching it is how this stays in step with either.
  useEffect(() => {
    const root = document.documentElement;
    const read = () => {
      setLocale(TRADITIONAL_CHINESE.test(root.lang) ? "zh-Hant" : "en");
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
