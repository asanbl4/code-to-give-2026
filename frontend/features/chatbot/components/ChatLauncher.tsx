"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { postQuestion } from "../api";
import type { Locale } from "../types";
import { ChatPanel } from "./ChatPanel";
import { ChatTranscript, type Turn } from "./ChatTranscript";
import { SuggestedQuestions } from "./SuggestedQuestions";

/**
 * UI chrome in both locales (#5). Answers themselves are bilingual in the
 * backend corpus; these are the labels around them.
 */
const STRINGS = {
  en: {
    launcher: "Ask for help",
    title: "Ask for help",
    close: "Close",
    you: "You asked:",
    thinking: "Thinking…",
    savedAnswers: "Answering from saved answers.",
    failed: "Sorry — I could not answer just now.",
    contact: "Talk to a person",
    startHeading: "Try one of these",
    nextHeading: "You could also ask",
    inputLabel: "Type your question",
    send: "Send",
  },
  "zh-Hant": {
    launcher: "尋求協助",
    title: "尋求協助",
    close: "關閉",
    you: "你問：",
    thinking: "思考中…",
    savedAnswers: "正使用已儲存的答案回覆。",
    failed: "抱歉——暫時無法回答。",
    contact: "與真人聯絡",
    startHeading: "試試這些問題",
    nextHeading: "你也可以問",
    inputLabel: "輸入你的問題",
    send: "傳送",
  },
} as const;

/** Exact trigger text from the corpus, so they also match without Ollama. */
const OPENING_QUESTIONS = {
  en: [
    { label: "What is Love 21?", question: "what is Love 21" },
    { label: "Who can join?", question: "who can join" },
    { label: "Where does my money go?", question: "where does my money go" },
  ],
  "zh-Hant": [
    { label: "甚麼是愛21？", question: "甚麼是愛21" },
    { label: "誰可以參加？", question: "誰可以參加" },
    { label: "捐款用在哪裡？", question: "捐款用在哪裡" },
  ],
} as const;

export function ChatLauncher() {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [pending, setPending] = useState(false);
  const [draft, setDraft] = useState("");
  const [locale, setLocale] = useState<Locale>("en");
  const [easyRead, setEasyRead] = useState(false);

  const launcherRef = useRef<HTMLButtonElement>(null);

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

  const strings = STRINGS[locale];

  const ask = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || pending) return;

      setPending(true);
      setDraft("");
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

  const lastResponse = turns[turns.length - 1]?.response ?? null;
  const suggestions =
    lastResponse !== null
      ? lastResponse.followups.map((f) => ({ label: f.label, question: f.question }))
      : [...OPENING_QUESTIONS[locale]];

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        aria-expanded={open}
        className="fixed bottom-6 right-6 z-40 min-h-[3rem] rounded-full border border-zinc-800 bg-zinc-900 px-6 py-3 text-base font-semibold text-zinc-50 shadow-lg hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
      >
        {strings.launcher}
      </button>

      <ChatPanel
        open={open}
        onClose={() => setOpen(false)}
        launcherRef={launcherRef}
        title={strings.title}
        closeLabel={strings.close}
      >
        <ChatTranscript turns={turns} pending={pending} strings={strings} />

        <SuggestedQuestions
          questions={suggestions}
          onPick={ask}
          disabled={pending}
          heading={turns.length === 0 ? strings.startHeading : strings.nextHeading}
        />

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void ask(draft);
          }}
          className="mt-4 flex flex-col gap-2"
        >
          <label htmlFor="chat-input" className="text-sm font-medium text-zinc-700">
            {strings.inputLabel}
          </label>
          <input
            id="chat-input"
            type="text"
            value={draft}
            maxLength={500}
            onChange={(event) => setDraft(event.target.value)}
            className="min-h-[2.75rem] rounded-lg border border-zinc-400 px-3 py-2 text-base text-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
          />
          <button
            type="submit"
            disabled={pending || draft.trim().length === 0}
            className="min-h-[2.75rem] rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-50 hover:bg-zinc-800 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
          >
            {strings.send}
          </button>
        </form>
      </ChatPanel>
    </>
  );
}
