"""Translate PostgREST failures into HTTP responses."""

from collections.abc import Iterator
from contextlib import contextmanager

from fastapi import HTTPException, status
from postgrest.exceptions import APIError

# Postgres raises this when an RLS policy rejects a write.
_RLS_VIOLATION = "42501"


@contextmanager
def postgrest_errors() -> Iterator[None]:
    """Map APIError to a sensible status code instead of a 500.

    Note that RLS-filtered *reads* do not raise -- they simply return no rows.
    Only writes blocked by a policy surface as 42501.
    """
    try:
        yield
    except APIError as exc:
        if exc.code == _RLS_VIOLATION:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not permitted by row-level security",
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=exc.message or "Database request failed",
        ) from exc
