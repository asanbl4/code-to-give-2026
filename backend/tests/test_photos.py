"""The public photos endpoint that /stories renders from."""

from fastapi.testclient import TestClient

from tests.conftest import FakeDb


def test_photo_carries_a_signed_url(client: TestClient) -> None:
    photo = client.get("/api/photos").json()[0]

    assert photo["image_url"] == "https://signed.test/photos/2026/07/group.jpg"


def test_storage_path_never_reaches_the_client(client: TestClient) -> None:
    """A bucket key is useless to a browser and tells it where to poke."""
    photo = client.get("/api/photos").json()[0]

    assert "storage_path" not in photo


def test_faces_are_nested_under_their_photo(client: TestClient) -> None:
    photo = client.get("/api/photos").json()[0]

    assert len(photo["faces"]) == 1
    assert photo["faces"][0]["participant_id"] == "6f1e6a4e-6c8c-4a4a-9f0e-6d2a6b7c1d11"


def test_boxes_are_normalised(client: TestClient) -> None:
    """The frontend positions these as percentages, so 0..1 is the contract."""
    face = client.get("/api/photos").json()[0]["faces"][0]

    for key in ("box_x", "box_y", "box_w", "box_h"):
        assert 0 <= face[key] <= 1


def test_faces_are_fetched_only_for_the_photos_returned(
    client: TestClient, fake_db: FakeDb
) -> None:
    client.get("/api/photos")

    face_query = fake_db.queries_for("photo_faces")[0]
    assert face_query.in_filters == [("photo_id", ["11111111-1111-4111-8111-111111111111"])]


def test_no_visibility_filtering_in_python(client: TestClient, fake_db: FakeDb) -> None:
    """Published-ness and confirmed-ness are RLS's job, on both tables."""
    client.get("/api/photos")

    assert fake_db.queries_for("photos")[0].filters == []
    assert fake_db.queries_for("photo_faces")[0].filters == []


def test_empty_database_returns_an_empty_list(client: TestClient, fake_db: FakeDb) -> None:
    """Zero rows must be a normal page, not an error -- and must not go on to
    query faces for no photos."""
    fake_db._rows_by_table["photos"] = []

    response = client.get("/api/photos")

    assert response.status_code == 200
    assert response.json() == []
    assert fake_db.queries_for("photo_faces") == []
