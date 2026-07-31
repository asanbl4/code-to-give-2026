"""Routing, serialization, and the shape of the queries the router builds."""

from fastapi.testclient import TestClient

from tests.conftest import FakeDb


def test_list_returns_every_participant(client: TestClient) -> None:
    response = client.get("/api/participants")

    assert response.status_code == 200
    assert [row["slug"] for row in response.json()] == ["maria-k", "tomas"]


def test_list_does_not_filter_in_python(client: TestClient, fake_db: FakeDb) -> None:
    """Visibility is RLS's job. A filter here would duplicate the policy."""
    client.get("/api/participants")

    assert fake_db.queries[0].filters == []


def test_list_orders_by_sort_order_then_recency(client: TestClient, fake_db: FakeDb) -> None:
    client.get("/api/participants")

    assert fake_db.queries[0].orders == [("sort_order", False), ("created_at", True)]


def test_display_name_wins_over_composed_name(client: TestClient) -> None:
    body = client.get("/api/participants").json()

    assert body[0]["name"] == "Maria K."


def test_name_composes_from_parts_when_no_display_name(client: TestClient) -> None:
    """A missing last name must not leave a trailing space."""
    body = client.get("/api/participants").json()

    assert body[1]["name"] == "Tomas"


def test_consent_flags_are_not_exposed(client: TestClient) -> None:
    body = client.get("/api/participants").json()

    assert "consent_given" not in body[0]
    assert "is_published" not in body[0]


def test_get_by_slug(client: TestClient) -> None:
    response = client.get("/api/participants/maria-k")

    assert response.status_code == 200
    assert response.json()["story"] == "The long version."


def test_unknown_slug_is_404(client: TestClient) -> None:
    """Also the path an unpublished row takes: RLS filters it to zero rows."""
    response = client.get("/api/participants/nobody")

    assert response.status_code == 404
