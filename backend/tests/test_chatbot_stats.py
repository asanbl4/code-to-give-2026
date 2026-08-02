"""The stat-token mechanism that keeps non-negotiable #8 enforceable.

A number that cannot be traced to content/impact-stats.yaml must not be
renderable, so an unknown token is an error rather than a passthrough.
"""

import pytest

from app.features.chatbot import stats as stats_module
from app.features.chatbot.stats import (
    MalformedStatsError,
    UnknownStatError,
    load_stats,
    resolve_tokens,
)


@pytest.fixture
def stats_file(tmp_path, monkeypatch):
    """Point load_stats at a throwaway file, cache cleared either side."""

    def write(text: str):
        path = tmp_path / "impact-stats.yaml"
        path.write_text(text, encoding="utf-8")
        monkeypatch.setattr(stats_module, "STATS_PATH", path)
        load_stats.cache_clear()
        return path

    yield write
    load_stats.cache_clear()


def test_load_stats_reads_every_key() -> None:
    stats = load_stats()

    assert stats["hkd_per_class"] == "500"
    assert stats["class_capacity"] == "15"


def test_resolve_tokens_substitutes() -> None:
    result = resolve_tokens("HK${{ hkd_per_class }} funds one class.", {"hkd_per_class": "500"})

    assert result == "HK$500 funds one class."


def test_resolve_tokens_tolerates_no_inner_spaces() -> None:
    result = resolve_tokens("{{hkd_per_class}}", {"hkd_per_class": "500"})

    assert result == "500"


def test_resolve_tokens_handles_several_tokens() -> None:
    result = resolve_tokens(
        "HK${{ hkd_per_class }} for {{ class_capacity }} members",
        {"hkd_per_class": "500", "class_capacity": "15"},
    )

    assert result == "HK$500 for 15 members"


def test_unknown_token_raises() -> None:
    """The whole point: an unsourced number cannot reach a visitor."""
    with pytest.raises(UnknownStatError, match="made_up_number"):
        resolve_tokens("{{ made_up_number }}", {"hkd_per_class": "500"})


def test_text_without_tokens_is_unchanged() -> None:
    assert resolve_tokens("No numbers here.", {}) == "No numbers here."


# A malformed impact-stats.yaml used to surface a bare KeyError('stats') with no
# file path, which reads as an app bug rather than "you edited the YAML wrong".
# Every case below must name the file and say what to fix.


def test_missing_stats_section_names_the_file(stats_file) -> None:
    path = stats_file("notes: nothing useful here\n")

    with pytest.raises(MalformedStatsError, match="stats"):
        load_stats()

    with pytest.raises(MalformedStatsError, match=path.name):
        load_stats()


def test_empty_file_is_a_clear_error(stats_file) -> None:
    stats_file("")

    with pytest.raises(MalformedStatsError):
        load_stats()


def test_entry_missing_key_reports_its_position(stats_file) -> None:
    stats_file("stats:\n  - key: hkd_per_class\n    value: 500\n  - value: 15\n")

    with pytest.raises(MalformedStatsError, match="entry 2"):
        load_stats()


def test_entry_missing_value_reports_the_key(stats_file) -> None:
    stats_file("stats:\n  - key: hkd_per_class\n")

    with pytest.raises(MalformedStatsError, match="hkd_per_class"):
        load_stats()


def test_stats_section_of_wrong_shape_is_a_clear_error(stats_file) -> None:
    stats_file("stats: just a string\n")

    with pytest.raises(MalformedStatsError):
        load_stats()


def test_well_formed_file_still_loads(stats_file) -> None:
    stats_file("stats:\n  - key: hkd_per_class\n    value: 500\n")

    assert load_stats() == {"hkd_per_class": "500"}
