"""Turning batches into rows, and rows into a dashboard.

Both halves use the service-role client. `analytics_events` and
`analytics_daily` have RLS enabled with no policies at all, so they are
unreachable with the publishable key that ships in the browser bundle -- which
is the point. Reads here are safe because every route that calls them sits
behind `require_staff`; writes are safe because the endpoint validates every
field before anything reaches Postgres.
"""

from collections import defaultdict
from datetime import date, timedelta
from typing import Any

from supabase import Client

from app.features.analytics.models import (
    AnalyticsSummary,
    DayPoint,
    EventBatch,
    KeyCount,
)

#: Ranked tables are for reading, not for exhaustiveness.
TOP_N = 12


def record(db: Client, batch: EventBatch) -> int:
    """Write one flush. Returns how many rows were inserted."""
    rows = [
        {
            "session_id": str(batch.session_id),
            "name": event.name,
            "path": event.path,
            "visible_ms": event.visible_ms,
            "device": batch.device,
            "language": batch.language,
            # `occurred_at` is left to the column default -- the database clock,
            # not the browser's. Events arrive up to a few seconds late because
            # the tracker batches them, which is immaterial to a daily rollup,
            # and a timestamp the client could set is a timestamp the client
            # could backdate into a day that has already been rolled up.
        }
        for event in batch.events
    ]
    db.table("analytics_events").insert(rows).execute()
    return len(rows)


def _hong_kong_today(db: Client) -> date:
    """Today, as Hong Kong reckons it.

    Asked of Postgres rather than computed here so that the API, the rollup
    function and the nightly cron job all agree on where a day ends. The server
    running this process may well be in another timezone.
    """
    result = db.rpc("analytics_today", {}).execute()
    return date.fromisoformat(str(result.data))


def _average_seconds(total_ms: int, count: int) -> float | None:
    if count <= 0:
        return None
    return round(total_ms / count / 1000, 1)


def _rank(rows: list[dict[str, Any]], *, with_time: bool) -> list[KeyCount]:
    """Fold per-day rows into one row per key, ranked by volume."""
    events: defaultdict[str, int] = defaultdict(int)
    visits: defaultdict[str, int] = defaultdict(int)
    ms_total: defaultdict[str, int] = defaultdict(int)
    ms_count: defaultdict[str, int] = defaultdict(int)

    for row in rows:
        key = row["key"]
        events[key] += row["events"] or 0
        visits[key] += row["sessions"] or 0
        ms_total[key] += row["visible_ms_total"] or 0
        ms_count[key] += row["visible_ms_count"] or 0

    ranked = [
        KeyCount(
            key=key,
            events=events[key],
            visits=visits[key],
            # Summing the numerator and denominator separately, rather than
            # averaging the daily averages: a day with three page views and a
            # day with three hundred do not carry equal weight.
            avg_seconds=_average_seconds(ms_total[key], ms_count[key]) if with_time else None,
        )
        for key in events
    ]
    ranked.sort(key=lambda item: (-item.events, item.key))
    return ranked[:TOP_N]


def summary(db: Client, days: int) -> AnalyticsSummary:
    """The whole dashboard, from the rollup table alone.

    Today is rolled up first: the nightly job settles yesterday, so without this
    the dashboard would be blind to everything that happened since midnight --
    which is exactly the window a member of staff is most likely to be asking
    about. The function is idempotent, so calling it on every load is safe.
    """
    end_day = _hong_kong_today(db)
    db.rpc("analytics_rollup", {"target_day": end_day.isoformat()}).execute()

    start_day = end_day - timedelta(days=days - 1)
    # The comparison window is the same length, immediately before.
    previous_start = start_day - timedelta(days=days)

    response = (
        db.table("analytics_daily")
        .select("day, dimension, key, sessions, events, visible_ms_total, visible_ms_count")
        .gte("day", previous_start.isoformat())
        .lte("day", end_day.isoformat())
        .execute()
    )
    rows: list[dict[str, Any]] = response.data or []

    current = [row for row in rows if str(row["day"]) >= start_day.isoformat()]
    previous = [row for row in rows if str(row["day"]) < start_day.isoformat()]

    totals = [row for row in current if row["dimension"] == "total"]
    by_day = {str(row["day"]): row for row in totals}

    # Every day in the window, including the quiet ones. A chart that omits days
    # with no traffic draws a straight line through them and flatters the site.
    per_day = [
        DayPoint(
            day=start_day + timedelta(days=offset),
            visits=by_day.get((start_day + timedelta(days=offset)).isoformat(), {}).get(
                "sessions", 0
            ),
            page_views=by_day.get((start_day + timedelta(days=offset)).isoformat(), {}).get(
                "events", 0
            ),
        )
        for offset in range(days)
    ]

    busiest = max(per_day, key=lambda point: point.page_views, default=None)

    return AnalyticsSummary(
        days=days,
        start_day=start_day,
        end_day=end_day,
        visits=sum(row["sessions"] or 0 for row in totals),
        page_views=sum(row["events"] or 0 for row in totals),
        avg_seconds=_average_seconds(
            sum(row["visible_ms_total"] or 0 for row in totals),
            sum(row["visible_ms_count"] or 0 for row in totals),
        ),
        busiest_day=busiest.day if busiest and busiest.page_views > 0 else None,
        previous_visits=sum(
            row["sessions"] or 0 for row in previous if row["dimension"] == "total"
        ),
        previous_page_views=sum(
            row["events"] or 0 for row in previous if row["dimension"] == "total"
        ),
        per_day=per_day,
        top_pages=_rank([row for row in current if row["dimension"] == "path"], with_time=True),
        top_events=_rank([row for row in current if row["dimension"] == "event"], with_time=False),
        devices=_rank([row for row in current if row["dimension"] == "device"], with_time=False),
    )
