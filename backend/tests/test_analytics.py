"""Analytics ingest and reporting.

Offline, like everything else here: `FakeDb` stands in for PostgREST. These
cover validation, the shape of what gets written, and the arithmetic in
`service.summary`. They do not cover RLS -- but for these two tables there are
no policies to cover, only the fact that there are none, which has to be
verified against a real project.
"""

from datetime import date, timedelta
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.db import get_admin_db
from app.main import app
from tests.conftest import AdminClient, FakeDb

SESSION = "33333333-3333-4333-8333-333333333333"
OTHER_SESSION = "44444444-4444-4444-8444-444444444444"
TODAY = date(2026, 8, 2)


@pytest.fixture
def ingest_client() -> Any:
    """A client for the *public* ingest endpoint.

    `require_staff` is not overridden, because ingest is deliberately not behind
    it. If someone ever adds that dependency to the router, these tests start
    failing with 403 -- which is the point.
    """
    db = FakeDb({"analytics_events": []})
    app.dependency_overrides[get_admin_db] = lambda: db
    with TestClient(app) as client:
        yield client, db
    app.dependency_overrides.clear()


def test_ingest_writes_one_row_per_event(ingest_client: Any) -> None:
    client, db = ingest_client

    response = client.post(
        "/api/analytics/events",
        json={
            "session_id": SESSION,
            "device": "mobile",
            "language": "zh-TW",
            "events": [
                {"name": "page_view", "path": "/donate"},
                {"name": "donate_clicked", "path": "/donate"},
                {"name": "page_leave", "path": "/donate", "visible_ms": 21000},
            ],
        },
    )

    assert response.status_code == 202
    assert response.json() == {"recorded": 3}

    written = db.queries_for("analytics_events")[0].written
    assert [row["name"] for row in written] == ["page_view", "donate_clicked", "page_leave"]
    # Session, device and language ride on the batch but land on every row.
    assert {row["session_id"] for row in written} == {SESSION}
    assert {row["language"] for row in written} == {"zh-TW"}
    assert written[2]["visible_ms"] == 21000


def test_ingest_never_writes_a_timestamp(ingest_client: Any) -> None:
    """`occurred_at` is the database's clock, not the browser's.

    A client-supplied timestamp could be backdated into a day that has already
    been rolled up, silently changing a number staff have read.
    """
    client, db = ingest_client

    client.post(
        "/api/analytics/events",
        json={"session_id": SESSION, "events": [{"name": "page_view", "path": "/"}]},
    )

    assert "occurred_at" not in db.queries_for("analytics_events")[0].written[0]


def test_ingest_rejects_an_unknown_event_name(ingest_client: Any) -> None:
    client, db = ingest_client

    response = client.post(
        "/api/analytics/events",
        json={
            "session_id": SESSION,
            "events": [{"name": "definitely_not_an_event", "path": "/"}],
        },
    )

    assert response.status_code == 422
    # Nothing at all was written -- not even the valid part of the request.
    assert db.queries_for("analytics_events") == []


def test_ingest_rejects_an_oversized_batch(ingest_client: Any) -> None:
    """The cap is what stops one POST to a public endpoint inserting forever."""
    client, db = ingest_client

    response = client.post(
        "/api/analytics/events",
        json={
            "session_id": SESSION,
            "events": [{"name": "page_view", "path": "/"}] * 51,
        },
    )

    assert response.status_code == 422
    assert db.queries_for("analytics_events") == []


def test_ingest_drops_an_unrecognised_device_but_keeps_the_events(
    ingest_client: Any,
) -> None:
    """A device we cannot classify must not cost us the page views with it."""
    client, db = ingest_client

    response = client.post(
        "/api/analytics/events",
        json={
            "session_id": SESSION,
            "device": "smart_fridge",
            "events": [{"name": "page_view", "path": "/"}],
        },
    )

    assert response.status_code == 202
    assert db.queries_for("analytics_events")[0].written[0]["device"] is None


def test_ingest_rejects_a_negative_duration(ingest_client: Any) -> None:
    client, _ = ingest_client

    response = client.post(
        "/api/analytics/events",
        json={
            "session_id": SESSION,
            "events": [{"name": "page_leave", "path": "/", "visible_ms": -1}],
        },
    )

    assert response.status_code == 422


def _daily(day: date, dimension: str, key: str, **values: int) -> dict[str, Any]:
    return {
        "day": day.isoformat(),
        "dimension": dimension,
        "key": key,
        "sessions": values.get("sessions", 0),
        "events": values.get("events", 0),
        "visible_ms_total": values.get("visible_ms_total", 0),
        "visible_ms_count": values.get("visible_ms_count", 0),
    }


def _summary_db(rows: list[dict[str, Any]]) -> FakeDb:
    return FakeDb(
        {"analytics_daily": rows},
        rpc_results={"analytics_today": TODAY.isoformat()},
    )


def test_summary_totals_and_average(admin_client: AdminClient) -> None:
    yesterday = TODAY - timedelta(days=1)
    db = _summary_db(
        [
            _daily(
                TODAY,
                "total",
                "",
                sessions=10,
                events=25,
                visible_ms_total=250_000,
                visible_ms_count=25,
            ),
            _daily(
                yesterday,
                "total",
                "",
                sessions=5,
                events=15,
                visible_ms_total=150_000,
                visible_ms_count=15,
            ),
        ]
    )

    body = admin_client(db).get("/api/admin/analytics/summary?days=7").json()

    assert body["visits"] == 15
    assert body["page_views"] == 40
    # 400_000ms over 40 page views = 10s. Weighted across days, not an average
    # of the two daily averages -- which here happen to agree, deliberately, so
    # the next test can catch the difference.
    assert body["avg_seconds"] == 10.0
    assert body["busiest_day"] == TODAY.isoformat()


def test_summary_weights_the_average_by_volume(admin_client: AdminClient) -> None:
    """An average of averages is not an average.

    One page read for 100s and ninety-nine read for 1s is not an average of
    50.5s. Summing numerator and denominator separately is what makes it 2.0.
    """
    db = _summary_db(
        [
            _daily(
                TODAY,
                "path",
                "/stories",
                sessions=1,
                events=1,
                visible_ms_total=100_000,
                visible_ms_count=1,
            ),
            _daily(
                TODAY - timedelta(days=1),
                "path",
                "/stories",
                sessions=99,
                events=99,
                visible_ms_total=99_000,
                visible_ms_count=99,
            ),
        ]
    )

    body = admin_client(db).get("/api/admin/analytics/summary?days=7").json()

    assert body["top_pages"][0]["key"] == "/stories"
    assert body["top_pages"][0]["avg_seconds"] == 2.0


def test_summary_fills_in_quiet_days(admin_client: AdminClient) -> None:
    """A day with no traffic is a zero, not a gap.

    Omitting it would let the chart draw a straight line between the days
    either side and flatter a week that was actually half empty.
    """
    db = _summary_db([_daily(TODAY, "total", "", sessions=3, events=4)])

    body = admin_client(db).get("/api/admin/analytics/summary?days=7").json()

    assert len(body["per_day"]) == 7
    assert body["per_day"][0] == {
        "day": (TODAY - timedelta(days=6)).isoformat(),
        "visits": 0,
        "page_views": 0,
    }
    assert body["per_day"][-1] == {"day": TODAY.isoformat(), "visits": 3, "page_views": 4}


def test_summary_separates_the_previous_window(admin_client: AdminClient) -> None:
    """The comparison window is the seven days before the seven requested."""
    inside = TODAY - timedelta(days=6)
    before = TODAY - timedelta(days=7)
    db = _summary_db(
        [
            _daily(TODAY, "total", "", sessions=10, events=10),
            _daily(inside, "total", "", sessions=1, events=1),
            _daily(before, "total", "", sessions=99, events=99),
        ]
    )

    body = admin_client(db).get("/api/admin/analytics/summary?days=7").json()

    assert body["visits"] == 11
    assert body["previous_visits"] == 99
    assert body["previous_page_views"] == 99


def test_summary_rolls_up_today_before_reading(admin_client: AdminClient) -> None:
    """Without this the dashboard is blind to everything since midnight.

    The nightly job only settles yesterday, so today's rows exist in
    `analytics_events` and nowhere else until something asks for them.
    """
    db = _summary_db([])

    admin_client(db).get("/api/admin/analytics/summary?days=30")

    assert ("analytics_rollup", {"target_day": TODAY.isoformat()}) in db.rpc_calls


def test_summary_ranks_events_and_ignores_page_rows(admin_client: AdminClient) -> None:
    db = _summary_db(
        [
            _daily(TODAY, "event", "donate_clicked", sessions=4, events=9),
            _daily(TODAY, "event", "quiz_started", sessions=20, events=20),
            _daily(TODAY, "path", "/donate", sessions=50, events=50),
        ]
    )

    body = admin_client(db).get("/api/admin/analytics/summary?days=7").json()

    assert [row["key"] for row in body["top_events"]] == ["quiz_started", "donate_clicked"]
    assert [row["key"] for row in body["top_pages"]] == ["/donate"]
    # Interactions have no dwell time; only pages do.
    assert body["top_events"][0]["avg_seconds"] is None


def test_summary_reports_no_busiest_day_when_there_is_no_traffic(
    admin_client: AdminClient,
) -> None:
    body = admin_client(_summary_db([])).get("/api/admin/analytics/summary?days=7").json()

    assert body["busiest_day"] is None
    assert body["avg_seconds"] is None
    assert body["visits"] == 0


@pytest.mark.parametrize("days", [0, -1, 999])
def test_summary_rejects_an_absurd_range(admin_client: AdminClient, days: int) -> None:
    client = admin_client(_summary_db([]))

    assert client.get(f"/api/admin/analytics/summary?days={days}").status_code == 422


def test_summary_requires_staff() -> None:
    """The gate itself, with no override in place.

    Every other test here overrides `require_staff`; this one does not, so it is
    the only one that would notice the dependency being dropped from the router.
    """
    db = _summary_db([])
    app.dependency_overrides[get_admin_db] = lambda: db
    with TestClient(app) as client:
        response = client.get("/api/admin/analytics/summary")
    app.dependency_overrides.clear()

    assert response.status_code in {401, 403}
