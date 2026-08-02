"""The closed list of things the site is allowed to record.

An allowlist rather than "accept whatever the browser sends", for two reasons.
The ingest endpoint is public and unauthenticated, so without it anyone could
write arbitrary strings into a staff-facing table. And a typo in a `track()`
call would otherwise create a new event name that silently collects data nobody
ever looks at -- here it is a 422 the first time it runs.

Keep this in step with `frontend/features/analytics/events.ts`. The two lists
are duplicated on purpose: the frontend needs its own copy to type-check
`track()` at compile time, and the backend cannot trust the frontend's copy
anyway, since the request does not have to come from our page.
"""

from typing import Final

# Emitted by the tracker itself, not by any component.
PAGE_VIEW: Final = "page_view"
PAGE_LEAVE: Final = "page_leave"

#: Interactions worth counting, each fired by exactly one `track()` call site.
#: An event with no caller would sit at zero in the dashboard for ever and read
#: as "nobody does this" rather than "nobody wired this up".
INTERACTION_EVENTS: Final[frozenset[str]] = frozenset(
    {
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
    }
)

ALLOWED_EVENTS: Final[frozenset[str]] = INTERACTION_EVENTS | {PAGE_VIEW, PAGE_LEAVE}

ALLOWED_DEVICES: Final[frozenset[str]] = frozenset({"mobile", "tablet", "desktop"})
