"""Two endpoints with opposite audiences.

`POST /api/analytics/events` is public and unauthenticated -- it has to be, it
is called by every visitor's browser. `GET /api/admin/analytics/summary` is
behind `require_staff`, the same gate as the rest of the staff tool.

Both write and read with the service role, because `analytics_events` and
`analytics_daily` have RLS enabled and no policies: nothing holding the
publishable key can touch them. That inverts this codebase's usual rule that
authorization lives in Postgres, and does so deliberately. The usual rule works
when rows belong to somebody -- `auth.uid()` decides. These rows belong to
nobody, so there is no policy that distinguishes a legitimate write from a
forged one. What protects the table instead is that the only door into it
validates every field, and the only door out of it counts staff.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.auth import require_staff
from app.db import AdminDb, postgrest_errors
from app.features.analytics import service
from app.features.analytics.models import AnalyticsSummary, EventBatch

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

admin_router = APIRouter(
    prefix="/api/admin/analytics",
    tags=["analytics"],
    dependencies=[Depends(require_staff)],
)


@router.post("/events", status_code=202)
def ingest(batch: EventBatch, db: AdminDb) -> dict[str, int]:
    """Record a flush from one browser tab.

    202, not 201: the caller is a `sendBeacon` that has already been told the
    request was queued and cannot read this response anyway. Nothing about a
    page visit is worth making a visitor wait for.

    No rate limit here. The batch is capped at 50 events, every name is checked
    against an allowlist and every field is length-bounded, so a single request
    cannot do much -- but a determined caller can still inflate the numbers by
    repeating it. Closing that properly needs shared state this app does not
    have; the place for it is a rate limit at the reverse proxy.
    """
    with postgrest_errors():
        written = service.record(db, batch)
    return {"recorded": written}


@admin_router.get("/summary", response_model=AnalyticsSummary)
def summary(
    db: AdminDb,
    days: Annotated[int, Query(ge=1, le=365)] = 30,
) -> AnalyticsSummary:
    """Everything the dashboard draws, for the last `days` days."""
    with postgrest_errors():
        return service.summary(db, days)
