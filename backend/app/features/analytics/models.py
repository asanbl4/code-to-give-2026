"""What crosses the analytics API boundary, in both directions."""

from datetime import date
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.features.analytics.events import ALLOWED_DEVICES, ALLOWED_EVENTS

#: One request may not carry more than this. The tracker batches at 10, so a
#: legitimate flush is well under it; the cap exists so a single POST to a
#: public endpoint cannot insert an unbounded number of rows.
MAX_BATCH = 50


class EventIn(BaseModel):
    """One thing that happened in a browser."""

    name: str = Field(max_length=80)
    path: str = Field(min_length=1, max_length=200)
    # page_leave only. Capped at 24h so a clock jump cannot poison an average.
    visible_ms: int | None = Field(default=None, ge=0, le=86_400_000)

    @field_validator("name")
    @classmethod
    def known_event(cls, value: str) -> str:
        if value not in ALLOWED_EVENTS:
            raise ValueError(f"Unknown event name: {value!r}")
        return value


class EventBatch(BaseModel):
    """A flush from one tab.

    `session_id` is generated in the browser and lives in sessionStorage. It is
    not a user id and is not stored anywhere else -- it exists so two page views
    from the same person in the same tab count as one visitor.
    """

    session_id: UUID
    device: str | None = None
    language: str | None = Field(default=None, max_length=12)
    events: list[EventIn] = Field(min_length=1, max_length=MAX_BATCH)

    @field_validator("device")
    @classmethod
    def known_device(cls, value: str | None) -> str | None:
        # Dropped rather than rejected: a device we do not recognise should not
        # cost us the page views in the same batch.
        return value if value in ALLOWED_DEVICES else None


class DayPoint(BaseModel):
    """One day on the traffic chart."""

    day: date
    visits: int
    page_views: int


class KeyCount(BaseModel):
    """A ranked row: a page, an interaction, or a device."""

    key: str
    events: int
    visits: int
    #: Mean visible seconds per page view. None for anything but a page.
    avg_seconds: float | None = None


class AnalyticsSummary(BaseModel):
    """Everything `/admin/analytics` draws, in one response.

    One endpoint rather than four, because the dashboard has no state in which
    it wants the top pages but not the headline numbers -- and four round trips
    would each re-run the rollup.

    **Visits, not unique visitors.** A session id is a random uuid in
    sessionStorage, so it dies with the tab: the same person returning tomorrow,
    or opening a second tab, is a second session. Summing daily sessions across
    a range therefore counts visits, and calling them "unique visitors" would
    overstate reach -- the honest figure is the one we can actually derive from
    data that identifies nobody.
    """

    days: int
    start_day: date
    end_day: date

    visits: int
    page_views: int
    avg_seconds: float | None
    busiest_day: date | None

    #: Same figures over the equally long window immediately before this one, so
    #: the dashboard can show a direction of travel rather than a bare number.
    previous_visits: int
    previous_page_views: int

    per_day: list[DayPoint]
    top_pages: list[KeyCount]
    top_events: list[KeyCount]
    devices: list[KeyCount]
