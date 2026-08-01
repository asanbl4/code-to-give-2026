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


@pytest.fixture
def generation_band(monkeypatch) -> None:
    """Re-open the generated band, which the shipped config closes.

    The default sets high == low so the model never writes visitor-facing text
    (see config.py). The generation path is still live code for a bigger model
    and a fuller corpus, so it is still tested -- just not with the shipped
    thresholds. test_shipped_thresholds_disable_generation covers the default.

    chatbot_answer_confidence has to come down too. It is the point at which an
    entry is usable at all, so it forms the *bottom* of the generated band:
    leaving it at the shipped 0.80 while high is 0.75 makes the band empty from
    the other direction, and nothing would ever generate.
    """
    monkeypatch.setattr(service.settings, "chatbot_high_confidence", 0.75)
    monkeypatch.setattr(service.settings, "chatbot_low_confidence", 0.55)
    monkeypatch.setattr(service.settings, "chatbot_answer_confidence", 0.55)


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
async def test_mid_confidence_generates_from_retrieved_passages(
    monkeypatch, fake_ollama, generation_band
) -> None:
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
async def test_refusal_entry_never_reaches_the_model(
    monkeypatch, fake_ollama, generation_band
) -> None:
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
async def test_generation_failure_falls_back_to_the_curated_answer(
    monkeypatch, generation_band
) -> None:
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


# A weak match on a refusal entry used to be served verbatim, because is_refusal
# short-circuited before the low-confidence check. Asking "what is the weather in
# Tokyo" scored 0.427 against refuse-distress on the real index and answered with
# the crisis text -- telling someone asking about the weather to call 999. That
# both reads as broken and cheapens the response for the person who needs it.


@pytest.mark.anyio
async def test_weak_match_on_a_refusal_entry_gives_the_generic_refusal(
    monkeypatch, fake_ollama
) -> None:
    _force_score(monkeypatch, "refuse-distress", 0.42)

    response = await service.answer_question(
        ChatRequest(question="what is the weather in Tokyo")
    )

    assert response.route == "refused"
    assert response.sources == [], "an off-topic question must not cite the distress entry"
    assert "999" not in response.answer
    assert fake_ollama.generate_calls == []


@pytest.mark.anyio
async def test_weak_match_on_a_medical_refusal_does_not_cite_it(monkeypatch, fake_ollama) -> None:
    _force_score(monkeypatch, "refuse-medical-advice", 0.30)

    response = await service.answer_question(ChatRequest(question="how do I fix my bicycle"))

    assert response.route == "refused"
    assert response.sources == []


@pytest.mark.anyio
async def test_confident_distress_match_still_gives_the_safeguarding_answer(
    monkeypatch, fake_ollama
) -> None:
    """The guard above must not weaken the case it exists for."""
    _force_score(monkeypatch, "refuse-distress", 0.88)

    response = await service.answer_question(ChatRequest(question="I want to hurt myself"))

    assert response.route == "refused"
    assert response.sources != []
    assert "999" in response.answer
    assert fake_ollama.generate_calls == []


@pytest.mark.anyio
async def test_mid_band_refusal_still_refuses_without_the_model(
    monkeypatch, fake_ollama, generation_band
) -> None:
    """A refusal scoring inside the generated band must never reach the model."""
    _force_score(monkeypatch, "refuse-medical-advice", 0.65)

    response = await service.answer_question(ChatRequest(question="is my child autistic"))

    assert response.route == "refused"
    assert response.sources != []
    assert fake_ollama.generate_calls == []


@pytest.mark.anyio
async def test_refusal_entries_are_not_given_to_the_model_as_context(
    monkeypatch, fake_ollama, generation_band
) -> None:
    """Refusal text must not be quotable material for an ordinary answer.

    The corpus is small, so the top 4 passages nearly always include a refusal
    entry. Handing the model "call 999 in an emergency" as reference material
    for a donation question invites it to blend crisis text into a cheerful
    answer -- the prompt discourages that, but not structurally.
    """
    from app.features.chatbot.corpus import load_corpus

    corpus = {e.id: e for e in load_corpus()}
    ranked = [
        (corpus["about-who-can-join"], 0.65),
        (corpus["refuse-distress"], 0.62),
        (corpus["refuse-medical-advice"], 0.60),
        (corpus["donate-what-500-funds"], 0.58),
    ]

    async def fake_rank(question, vector_index, entries):
        return ranked

    monkeypatch.setattr(service.retrieval, "rank", fake_rank)

    response = await service.answer_question(ChatRequest(question="who can join in"))

    assert response.route == "generated"
    assert len(fake_ollama.generate_calls) == 1
    _, user_prompt = fake_ollama.generate_calls[0]

    assert "999" not in user_prompt
    assert "refuse-distress" not in user_prompt
    assert "refuse-medical-advice" not in user_prompt
    assert "about-who-can-join" in user_prompt, "the matched entry must still be context"


@pytest.mark.anyio
async def test_shipped_thresholds_disable_generation(monkeypatch, fake_ollama) -> None:
    """The shipped config must never let the model write visitor-facing text.

    qwen3:1.7b invented an institutional commitment on every uncovered question
    measured on 2026-08-01 -- including "you can visit our centres", a
    safeguarding claim. high == low closes the band. This test fails the moment
    someone widens it, which is the point: reopening it is a decision, not a
    tweak.
    """
    assert (
        service.settings.chatbot_high_confidence == service.settings.chatbot_low_confidence
    ), "high must equal low, or the model can write to visitors"

    # Scores spanning everything that is answerable at all. Below
    # chatbot_answer_confidence an ordinary entry is refused rather than
    # answered, so probing 0.56-0.74 here would test the floor, not the band.
    for score in (0.80, 0.85, 0.95, 1.00):
        _force_score(monkeypatch, "donate-what-500-funds", score)

        response = await service.answer_question(ChatRequest(question="tell me about giving"))

        assert response.route == "curated", f"score {score} produced {response.route}"
        assert "HK$500" in response.answer, "must be the staff wording, verbatim"

    assert fake_ollama.generate_calls == [], "no score may reach the model"


def _force_scores_by_part(monkeypatch, table: dict[str, tuple[str, float]]) -> None:
    """Pin retrieval per question string.

    Compound routing ranks the whole question AND each part, so the single
    `_force_score` helper above cannot express it -- every call would return
    the same entry. Keys are matched exactly against the text being ranked.
    """
    from app.features.chatbot.corpus import load_corpus

    corpus = {entry.id: entry for entry in load_corpus()}

    async def fake_rank(question, vector_index, entries):
        if question not in table:
            return []
        entry_id, score = table[question]
        return [(corpus[entry_id], score)]

    monkeypatch.setattr(service.retrieval, "rank", fake_rank)


@pytest.mark.anyio
async def test_compound_question_answers_both_halves(monkeypatch, fake_ollama) -> None:
    _force_scores_by_part(
        monkeypatch,
        {
            "What is Love 21 and what does HK$500 fund?": ("about-what-is-love21", 0.72),
            "What is Love 21": ("about-what-is-love21", 0.97),
            "what does HK$500 fund": ("donate-what-500-funds", 0.91),
        },
    )

    response = await service.answer_question(
        ChatRequest(question="What is Love 21 and what does HK$500 fund?")
    )

    assert response.route == "composed"
    assert [source.entry_id for source in response.sources] == [
        "about-what-is-love21",
        "donate-what-500-funds",
    ]
    assert "\n\n" in response.answer
    assert not fake_ollama.generate_calls, "composing must not call the model"


@pytest.mark.anyio
async def test_a_refusal_in_any_part_dominates(monkeypatch, fake_ollama) -> None:
    """Answering the innocuous half buries the half that matters."""
    _force_scores_by_part(
        monkeypatch,
        {
            "what do you do and is my child autistic?": ("about-what-is-love21", 0.60),
            "what do you do": ("about-what-is-love21", 0.97),
            "is my child autistic": ("refuse-medical-advice", 0.88),
        },
    )

    response = await service.answer_question(
        ChatRequest(question="what do you do and is my child autistic?")
    )

    assert response.route == "refused"
    assert [source.entry_id for source in response.sources] == ["refuse-medical-advice"]
    assert "Love 21 is a Hong Kong charity" not in response.answer
    assert not fake_ollama.generate_calls


@pytest.mark.anyio
async def test_two_parts_hitting_one_entry_answer_once(monkeypatch, fake_ollama) -> None:
    _force_scores_by_part(
        monkeypatch,
        {
            "what do you do and who are you?": ("about-what-is-love21", 0.80),
            "what do you do": ("about-what-is-love21", 0.97),
            "who are you": ("about-what-is-love21", 0.95),
        },
    )

    response = await service.answer_question(
        ChatRequest(question="what do you do and who are you?")
    )

    assert len(response.sources) == 1
    assert response.answer.count("Love 21 is a Hong Kong charity") == 1


@pytest.mark.anyio
async def test_an_uncovered_part_is_named_not_dropped(monkeypatch, fake_ollama) -> None:
    """The bug being fixed is the silent drop. Say the half went unanswered."""
    _force_scores_by_part(
        monkeypatch,
        {
            "what do you do and how do I volunteer?": ("about-what-is-love21", 0.63),
            "what do you do": ("about-what-is-love21", 0.97),
            "how do I volunteer": ("donate-monthly-or-one-off", 0.64),  # below 0.70
        },
    )

    response = await service.answer_question(
        ChatRequest(question="what do you do and how do I volunteer?")
    )

    assert [source.entry_id for source in response.sources] == ["about-what-is-love21"]
    assert "get in touch" in response.answer.lower()
    assert response.action is not None
    assert response.action.href == "/contact", "the unanswered half is the useful next step"


@pytest.mark.anyio
async def test_no_acceptable_part_falls_back_to_the_whole_question(
    monkeypatch, fake_ollama
) -> None:
    _force_scores_by_part(
        monkeypatch,
        {
            "what do you do and how do I volunteer?": ("about-what-is-love21", 0.80),
            "what do you do": ("about-what-is-love21", 0.40),
            "how do I volunteer": ("donate-monthly-or-one-off", 0.30),
        },
    )

    response = await service.answer_question(
        ChatRequest(question="what do you do and how do I volunteer?")
    )

    assert response.route == "curated", "falls through to today's path"
    assert [source.entry_id for source in response.sources] == ["about-what-is-love21"]


@pytest.mark.anyio
async def test_degraded_ranking_skips_the_compound_path(monkeypatch, fake_ollama) -> None:
    """Lexical scores occupy a different range; 0.70 would reject everything."""
    monkeypatch.setattr(service.index, "load_index", lambda: None)

    response = await service.answer_question(
        ChatRequest(question="what do you do and who can join?")
    )

    assert response.route in {"fallback", "refused"}
    assert response.route != "composed"


@pytest.mark.anyio
async def test_single_questions_are_unaffected(monkeypatch, fake_ollama) -> None:
    _force_score(monkeypatch, "donate-what-500-funds", 0.92)

    response = await service.answer_question(ChatRequest(question="where does my money go"))

    assert response.route == "curated"
    assert len(response.sources) == 1


@pytest.mark.anyio
async def test_halves_are_answered_in_the_order_asked(monkeypatch, fake_ollama) -> None:
    """Score order is not question order.

    Found end to end, not by the tests above: "What is Love 21 and what does
    HK$500 fund?" scores its SECOND half higher once both are exact triggers,
    so sorting by score answered the visitor backwards.
    """
    _force_scores_by_part(
        monkeypatch,
        {
            "What is Love 21 and what does HK$500 fund?": ("about-what-is-love21", 0.72),
            "What is Love 21": ("about-what-is-love21", 0.90),
            "what does HK$500 fund": ("donate-what-500-funds", 1.00),
        },
    )

    response = await service.answer_question(
        ChatRequest(question="What is Love 21 and what does HK$500 fund?")
    )

    assert [source.entry_id for source in response.sources] == [
        "about-what-is-love21",
        "donate-what-500-funds",
    ], "answered in the order asked, not by score"
    assert response.answer.index("Love 21 is a Hong Kong charity") < response.answer.index(
        "HK$500 funds one class"
    )
    # The action still comes from the best-scoring part, which here is the second.
    assert response.action is not None
    assert response.action.href.startswith("/donate")


@pytest.mark.anyio
async def test_a_chinese_question_is_answered_in_chinese(monkeypatch, fake_ollama) -> None:
    """The browser pins locale to "en" until the accessibility toolbar exists.

    A Cantonese-first visitor typing Chinese must not be answered in English
    because of a site-wide toggle they never saw.
    """
    _force_score(monkeypatch, "about-what-is-love21", 0.95)

    response = await service.answer_question(ChatRequest(question="愛21是甚麼", locale="en"))

    assert response.locale == "zh-Hant"
    assert response.answer.startswith("愛21是一間香港慈善機構")


@pytest.mark.anyio
async def test_a_near_miss_is_refused_rather_than_answered(monkeypatch, fake_ollama) -> None:
    """The reported bug: "how can I help" answered with what Love 21 is.

    Uncovered questions measured 0.53-0.72 against the nearest entry on
    2026-08-01. At the old 0.55 floor, eight of nine were answered confidently
    and wrongly.
    """
    _force_score(monkeypatch, "about-what-is-love21", 0.72)

    response = await service.answer_question(ChatRequest(question="where are you located"))

    assert response.route == "refused"
    assert response.sources == [], "a near miss must not cite the entry it nearly matched"
    assert response.action is not None, "a refusal must still offer a person"


@pytest.mark.anyio
async def test_a_refusal_entry_uses_a_lower_floor_than_an_answer(
    monkeypatch, fake_ollama
) -> None:
    """The asymmetry, and the reason the floors are split.

    "I feel like ending it" scores 0.728 -- below the answer floor. Raising a
    single shared floor would have dropped it to the generic "contact us" and
    lost the 999 handoff. A safeguarding entry must fire more readily than an
    ordinary answer, not less.
    """
    _force_score(monkeypatch, "refuse-distress", 0.728)

    response = await service.answer_question(ChatRequest(question="I feel like ending it"))

    assert response.route == "refused"
    assert [source.entry_id for source in response.sources] == ["refuse-distress"]
    assert "999" in response.answer, "the safeguarding handoff must survive the split"
    assert fake_ollama.generate_calls == []


@pytest.mark.anyio
async def test_the_degraded_path_keeps_the_permissive_floor(monkeypatch, fake_ollama) -> None:
    """Lexical scores are Jaccard bigram overlap -- a different scale entirely.

    Applying the cosine answer floor to them would refuse nearly everything and
    make the Ollama-down path useless, which is the opposite of degrade-not-fail.
    """
    from app.features.chatbot.corpus import load_corpus

    entry = next(e for e in load_corpus() if e.id == "about-what-is-love21")
    monkeypatch.setattr(service.index, "load_index", lambda: None)
    monkeypatch.setattr(service.retrieval, "rank_lexically", lambda q, e: [(entry, 0.60)])

    response = await service.answer_question(ChatRequest(question="what is Love 21"))

    assert response.route == "fallback", "0.60 lexical must still answer"
    assert response.answer
