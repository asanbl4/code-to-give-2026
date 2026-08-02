"""The index, and the staleness check that stops a stale one reaching a demo."""

import pytest

from app.features.chatbot import index
from app.features.chatbot.corpus import load_corpus


def test_corpus_hash_is_stable() -> None:
    entries = load_corpus()

    assert index.corpus_hash(entries) == index.corpus_hash(entries)


def test_corpus_hash_changes_when_text_changes() -> None:
    entries = load_corpus()
    before = index.corpus_hash(entries)

    mutated = [e.model_copy(update={"answer_en": e.answer_en + " extra"}) for e in entries]

    assert index.corpus_hash(mutated) != before


def test_index_file_exists() -> None:
    """A missing index means someone forgot `uv run python -m
    app.features.chatbot.build_index`."""
    assert index.INDEX_PATH.exists(), "Run: uv run python -m app.features.chatbot.build_index"


def test_index_is_not_stale() -> None:
    """Edit a knowledge YAML without rebuilding and this fails, rather than the
    bot silently answering from an old index during the demo."""
    stored = index.load_index()

    assert stored is not None
    assert stored.corpus_hash == index.corpus_hash(load_corpus()), (
        "index.json is out of date. Run: uv run python -m app.features.chatbot.build_index"
    )


def test_every_trigger_is_indexed() -> None:
    stored = index.load_index()
    entries = load_corpus()

    expected = sum(len(e.triggers_en) + len(e.triggers_zh) for e in entries)

    assert len(stored.triggers) == expected


@pytest.mark.anyio
async def test_build_index_embeds_every_trigger(monkeypatch) -> None:
    calls: list[str] = []

    async def fake_embed(text: str) -> list[float]:
        calls.append(text)
        return [0.5, 0.5]

    monkeypatch.setattr(index.ollama, "embed", fake_embed)

    built = await index.build_index()
    entries = load_corpus()
    expected = sum(len(e.triggers_en) + len(e.triggers_zh) for e in entries)

    assert len(calls) == expected
    assert len(built.triggers) == expected
    assert built.corpus_hash == index.corpus_hash(entries)
