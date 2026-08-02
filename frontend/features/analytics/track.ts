"use client";

import type { InteractionEvent } from "./events";
import { enqueue } from "./queue";

/**
 * Record one interaction.
 *
 * A plain function rather than a hook or a context, so it can be called from
 * anywhere a click handler can be written — including handlers in components
 * that are not, and should not become, clients of an analytics provider.
 *
 * ```tsx
 * <Button onClick={() => { track("donate_clicked"); ... }}>
 * ```
 *
 * The path is read from `window.location` at call time rather than passed in,
 * because the caller invariably knows less about where it is being rendered
 * than the browser does — the donate button appears in the header, the footer
 * and the landing page.
 *
 * Safe to call during render or on the server: it no-ops without a `window`.
 */
export function track(name: InteractionEvent): void {
  if (typeof window === "undefined") return;
  enqueue({ name, path: window.location.pathname });
}
