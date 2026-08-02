"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { INCLUDED_LANGUAGES, SOURCE_LANGUAGE } from "./languages";

/**
 * Whole-site translation, via Google's website translator.
 *
 * This is the approach `code-to-give-2025` took (`client/src/components/
 * GoogleTranslate.jsx` plus a `LanguageContext`), for the reason it took it:
 * there is exactly one English content tree under `app/`, and hand-writing
 * message catalogues for forty-odd languages is not work anyone here is going
 * to finish. Google's widget translates whatever is on the page, including the
 * chatbot's answers and the copy that comes out of the backend, at the cost of
 * machine-translation quality.
 *
 * The widget itself is mounted hidden. Its own dropdown is Google-branded,
 * unstyleable and ~200px wide; we drive its hidden `<select class="goog-te-combo">`
 * instead and render our own picker. That select IS the API — Google publishes
 * no other one — so if a future version of the widget renames it, translation
 * silently stops working and `ready` stays false. That is the trade.
 *
 * **This is a third-party script that reads the whole page.** It is loaded from
 * translate.google.com on every route, so the DOM (not form input, but every
 * word of visible content) goes to Google. Nothing here is private, but say so
 * if a privacy policy is ever written.
 *
 * Known rough edge, inherited from the technique rather than this code: Google
 * replaces React's text nodes with its own `<font>` wrappers, so a component
 * that later re-renders that exact text can throw "failed to execute removeChild".
 * If that shows up on a specific widget, mark it `className="notranslate"` —
 * that tells Google to leave it alone.
 */

const COOKIE_NAME = "googtrans";
const SCRIPT_ID = "google-translate-script";
const ELEMENT_ID = "google_translate_element";
const CALLBACK_NAME = "__love21GoogleTranslateInit";

declare global {
  interface Window {
    google?: {
      translate?: {
        TranslateElement: {
          new (options: Record<string, unknown>, elementId: string): unknown;
          InlineLayout: { SIMPLE: unknown };
        };
      };
    };
    [CALLBACK_NAME]?: () => void;
  }
}

interface TranslateContextValue {
  /** The language currently applied to the page. */
  language: string;
  /** Switch languages. Falls back to a reload if the widget has not loaded. */
  setLanguage: (code: string) => void;
  /** True once Google's hidden `<select>` exists and can be driven. */
  ready: boolean;
}

const TranslateContext = createContext<TranslateContextValue>({
  language: SOURCE_LANGUAGE,
  setLanguage: () => {},
  ready: false,
});

/**
 * The cookie Google reads on page load, and the only piece of state that
 * survives a navigation. Its value is `/<source>/<target>`; some browsers hand
 * it back percent-encoded, hence the decode.
 */
function readLanguageCookie(): string {
  if (typeof document === "undefined") return SOURCE_LANGUAGE;
  const entry = document.cookie
    .split("; ")
    .find((pair) => pair.startsWith(`${COOKIE_NAME}=`));
  if (!entry) return SOURCE_LANGUAGE;
  const target = decodeURIComponent(entry.slice(COOKIE_NAME.length + 1)).split("/")[2];
  return target || SOURCE_LANGUAGE;
}

/**
 * Written host-only *and* domain-wide, because Google's own widget writes both
 * and reads whichever it finds first — set only one and a stale copy of the
 * other can quietly win on the next load. Skipped for hostnames without a dot
 * (`localhost`), where a `domain=` cookie is rejected outright.
 */
function writeLanguageCookie(code: string) {
  const value = `/${SOURCE_LANGUAGE}/${code}`;
  const attributes = "path=/;max-age=31536000;samesite=lax";
  document.cookie = `${COOKIE_NAME}=${value};${attributes}`;
  const host = window.location.hostname;
  if (host.includes(".")) {
    document.cookie = `${COOKIE_NAME}=${value};domain=.${host};${attributes}`;
  }
}

function findCombo(): HTMLSelectElement | null {
  return document.querySelector<HTMLSelectElement>(".goog-te-combo");
}

/*
  The cookie is the state, so it is subscribed to rather than copied into
  `useState`. That matters for one specific reason: the server cannot read it,
  so the first render has to say "English" and the second has to say whatever
  was chosen. Doing that with an effect is a hydration-safe but lint-flagged
  cascade; `useSyncExternalStore` is the API that exists for exactly this shape,
  and its `getServerSnapshot` makes the English-on-the-server part explicit.

  Nothing else writes the cookie, so `emit` is called by hand from setLanguage
  rather than there being anything real to listen to.
*/
let listeners: (() => void)[] = [];

function subscribe(onChange: () => void) {
  listeners.push(onChange);
  return () => {
    listeners = listeners.filter((listener) => listener !== onChange);
  };
}

function emit() {
  for (const listener of listeners) listener();
}

export function TranslateProvider({ children }: { children: React.ReactNode }) {
  const language = useSyncExternalStore(
    subscribe,
    readLanguageCookie,
    () => SOURCE_LANGUAGE,
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    window[CALLBACK_NAME] = () => {
      const constructor = window.google?.translate?.TranslateElement;
      if (!constructor || !document.getElementById(ELEMENT_ID)) return;
      // No `layout` option on purpose. `InlineLayout.SIMPLE` — which is what
      // code-to-give-2025 passes — builds the compact link-and-menu gadget,
      // which has no `<select>` in it at all, so `.goog-te-combo` never appears
      // and every language change silently degrades to the reload path.
      // Omitting `layout` gives the default `<select>`, which is the thing this
      // whole file is built to drive. Verified in a browser: with SIMPLE the
      // widget renders `goog-te-gadget-simple` and no combo.
      new constructor(
        {
          pageLanguage: SOURCE_LANGUAGE,
          includedLanguages: INCLUDED_LANGUAGES,
          autoDisplay: false,
          multilanguagePage: true,
        },
        ELEMENT_ID,
      );
    };

    // The widget builds its `<select>` a tick or two after the constructor
    // returns, and there is no callback for it — polling is the only signal.
    // Capped at ~10s so a blocked or offline script stops the timer instead of
    // spinning for the life of the tab.
    let attempts = 0;
    const poll = window.setInterval(() => {
      attempts += 1;
      if (findCombo()) {
        setReady(true);
        window.clearInterval(poll);
      } else if (attempts > 50) {
        window.clearInterval(poll);
      }
    }, 200);

    // Guarded by id, not by a module flag: React 19's dev double-mount would
    // otherwise append the script twice, and Google's init is not idempotent.
    if (!document.getElementById(SCRIPT_ID)) {
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.async = true;
      script.src = `https://translate.google.com/translate_a/element.js?cb=${CALLBACK_NAME}`;
      document.body.appendChild(script);
    } else {
      window[CALLBACK_NAME]?.();
    }

    return () => window.clearInterval(poll);
  }, []);

  // Keeps <html lang> honest, which is what a screen reader picks its voice
  // from. `dir` is deliberately left alone: this codebase styles with physical
  // properties (`ml-2`, `left-0`, `pl-4`), so flipping the document for Arabic
  // or Hebrew would half-mirror it into something worse than plain LTR text.
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((code: string) => {
    writeLanguageCookie(code);

    const combo = findCombo();
    if (!combo) {
      // No widget yet — the cookie is enough, Google applies it on load.
      window.location.reload();
      return;
    }

    combo.value = code;
    combo.dispatchEvent(new Event("change"));
    emit();
  }, []);

  const value = useMemo(
    () => ({ language, setLanguage, ready }),
    [language, setLanguage, ready],
  );

  return (
    <TranslateContext.Provider value={value}>
      {children}
      {/*
        Has to be in the document for the constructor to have something to
        mount into, and has to stay there afterwards because the `<select>` we
        drive lives inside it. `display: none` on the wrapper, not `hidden` on
        this div, so nothing Google injects can un-hide itself.
      */}
      <div aria-hidden="true" style={{ display: "none" }}>
        <div id={ELEMENT_ID} />
      </div>
    </TranslateContext.Provider>
  );
}

export function useTranslate() {
  return useContext(TranslateContext);
}
