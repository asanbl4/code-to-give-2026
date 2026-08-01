"""Offline test fixtures.

These tests never touch the live project. `FakeDb` imitates just enough of the
PostgREST query builder for the routers under test.

Note what that does and does not prove: routing, dependency wiring, and
serialization are covered. **RLS policies are not** -- `FakeDb` has no policy
engine, and neither does any test here. Verify policies against a real project
or a local `supabase start`.
"""

from collections.abc import Callable
from typing import Any
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.auth import require_staff
from app.db import get_admin_db, get_db
from app.main import app


class FakeQuery:
    """A chainable stand-in for the PostgREST builder.

    Filters are recorded and applied on `execute` so tests can assert on the
    query the router built, not only on what came back.
    """

    def __init__(self, rows: list[dict[str, Any]], table: str = "") -> None:
        self._rows = rows
        self.table_name = table
        self.filters: list[tuple[str, Any]] = []
        self.in_filters: list[tuple[str, list[Any]]] = []
        self.orders: list[tuple[str, bool]] = []
        self.limit_value: int | None = None
        self.written: list[dict[str, Any]] | dict[str, Any] | None = None
        self.operation = "select"

    def select(self, *_args: Any, **_kwargs: Any) -> "FakeQuery":
        return self

    def eq(self, column: str, value: Any) -> "FakeQuery":
        self.filters.append((column, value))
        return self

    def in_(self, column: str, values: list[Any]) -> "FakeQuery":
        self.in_filters.append((column, values))
        return self

    def order(self, column: str, desc: bool = False) -> "FakeQuery":
        self.orders.append((column, desc))
        return self

    def limit(self, count: int) -> "FakeQuery":
        self.limit_value = count
        return self

    def insert(self, payload: dict[str, Any] | list[dict[str, Any]]) -> "FakeQuery":
        self.operation = "insert"
        self.written = payload
        return self

    def update(self, payload: dict[str, Any]) -> "FakeQuery":
        self.operation = "update"
        self.written = payload
        return self

    def delete(self) -> "FakeQuery":
        self.operation = "delete"
        return self

    def execute(self) -> "FakeResponse":
        if self.operation == "insert":
            written = self.written if isinstance(self.written, list) else [self.written or {}]
            # Stand in for the row the database would return. The id is a real
            # uuid because every `id` column here is one, and a response model
            # that parses it will reject a placeholder like "generated-0".
            return FakeResponse([{"id": str(uuid4()), **row} for row in written])

        rows = [
            row
            for row in self._rows
            if all(row.get(column) == value for column, value in self.filters)
            and all(row.get(column) in values for column, values in self.in_filters)
        ]
        if self.operation == "update":
            rows = [{**row, **(self.written or {})} for row in rows]
        if self.limit_value is not None:
            rows = rows[: self.limit_value]
        return FakeResponse(rows)


class FakeResponse:
    def __init__(self, data: list[dict[str, Any]]) -> None:
        self.data = data


class FakeRpc:
    def __init__(self, rows: list[dict[str, Any]]) -> None:
        self._rows = rows

    def execute(self) -> "FakeResponse":
        return FakeResponse(self._rows)


class FakeDb:
    def __init__(
        self,
        rows_by_table: dict[str, list[dict[str, Any]]],
        rpc_results: dict[str, list[dict[str, Any]]] | None = None,
    ) -> None:
        self._rows_by_table = rows_by_table
        self._rpc_results = rpc_results or {}
        self.queries: list[FakeQuery] = []
        self.rpc_calls: list[tuple[str, dict[str, Any]]] = []

    def table(self, name: str) -> FakeQuery:
        query = FakeQuery(self._rows_by_table.get(name, []), table=name)
        self.queries.append(query)
        return query

    def rpc(self, name: str, params: dict[str, Any]) -> FakeRpc:
        self.rpc_calls.append((name, params))
        return FakeRpc(self._rpc_results.get(name, []))

    def queries_for(self, table: str) -> list[FakeQuery]:
        """Queries in call order; the routers hit several tables per request."""
        return [query for query in self.queries if query.table_name == table]


PARTICIPANT_ROWS: list[dict[str, Any]] = [
    {
        "id": "6f1e6a4e-6c8c-4a4a-9f0e-6d2a6b7c1d11",
        "slug": "maria-k",
        "first_name": "Maria",
        "last_name": "Kowalski",
        "display_name": "Maria K.",
        "avatar_url": "https://example.test/maria.jpg",
        "headline": "Back to independent travel after two years",
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
        "story": None,
        "joined_on": None,
        "sort_order": 1,
    },
]


PHOTO_ROWS: list[dict[str, Any]] = [
    {
        "id": "11111111-1111-4111-8111-111111111111",
        "storage_path": "photos/2026/07/group.jpg",
        "width": 1600,
        "height": 900,
        "alt_text": "Six members of the Thursday cooking group around a table.",
        "caption": "Thursday cooking group",
        "taken_on": "2026-06-04",
        "sort_order": 0,
    }
]

# RLS would have filtered these already, so every row here is confirmed and
# belongs to a published photo -- the fake has no policy engine to do it for us.
FACE_ROWS: list[dict[str, Any]] = [
    {
        "id": "22222222-2222-4222-8222-222222222222",
        "photo_id": "11111111-1111-4111-8111-111111111111",
        "participant_id": "6f1e6a4e-6c8c-4a4a-9f0e-6d2a6b7c1d11",
        "box_x": 0.12,
        "box_y": 0.20,
        "box_w": 0.09,
        "box_h": 0.16,
    }
]


@pytest.fixture(autouse=True)
def stub_storage(monkeypatch: pytest.MonkeyPatch) -> None:
    """Never reach the bucket. Signing requires the service role and a network."""
    monkeypatch.setattr(
        "app.storage.signed_urls",
        lambda paths: {path: f"https://signed.test/{path}" for path in paths},
    )
    monkeypatch.setattr("app.storage.signed_url", lambda path: None)


@pytest.fixture
def fake_db() -> FakeDb:
    return FakeDb(
        {
            "participants": PARTICIPANT_ROWS,
            "photos": PHOTO_ROWS,
            "photo_faces": FACE_ROWS,
        }
    )


@pytest.fixture
def client(fake_db: FakeDb) -> Any:
    """A TestClient whose database dependency is the fake, never the network."""
    app.dependency_overrides[get_db] = lambda: fake_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def admin_client() -> Any:
    """Build a TestClient for a caller who is already staff.

    A factory rather than a client, because the admin tests each need their own
    `FakeDb` -- one that refuses an insert, one holding a particular face.

    `require_staff` is overridden rather than exercised on purpose. What it
    checks -- a JWT signature against the project JWKS, then a role lookup in
    Postgres -- is `test_auth.py`'s subject. Repeating it here would test the
    same thing again and make every admin test slower to read.
    """

    def build(db: FakeDb) -> TestClient:
        app.dependency_overrides[get_admin_db] = lambda: db
        app.dependency_overrides[require_staff] = lambda: None
        return TestClient(app)

    yield build
    app.dependency_overrides.clear()


AdminClient = Callable[[FakeDb], TestClient]
