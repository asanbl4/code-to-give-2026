"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { enqueue, flush } from "../queue";

/**
 * Counts page views and measures how long each one was actually read.
 *
 * Mounted by `PageShell`, which is what keeps it off `/admin/*` and the auth
 * screens — those deliberately don't use the shell, so staff traffic never
 * lands in the visitor numbers. There is nothing to exclude and nothing to
 * remember to exclude.
 *
 * A view is two events, not one. `page_view` goes out on arrival so a visit is
 * counted even if the tab is killed; `page_leave` follows with the duration.
 * Recording only on exit would have quietly undercounted every visit that
 * ended in a crash or a force-quit.
 *
 * **Time is measured while visible, not while open.** A tab left in the
 * background overnight contributes the two minutes someone spent reading it.
 * Wall-clock enter-to-leave would have reported eight hours and made every
 * average meaningless.
 */
export function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // One run of this effect is exactly one page view. React's StrictMode
    // double-invokes effects in development, so dev traffic counts double;
    // production mounts once.
    let accumulated = 0;
    let visibleSince = document.visibilityState === "visible" ? Date.now() : null;
    let finished = false;

    enqueue({ name: "page_view", path: pathname });

    const pause = () => {
      if (visibleSince === null) return;
      accumulated += Date.now() - visibleSince;
      visibleSince = null;
    };

    /** Ends the view. Guarded, because leaving fires more than one of these. */
    const finish = (beacon: boolean) => {
      if (finished) return;
      finished = true;
      pause();
      enqueue({ name: "page_leave", path: pathname, visible_ms: accumulated });
      flush(beacon);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (!finished) visibleSince ??= Date.now();
        return;
      }

      pause();
      // Send what is queued while the page is still unambiguously alive. This
      // is the reliable moment — `pagehide` and `beforeunload` are not fired at
      // all on mobile when the browser is swiped away. The view is not ended
      // here, though: hiding a tab is not leaving the page, and emitting
      // `page_leave` on every hide would split one view's time across several
      // rows and deflate the average.
      flush(true);
    };

    const onPageHide = () => finish(true);

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
      // A route change unmounts this effect while the page lives on, so no
      // beacon: an ordinary keepalive fetch is more informative if it fails.
      finish(false);
    };
  }, [pathname]);

  return null;
}
