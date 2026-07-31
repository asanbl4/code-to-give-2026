"""Offline test fixtures.

These tests never touch the live project. `FakeDb` imitates just enough of the
PostgREST query builder for the routers under test.

Note what that does and does not prove: routing, dependency wiring, and
serialization are covered. **RLS policies are not** -- `FakeDb` has no policy
engine, and neither does any test here. Verify policies against a real project
or a local `supabase start`.
"""

from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.db import get_db
from app.main import app


class FakeQuery:
    """A chainable stand-in for the PostgREST builder.

    Filters are recorded and applied on `execute` so tests can assert on the
    query the router built, not only on what came back.
    """

    def __init__(self, rows: list[dict[str, Any]]) -> None:
        self._rows = rows
        self.filters: list[tuple[str, Any]] = []
        self.orders: list[tuple[str, bool]] = []
        self.limit_value: int | None = None

    def select(self, *_args: Any, **_kwargs: Any) -> "FakeQuery":
        return self

    def eq(self, column: str, value: Any) -> "FakeQuery":
        self.filters.append((column, value))
        return self

    def order(self, column: str, desc: bool = False) -> "FakeQuery":
        self.orders.append((column, desc))
        return self

    def limit(self, count: int) -> "FakeQuery":
        self.limit_value = count
        return self

    def execute(self) -> "FakeResponse":
        rows = [
            row
            for row in self._rows
            if all(row.get(column) == value for column, value in self.filters)
        ]
        if self.limit_value is not None:
            rows = rows[: self.limit_value]
        return FakeResponse(rows)


class FakeResponse:
    def __init__(self, data: list[dict[str, Any]]) -> None:
        self.data = data


class FakeDb:
    def __init__(self, rows_by_table: dict[str, list[dict[str, Any]]]) -> None:
        self._rows_by_table = rows_by_table
        self.queries: list[FakeQuery] = []

    def table(self, name: str) -> FakeQuery:
        query = FakeQuery(self._rows_by_table.get(name, []))
        self.queries.append(query)
        return query


PARTICIPANT_ROWS: list[dict[str, Any]] = [
    {
        "id": "6f1e6a4e-6c8c-4a4a-9f0e-6d2a6b7c1d11",
        "slug": "maria-k",
        "first_name": "Maria",
        "last_name": "Kowalski",
        "display_name": "Maria K.",
        "avatar_url": "https://example.test/maria.jpg",
        "headline": "Back to independent travel after two years",
        "progress_summary": "Now navigates the bus network unaccompanied.",
        "story": "The long version.",
        "joined_on": "2024-03-01",
        "sort_order": 0,
    },
    {
        "id": "9a2b3c4d-5e6f-4071-8293-a4b5c6d7e8f9",
        "slug": "tomas",
        "first_name": "Tomas",
        "last_name": None,
        "display_name": None,
        "avatar_url": None,
        "headline": "Leads the Thursday cooking group",
        "progress_summary": None,
        "story": None,
        "joined_on": None,
        "sort_order": 1,
    },
]


@pytest.fixture
def fake_db() -> FakeDb:
    return FakeDb({"participants": PARTICIPANT_ROWS})


@pytest.fixture
def client(fake_db: FakeDb) -> Any:
    """A TestClient whose database dependency is the fake, never the network."""
    app.dependency_overrides[get_db] = lambda: fake_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
