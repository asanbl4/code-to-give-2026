"""Confidence routing -- the heart of the feature.

The load-bearing assertions are the negative ones: a refusal must never reach
the model, and a dead Ollama must never produce a 500.
"""

import pytest

from app.features.chatbot import service
from app.features.chatbot.index import IndexedTrigger, VectorIndex
from app.features.chatbot.models import ChatRequest
from app.features.chatbot.ollama import OllamaUnavailable


@pytest.fixture(autouse=True)
def stub_index(monkeypatch) -> None:
    """Routing must be tested independently of the generated index.json.

    Without this, a missing index.json sends every request down the degraded
    lexical path, and the threshold tests below would pass or fail according to
    whether someone had run build_index -- testing the build, not the routing.
    """
    stub = VectorIndex(
        corpus_hash="stub",
        model="stub",
        triggers=[IndexedTrigger(entry_id="about-what-is-love21", text="stub", vector=[1.0, 0.0])],
    )
    monkeypatch.setattr(service.index, "load_index", lambda: stub)


class FakeOllama:
    """Records calls so tests can assert the model was NOT used."""

    def __init__(self, vector: list[float] | None = None, text: str = "generated answer") -> None:
        self.vector = vector or [1.0, 0.0]
        self.text = text
        self.embed_calls: list[str] = []
        self.generate_calls: list[tuple[str, str]] = []

    async def embed(self, text: str) -> list[float]:
        self.embed_calls.append(text)
        return self.vector

    async def generate(self, system: str, user: str) -> str:
        self.generate_calls.append((system, user))
        return self.text


@pytest.fixture
def fake_ollama(monkeypatch) -> FakeOllama:
    fake = FakeOllama()
    monkeypatch.setattr(service.ollama, "embed", fake.embed)
    monkeypatch.setattr(service.ollama, "generate", fake.generate)
    monkeypatch.setattr(service.retrieval.ollama, "embed", fake.embed)
    return fake


def _force_score(monkeypatch, entry_id: str, score: float) -> None:
    """Pin retrieval so each confidence band can be tested in isolation."""
    from app.features.chatbot.corpus import load_corpus

    entry = next(e for e in load_corpus() if e.id == entry_id)

    async def fake_rank(question, vector_index, entries):
        return [(entry, score)]

    monkeypatch.setattr(service.retrieval, "rank", fake_rank)


@pytest.mark.anyio
async def test_high_confidence_returns_the_curated_answer_verbatim(
    monkeypatch, fake_ollama
) -> None:
    _force_score(monkeypatch, "donate-what-500-funds", 0.92)

    response = await service.answer_question(ChatRequest(question="where does my money go"))

    assert response.route == "curated"
    assert "HK$500" in response.answer
    assert fake_ollama.generate_calls == [], "a high-confidence match must not call the model"


@pytest.mark.anyio
async def test_mid_confidence_generates_from_retrieved_passages(monkeypatch, fake_ollama) -> None:
    _force_score(monkeypatch, "donate-what-500-funds", 0.60)

    response = await service.answer_question(ChatRequest(question="tell me about giving"))

    assert response.route == "generated"
    assert response.answer == "generated answer"
    assert len(fake_ollama.generate_calls) == 1

    _system, user = fake_ollama.generate_calls[0]
    assert "HK$500" in user, "retrieved passages must be in the prompt"


@pytest.mark.anyio
async def test_low_confidence_refuses_without_calling_the_model(monkeypatch, fake_ollama) -> None:
    _force_score(monkeypatch, "donate-what-500-funds", 0.10)

    response = await service.answer_question(ChatRequest(question="what is the capital of Peru"))

    assert response.route == "refused"
    assert fake_ollama.generate_calls == []
    assert response.action is not None, "a refusal must offer a human"


@pytest.mark.anyio
async def test_refusal_entry_never_reaches_the_model(monkeypatch, fake_ollama) -> None:
    """The safety property. Scored mid-band on purpose: is_refusal must win."""
    _force_score(monkeypatch, "refuse-medical-advice", 0.60)

    response = await service.answer_question(ChatRequest(question="is my child autistic"))

    assert response.route == "refused"
    assert fake_ollama.generate_calls == []
    assert "cannot" in response.answer.lower() or "not" in response.answer.lower()


@pytest.mark.anyio
async def test_ollama_down_falls_back_lexically(monkeypatch) -> None:
    async def dead_embed(text: str) -> list[float]:
        raise OllamaUnavailable("connection refused")

    monkeypatch.setattr(service.retrieval.ollama, "embed", dead_embed)

    response = await service.answer_question(ChatRequest(question="what is Love 21"))

    assert response.route == "fallback"
    assert response.answer, "the fallback must still answer"


@pytest.mark.anyio
async def test_generation_failure_falls_back_to_the_curated_answer(monkeypatch) -> None:
    """A model that dies mid-answer must not take the page with it."""
    _force_score(monkeypatch, "donate-what-500-funds", 0.60)

    async def ok_embed(text: str) -> list[float]:
        return [1.0, 0.0]

    async def dead_generate(system: str, user: str) -> str:
        raise OllamaUnavailable("timed out")

    monkeypatch.setattr(service.retrieval.ollama, "embed", ok_embed)
    monkeypatch.setattr(service.ollama, "generate", dead_generate)

    response = await service.answer_question(ChatRequest(question="tell me about giving"))

    assert response.route == "fallback"
    assert "HK$500" in response.answer


@pytest.mark.anyio
async def test_response_carries_locale_and_action(monkeypatch, fake_ollama) -> None:
    _force_score(monkeypatch, "donate-what-500-funds", 0.92)

    response = await service.answer_question(ChatRequest(question="捐款用在哪裡", locale="zh-Hant"))

    assert response.locale == "zh-Hant"
    assert response.action is not None
    assert response.action.href.startswith("/donate")
    assert "港幣" in response.answer


@pytest.mark.anyio
async def test_easy_read_returns_the_easy_read_text(monkeypatch, fake_ollama) -> None:
    _force_score(monkeypatch, "donate-what-500-funds", 0.92)

    response = await service.answer_question(
        ChatRequest(question="where does my money go", easy_read=True)
    )

    assert response.answer.startswith("HK$500 pays for one class.")


@pytest.mark.anyio
async def test_followups_resolve_to_labels(monkeypatch, fake_ollama) -> None:
    _force_score(monkeypatch, "donate-what-500-funds", 0.92)

    response = await service.answer_question(ChatRequest(question="where does my money go"))

    assert response.followups
    assert all(f.label and f.question for f in response.followups)
