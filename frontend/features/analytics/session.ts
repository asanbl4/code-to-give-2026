/**
 * Who this is, to the extent that anything here knows.
 *
 * It doesn't. A session id is a random uuid in `sessionStorage`, so it dies
 * when the tab closes and there is nothing to link two visits by the same
 * person — which is exactly the limit we chose. It exists so that reading four
 * pages in one sitting counts as one visit rather than four.
 */

const SESSION_KEY = "love21.analytics.session";

/**
 * Held here as well as in sessionStorage: Safari in private mode throws on
 * every storage access, and a visitor whose browser refuses to remember them
 * should still have their page views counted consistently within the one page
 * load rather than getting a fresh id per event.
 */
let fallbackId: string | null = null;

export function sessionId(): string {
  try {
    const stored = window.sessionStorage.getItem(SESSION_KEY);
    if (stored) return stored;

    const created = crypto.randomUUID();
    window.sessionStorage.setItem(SESSION_KEY, created);
    return created;
  } catch {
    fallbackId ??= crypto.randomUUID();
    return fallbackId;
  }
}

export type DeviceClass = "mobile" | "tablet" | "desktop";

/**
 * Viewport width, not the device.
 *
 * Named `device` because that is the question staff are asking ("are people on
 * their phones?") and because parsing user-agent strings to answer it properly
 * means shipping a fingerprinting-adjacent library to learn something the
 * breakpoints already tell us. A desktop browser in a narrow window counts as
 * mobile here; for deciding where to spend design effort, that is arguably the
 * more useful answer anyway.
 */
export function deviceClass(): DeviceClass {
  const width = window.innerWidth;
  if (width < 640) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

/**
 * The language the page is currently being read in.
 *
 * Read off `<html lang>` rather than imported from the i18n feature, because
 * that attribute is what `TranslateProvider` rewrites once Google Translate has
 * settled. Reading the provider's state would couple analytics to it; reading
 * the DOM sees the same answer with no import at all.
 */
export function currentLanguage(): string {
  return document.documentElement.lang || "en";
}
