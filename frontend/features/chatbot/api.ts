import { API_URL } from "@/lib/api";
import type { ChatResult, Locale } from "./types";

/** Longer than the backend's own 20s cap, so the server's fallback wins first. */
const CLIENT_TIMEOUT_MS = 25_000;

/**
 * Ask the backend one question.
 *
 * Unlike every other fetch in this app, this runs in the BROWSER — the panel is
 * a Client Component. That makes CORS_ORIGINS in backend/.env load-bearing for
 * the first time; a CORS failure surfaces here as a generic network error.
 */
export async function postQuestion(
  question: string,
  locale: Locale,
  easyRead: boolean,
): Promise<ChatResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, locale, easy_read: easyRead }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return { ok: false, error: `${response.status} ${response.statusText}` };
    }

    return { ok: true, response: await response.json() };
  } catch (cause) {
    const aborted = cause instanceof DOMException && cause.name === "AbortError";
    return {
      ok: false,
      error: aborted ? "timeout" : `Could not reach the assistant. (${cause})`,
    };
  } finally {
    clearTimeout(timeout);
  }
}
