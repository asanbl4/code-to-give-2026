// Mirrors backend/app/features/chatbot/models.py. Keep the two in sync.

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
