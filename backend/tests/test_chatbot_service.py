"""Safeguarding filter, then the model.

The load-bearing assertions are the negative ones: a medical or self-harm
question must never reach the model, and a dead Ollama must never produce a 500.

The model DOES write visitor-facing text now (changed 2026-08-01 at the user's
direction), so there is no longer a test asserting it cannot. What remains is
the boundary it may not cross.
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
    lexical path and these tests would pass or fail according to whether
    someone had run build_index -- testing the build, not the routing.
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
    """Pin retrieval so each case can be tested in isolation."""
    from app.features.chatbot.corpus import load_corpus

    entry = next(e for e in load_corpus() if e.id == entry_id)

    async def fake_rank(question, vector_index, entries):
        return [(entry, score)]

    monkeypatch.setattr(service.retrieval, "rank", fake_rank)


# --- the model answers ------------------------------------------------------


@pytest.mark.anyio
async def test_an_ordinary_question_is_answered_by_the_model(monkeypatch, fake_ollama) -> None:
    _force_score(monkeypatch, "donate-what-500-funds", 0.92)

    response = await service.answer_question(ChatRequest(question="where does my money go"))

    assert response.route == "generated"
    assert response.answer == "generated answer"
    assert len(fake_ollama.generate_calls) == 1


@pytest.mark.anyio
async def test_the_model_is_given_the_whole_corpus(monkeypatch, fake_ollama) -> None:
    """No retrieval cut. The corpus is small enough to hand over entire, which
    is what lets one prompt answer a question asking two things at once."""
    _force_score(monkeypatch, "about-what-is-love21", 0.30)

    await service.answer_question(ChatRequest(question="anything at all"))

    _system, user = fake_ollama.generate_calls[0]
    for fragment in ("HK$500 funds one class", "Love 21 is a Hong Kong charity", "volunteer"):
        assert fragment in user, f"{fragment!r} missing from the prompt"


@pytest.mark.anyio
async def test_a_low_scoring_question_still_reaches_the_model(monkeypatch, fake_ollama) -> None:
    """There is no answer floor any more -- that was the point of the change."""
    _force_score(monkeypatch, "about-what-is-love21", 0.10)

    response = await service.answer_question(ChatRequest(question="where are you located"))

    assert response.route == "generated"
    assert fake_ollama.generate_calls


@pytest.mark.anyio
async def test_refusal_entries_are_not_given_to_the_model_as_context(
    monkeypatch, fake_ollama
) -> None:
    """"Call 999 in an emergency" must not be quotable material for a donation
    question -- the safeguarding check owns those questions outright."""
    _force_score(monkeypatch, "donate-what-500-funds", 0.92)

    await service.answer_question(ChatRequest(question="where does my money go"))

    _system, user = fake_ollama.generate_calls[0]
    assert "999" not in user


# --- the boundary the model may not cross -----------------------------------


@pytest.mark.anyio
async def test_a_medical_question_never_reaches_the_model(monkeypatch, fake_ollama) -> None:
    _force_score(monkeypatch, "refuse-medical-advice", 0.88)

    response = await service.answer_question(ChatRequest(question="is my child autistic"))

    assert response.route == "refused"
    assert [s.entry_id for s in response.sources] == ["refuse-medical-advice"]
    assert fake_ollama.generate_calls == [], "a medical question must not reach the model"


@pytest.mark.anyio
async def test_a_self_harm_question_never_reaches_the_model(monkeypatch, fake_ollama) -> None:
    _force_score(monkeypatch, "refuse-distress", 0.728)

    response = await service.answer_question(ChatRequest(question="I feel like ending it"))

    assert response.route == "refused"
    assert "999" in response.answer
    assert fake_ollama.generate_calls == [], "a self-harm question must not reach the model"


@pytest.mark.anyio
async def test_a_refusal_below_the_top_does_not_hijack_the_answer(
    monkeypatch, fake_ollama
) -> None:
    """Only the TOP match can refuse.

    Scanning the whole ranked list was tried and shipped a real bug: some
    refusal entry scores above the floor for almost any question, so "how can I
    help" -- top match volunteer-how-to-start at 1.000, refuse-distress at
    0.686 -- was answered with "call 999". Measured 2026-08-01: a question that
    genuinely needs refusing ranks the refusal FIRST.
    """
    from app.features.chatbot.corpus import load_corpus

    corpus = {e.id: e for e in load_corpus()}

    async def fake_rank(question, vector_index, entries):
        return [(corpus["volunteer-how-to-start"], 1.00), (corpus["refuse-distress"], 0.686)]

    monkeypatch.setattr(service.retrieval, "rank", fake_rank)

    response = await service.answer_question(ChatRequest(question="how can I help"))

    assert response.route == "generated", "a volunteer must not be told to call 999"
    assert fake_ollama.generate_calls


@pytest.mark.anyio
async def test_a_compound_question_with_a_medical_half_still_refuses(
    monkeypatch, fake_ollama
) -> None:
    """"what do you do and is my child autistic" ranks refuse-medical-advice
    top at 0.851, so top-only checking still catches it."""
    _force_score(monkeypatch, "refuse-medical-advice", 0.851)

    response = await service.answer_question(
        ChatRequest(question="what do you do and is my child autistic")
    )

    assert response.route == "refused"
    assert fake_ollama.generate_calls == []


@pytest.mark.anyio
async def test_an_off_topic_question_is_not_served_the_crisis_text(
    monkeypatch, fake_ollama
) -> None:
    """The scar. "what is the weather in Tokyo" ranks refuse-distress top at
    0.427; serving that told a visitor asking about weather to call 999."""
    _force_score(monkeypatch, "refuse-distress", 0.427)

    response = await service.answer_question(ChatRequest(question="what is the weather in Tokyo"))

    assert response.route == "generated", "below the floor it is an ordinary question"
    assert "999" not in response.answer


# --- degrade, never fail ----------------------------------------------------


@pytest.mark.anyio
async def test_ollama_down_falls_back_to_a_written_answer(monkeypatch) -> None:
    async def dead_embed(text: str) -> list[float]:
        raise OllamaUnavailable("connection refused")

    monkeypatch.setattr(service.retrieval.ollama, "embed", dead_embed)

    response = await service.answer_question(ChatRequest(question="what is Love 21"))

    assert response.route == "fallback"
    assert response.answer, "the fallback must still answer"


@pytest.mark.anyio
async def test_generation_failure_falls_back_to_the_curated_answer(monkeypatch) -> None:
    """A model that dies mid-answer must not take the page with it."""
    _force_score(monkeypatch, "donate-what-500-funds", 0.92)

    async def ok_embed(text: str) -> list[float]:
        return [1.0, 0.0]

    async def dead_generate(system: str, user: str) -> str:
        raise OllamaUnavailable("timed out")

    monkeypatch.setattr(service.retrieval.ollama, "embed", ok_embed)
    monkeypatch.setattr(service.ollama, "generate", dead_generate)

    response = await service.answer_question(ChatRequest(question="where does my money go"))

    assert response.route == "fallback"
    assert "HK$500" in response.answer


@pytest.mark.anyio
async def test_an_empty_generation_falls_back(monkeypatch, fake_ollama) -> None:
    fake_ollama.text = ""
    _force_score(monkeypatch, "donate-what-500-funds", 0.92)

    response = await service.answer_question(ChatRequest(question="where does my money go"))

    assert response.route == "fallback"
    assert "HK$500" in response.answer


@pytest.mark.anyio
async def test_safeguarding_survives_a_dead_model(monkeypatch) -> None:
    """The filter runs on embeddings, so a dead generation model cannot
    silently disable it."""
    _force_score(monkeypatch, "refuse-distress", 0.90)

    async def ok_embed(text: str) -> list[float]:
        return [1.0, 0.0]

    async def dead_generate(system: str, user: str) -> str:
        raise OllamaUnavailable("timed out")

    monkeypatch.setattr(service.retrieval.ollama, "embed", ok_embed)
    monkeypatch.setattr(service.ollama, "generate", dead_generate)

    response = await service.answer_question(ChatRequest(question="I want to hurt myself"))

    assert response.route == "refused"
    assert "999" in response.answer


# --- locale and presentation ------------------------------------------------


@pytest.mark.anyio
async def test_a_chinese_question_is_answered_in_chinese(monkeypatch, fake_ollama) -> None:
    """The browser pins locale to "en" until the accessibility toolbar exists."""
    _force_score(monkeypatch, "about-what-is-love21", 0.95)

    response = await service.answer_question(ChatRequest(question="愛21是甚麼", locale="en"))

    assert response.locale == "zh-Hant"
    system, _user = fake_ollama.generate_calls[0]
    assert "Traditional Chinese" in system, "the model must be told which language to reply in"


@pytest.mark.anyio
async def test_a_chinese_refusal_is_answered_in_chinese(monkeypatch, fake_ollama) -> None:
    _force_score(monkeypatch, "refuse-distress", 0.90)

    response = await service.answer_question(ChatRequest(question="我想傷害自己", locale="en"))

    assert response.locale == "zh-Hant"
    assert response.route == "refused"
    assert "999" in response.answer


@pytest.mark.anyio
async def test_a_generated_answer_still_carries_an_action_and_followups(
    monkeypatch, fake_ollama
) -> None:
    _force_score(monkeypatch, "donate-what-500-funds", 0.92)

    response = await service.answer_question(ChatRequest(question="where does my money go"))

    assert response.action is not None
    assert response.action.href.startswith("/donate")
    assert response.followups
    assert all(f.label and f.question for f in response.followups)


@pytest.mark.anyio
async def test_easy_read_reaches_the_prompt(monkeypatch, fake_ollama) -> None:
    """Easy Read has to change the passages, not just the rendering -- there is
    no curated text being returned verbatim any more."""
    _force_score(monkeypatch, "donate-what-500-funds", 0.92)

    await service.answer_question(
        ChatRequest(question="where does my money go", easy_read=True)
    )

    _system, user = fake_ollama.generate_calls[0]
    assert "HK$500 pays for one class." in user
