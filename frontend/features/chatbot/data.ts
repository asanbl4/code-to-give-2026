// UI chrome in both locales (#5). Answers themselves are bilingual in the
// backend corpus; these are the labels around them.
import type { ChatStrings, Locale } from "./types";

export const CHAT_STRINGS: Record<Locale, ChatStrings> = {
  en: {
    title: "Ask for help",
    you: "You asked:",
    thinking: "Thinking…",
    savedAnswers: "Answering from saved answers.",
    failed: "Sorry — I could not answer just now.",
    contact: "Email a person",
    greeting:
      "Hi! I'm the Love 21 assistant. Ask me anything about our programmes, volunteering or donating.",
    inputLabel: "Type your question",
    send: "Send",
  },
  "zh-Hant": {
    title: "尋求協助",
    you: "你問：",
    thinking: "思考中…",
    savedAnswers: "正使用已儲存的答案回覆。",
    failed: "抱歉——暫時無法回答。",
    contact: "電郵聯絡真人",
    greeting: "你好！我是愛21的助理。有關課程、義工或捐款的問題，都可以問我。",
    inputLabel: "輸入你的問題",
    send: "傳送",
  },
};
