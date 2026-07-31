"""Ranking, and the lexical path that keeps the bot answering without Ollama."""

import pytest

from app.features.chatbot import retrieval
from app.features.chatbot.corpus import load_corpus
from app.features.chatbot.index import IndexedTrigger, VectorIndex


def test_cosine_of_identical_vectors_is_one() -> None:
    assert retrieval.cosine([1.0, 0.0], [1.0, 0.0]) == pytest.approx(1.0)


def test_cosine_of_orthogonal_vectors_is_zero() -> None:
    assert retrieval.cosine([1.0, 0.0], [0.0, 1.0]) == pytest.approx(0.0)


def test_cosine_ignores_magnitude() -> None:
    assert retrieval.cosine([2.0, 0.0], [9.0, 0.0]) == pytest.approx(1.0)


def test_cosine_of_zero_vector_is_zero_not_an_error() -> None:
    assert retrieval.cosine([0.0, 0.0], [1.0, 1.0]) == 0.0


def test_lexical_score_is_one_for_an_exact_match() -> None:
    assert retrieval.lexical_score("what is Love 21", "what is Love 21") == pytest.approx(1.0)


def test_lexical_score_ignores_case_and_punctuation() -> None:
    assert retrieval.lexical_score("What is Love 21?", "what is love 21") > 0.9


def test_lexical_score_is_low_for_unrelated_text() -> None:
    assert retrieval.lexical_score("weather in Tokyo", "how do I donate") < 0.3


def test_lexical_score_works_on_chinese() -> None:
    """Whitespace tokenising fails on Chinese; character bigrams do not."""
    assert retrieval.lexical_score("甚麼是愛21", "甚麼是愛21") == pytest.approx(1.0)
    assert retrieval.lexical_score("甚麼是愛21", "我可以怎樣捐款") < 0.3


@pytest.mark.anyio
async def test_rank_puts_the_best_entry_first(monkeypatch) -> None:
    entries = {entry.id: entry for entry in load_corpus()}
    target = "donate-what-500-funds"

    vector_index = VectorIndex(
        corpus_hash="x",
        model="test",
        triggers=[
            IndexedTrigger(entry_id="about-what-is-love21", text="a", vector=[0.0, 1.0]),
            IndexedTrigger(entry_id=target, text="b", vector=[1.0, 0.0]),
        ],
    )

    async def fake_embed(text: str) -> list[float]:
        return [1.0, 0.0]

    monkeypatch.setattr(retrieval.ollama, "embed", fake_embed)

    ranked = await retrieval.rank("where does my money go", vector_index, entries)

    assert ranked[0][0].id == target
    assert ranked[0][1] == pytest.approx(1.0)


@pytest.mark.anyio
async def test_rank_takes_the_best_trigger_per_entry(monkeypatch) -> None:
    """An entry with five triggers must not be penalised for the four that miss."""
    entries = {entry.id: entry for entry in load_corpus()}
    target = "donate-what-500-funds"

    vector_index = VectorIndex(
        corpus_hash="x",
        model="test",
        triggers=[
            IndexedTrigger(entry_id=target, text="miss", vector=[0.0, 1.0]),
            IndexedTrigger(entry_id=target, text="hit", vector=[1.0, 0.0]),
        ],
    )

    async def fake_embed(text: str) -> list[float]:
        return [1.0, 0.0]

    monkeypatch.setattr(retrieval.ollama, "embed", fake_embed)
    ranked = await retrieval.rank("q", vector_index, entries)

    assert ranked[0][1] == pytest.approx(1.0)


def test_rank_lexically_matches_a_suggested_question_exactly() -> None:
    """The suggested-question buttons must keep working with no model running."""
    entries = {entry.id: entry for entry in load_corpus()}
    entry = entries["about-what-is-love21"]

    ranked = retrieval.rank_lexically(entry.triggers_en[0], entries)

    assert ranked[0][0].id == "about-what-is-love21"
    assert ranked[0][1] == pytest.approx(1.0)
