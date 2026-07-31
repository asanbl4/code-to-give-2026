"""The HTTP boundary: validation, the kill switch, and never returning a 500."""

import pytest
from fastapi.testclient import TestClient

from app.features.chatbot import router as chatbot_router
from app.features.chatbot.models import ChatResponse
from app.main import app


@pytest.fixture
def api() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(autouse=True)
def stub_service(monkeypatch) -> None:
    """The routing logic has its own tests; this file is about HTTP."""

    async def fake_answer(request):
        return ChatResponse(answer="stubbed", route="curated", locale=request.locale)

    monkeypatch.setattr(chatbot_router, "answer_question", fake_answer)


def test_post_returns_an_answer(api: TestClient) -> None:
    response = api.post("/api/chat", json={"question": "what is Love 21"})

    assert response.status_code == 200
    body = response.json()
    assert body["answer"] == "stubbed"
    assert body["route"] == "curated"


def test_locale_is_passed_through(api: TestClient) -> None:
    response = api.post("/api/chat", json={"question": "x", "locale": "zh-Hant"})

    assert response.json()["locale"] == "zh-Hant"


def test_empty_question_is_rejected(api: TestClient) -> None:
    response = api.post("/api/chat", json={"question": ""})

    assert response.status_code == 422


def test_overlong_question_is_rejected(api: TestClient) -> None:
    """Cheap prompt-stuffing guard, enforced server-side too."""
    response = api.post("/api/chat", json={"question": "x" * 501})

    assert response.status_code == 422


def test_unknown_locale_is_rejected(api: TestClient) -> None:
    response = api.post("/api/chat", json={"question": "x", "locale": "fr"})

    assert response.status_code == 422


def test_disabled_returns_503(api: TestClient, monkeypatch) -> None:
    monkeypatch.setattr(chatbot_router.settings, "chatbot_enabled", False)

    response = api.post("/api/chat", json={"question": "x"})

    assert response.status_code == 503


def test_health_still_reports_ok(api: TestClient) -> None:
    assert api.get("/health").status_code == 200


def test_router_import_fails_on_a_bad_corpus(monkeypatch, tmp_path) -> None:
    """A bad entry must stop the app, not surface as a 500 on a visitor.

    `app.main` imports the router, so the router's import-time `load_corpus()`
    is what turns a content error into a refusal to boot. Reloading the module
    against a deliberately broken knowledge directory exercises exactly that.
    """
    import importlib

    from app.features.chatbot import corpus

    broken = tmp_path / "knowledge"
    broken.mkdir()
    # Missing answer_zh, easy_read_*, triggers, source -- invalid many times over.
    (broken / "bad.yaml").write_text("- id: bad\n  answer_en: x\n", encoding="utf-8")

    monkeypatch.setattr(corpus, "KNOWLEDGE_DIR", broken)
    corpus.load_corpus.cache_clear()
    try:
        with pytest.raises(corpus.CorpusError):
            importlib.reload(chatbot_router)
    finally:
        # Leave the module and the cache as we found them for later tests.
        corpus.load_corpus.cache_clear()
        monkeypatch.undo()
        importlib.reload(chatbot_router)
