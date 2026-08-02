/**
 * The closed list of interactions the site records.
 *
 * Typed as a union so `track("donate_clicekd")` is a compile error rather than
 * a row nobody ever looks at. The backend holds the same list in
 * `app/features/analytics/events.py` and rejects anything outside it — the two
 * are duplicated on purpose, because the server cannot trust a list that lives
 * in the browser, and the browser needs one at compile time.
 *
 * Adding an event means adding it in both places. That friction is the feature:
 * it is what keeps the admin dashboard a short list of things staff decided to
 * measure rather than a dump of every button on the site.
 */

/**
 * Every entry here has exactly one `track()` call site. An event with no caller
 * would sit at zero in the dashboard for ever and read as "nobody does this"
 * rather than "nobody wired this up" — which is the more expensive mistake.
 */
export const INTERACTION_EVENTS = [
  "donate_clicked",
  "donate_amount_selected",
  "donate_completed",
  "quiz_started",
  "quiz_completed",
  "chatbot_message_sent",
  "mascot_opened",
  "language_changed",
  "nav_link_clicked",
  "community_goal_contributed",
  "event_signup_started",
] as const;

export type InteractionEvent = (typeof INTERACTION_EVENTS)[number];

/** Emitted by the tracker itself, never by a component. */
export type TrackerEvent = "page_view" | "page_leave";

export type AnalyticsEventName = InteractionEvent | TrackerEvent;
