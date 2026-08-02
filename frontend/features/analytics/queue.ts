/**
 * Getting events to the backend without making anyone wait for them.
 *
 * Events accumulate and go out in batches: one request per ten events or per
 * five seconds, rather than one request per click. Nothing here ever rejects,
 * throws, or retries — analytics that can break a page it is measuring is worse
 * than no analytics, so every failure path ends in the events being dropped.
 */

import { API_URL } from "@/lib/api";
import type { AnalyticsEventName } from "./events";
import { currentLanguage, deviceClass, sessionId } from "./session";

const ENDPOINT = `${API_URL}/api/analytics/events`;

/** Matches the backend's cap. A larger batch would be rejected whole. */
const MAX_BATCH = 10;
const FLUSH_AFTER_MS = 5000;

interface QueuedEvent {
  name: AnalyticsEventName;
  path: string;
  visible_ms?: number;
}

let queue: QueuedEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

export function enqueue(event: QueuedEvent): void {
  queue.push(event);

  if (queue.length >= MAX_BATCH) {
    flush();
    return;
  }
  timer ??= setTimeout(flush, FLUSH_AFTER_MS);
}

/**
 * Send everything queued.
 *
 * `beacon` picks `navigator.sendBeacon`, which the browser promises to deliver
 * even as the page goes away — a normal `fetch` started during unload is
 * routinely cancelled. It is used when leaving, and not otherwise: sendBeacon
 * gives no response and no error, so ordinary flushes go by `fetch` where a
 * failure is at least visible in the network tab.
 */
export function flush(beacon = false): void {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
  if (queue.length === 0) return;

  // Taken before the await/send so events queued during the send are not lost
  // and not sent twice.
  const events = queue;
  queue = [];

  const body = JSON.stringify({
    session_id: sessionId(),
    device: deviceClass(),
    language: currentLanguage(),
    events,
  });

  try {
    if (beacon && typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "application/json" }));
      return;
    }

    void fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      // Survives the page being torn down mid-request. Belt and braces next to
      // sendBeacon, and what makes the non-beacon path safe during a route
      // change that unmounts the caller.
      keepalive: true,
    }).catch(() => {
      // A visitor's browser could not reach the API. Their problem is the page
      // they came to read, not our page-view count.
    });
  } catch {
    // sendBeacon throws if the payload exceeds the browser's queue limit.
    // Nothing to do but let these events go.
  }
}
