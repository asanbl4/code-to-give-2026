"""Corpus validation. Content errors must fail at load, never at a visitor.

Every rule here maps to a non-negotiable in local/CONTEXT.md: both locales
(#5), a source (#8), resolvable stat tokens (#8), a real followup target.
"""

import pytest

from app.features.chatbot.corpus import CorpusError, load_corpus, parse_entries


def test_every_entry_has_both_locales() -> None:
    for entry in load_corpus():
        assert entry.answer_en.strip(), f"{entry.id} has no English answer"
        assert entry.answer_zh.strip(), f"{entry.id} has no Chinese answer"
        assert entry.easy_read_en.strip(), f"{entry.id} has no Easy Read English"
        assert entry.easy_read_zh.strip(), f"{entry.id} has no Easy Read Chinese"


def test_every_entry_has_triggers_in_both_locales() -> None:
    for entry in load_corpus():
        assert entry.triggers_en, f"{entry.id} has no English triggers"
        assert entry.triggers_zh, f"{entry.id} has no Chinese triggers"


def test_every_entry_has_a_source() -> None:
    for entry in load_corpus():
        assert entry.source, f"{entry.id} has no source"


def test_entry_ids_are_unique() -> None:
    ids = [entry.id for entry in load_corpus()]

    assert len(ids) == len(set(ids))


def test_every_followup_resolves_to_a_real_entry() -> None:
    entries = load_corpus()
    known = {entry.id for entry in entries}

    for entry in entries:
        for followup in entry.followups:
            assert followup in known, f"{entry.id} points at missing entry '{followup}'"


def test_every_action_href_is_site_relative() -> None:
    """An off-site href in a 'go here next' button would be a nasty surprise."""
    for entry in load_corpus():
        if entry.action is not None:
            assert entry.action.href.startswith("/"), f"{entry.id} href is not site-relative"


def test_at_least_one_refusal_entry_exists() -> None:
    """Medical questions must retrieve a handoff, not reach the model."""
    assert any(entry.is_refusal for entry in load_corpus())


def test_stat_tokens_are_resolved_at_load() -> None:
    entry = next(e for e in load_corpus() if e.id == "donate-what-500-funds")

    assert "{{" not in entry.answer_en
    assert "HK$500" in entry.answer_en


def test_unknown_stat_token_rejects_the_corpus() -> None:
    bad = [
        {
            "id": "bad",
            "triggers_en": ["x"],
            "triggers_zh": ["x"],
            "answer_en": "{{ nonexistent_stat }}",
            "answer_zh": "x",
            "easy_read_en": "x",
            "easy_read_zh": "x",
            "source": "test",
        }
    ]

    with pytest.raises(CorpusError, match="nonexistent_stat"):
        parse_entries(bad, source_name="test.yaml")


def test_missing_required_field_rejects_the_corpus() -> None:
    with pytest.raises(CorpusError, match="answer_zh"):
        parse_entries([{"id": "bad", "answer_en": "x"}], source_name="test.yaml")


def test_answer_selects_locale_and_easy_read() -> None:
    entry = next(e for e in load_corpus() if e.id == "donate-what-500-funds")

    assert entry.answer("en", easy_read=False) == entry.answer_en
    assert entry.answer("zh-Hant", easy_read=False) == entry.answer_zh
    assert entry.answer("en", easy_read=True) == entry.easy_read_en
    assert entry.answer("zh-Hant", easy_read=True) == entry.easy_read_zh
