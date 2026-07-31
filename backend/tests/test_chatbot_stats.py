"""The stat-token mechanism that keeps non-negotiable #8 enforceable.

A number that cannot be traced to content/impact-stats.yaml must not be
renderable, so an unknown token is an error rather than a passthrough.
"""

import pytest

from app.features.chatbot.stats import UnknownStatError, load_stats, resolve_tokens


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
