// The wire shapes mirror backend/app/features/chatbot/models.py. Keep the two
// in sync. Everything below the divider is ours alone.

export type Locale = "en" | "zh-Hant";

/** How the answer was produced. Drives the "saved answers" note in the panel. */
export type Route = "generated" | "refused" | "fallback";

export interface Action {
  label: string;
  href: string;
}

export interface Source {
  entry_id: string;
  label: string;
}

export interface Followup {
  label: string;
  question: string;
}

export interface ChatResponse {
  answer: string;
  route: Route;
  /** The nearest matching entry. A pointer, not a provenance claim. */
  sources: Source[];
  action: Action | null;
  followups: Followup[];
  locale: Locale;
}

// Result wrapper so callers handle the error case explicitly instead of throwing.
export type ChatResult =
  | { ok: true; response: ChatResponse }
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// UI-side types. Not part of the API contract.
// ---------------------------------------------------------------------------

/** One question and whatever came back for it — an answer, or a failure. */
export interface Turn {
  question: string;
  response: ChatResponse | null;
  error: string | null;
}

/** The chrome around the answers, per locale. Values live in `data.ts`. */
export interface ChatStrings {
  title: string;
  you: string;
  thinking: string;
  savedAnswers: string;
  failed: string;
  contact: string;
  greeting: string;
  inputLabel: string;
  send: string;
}
