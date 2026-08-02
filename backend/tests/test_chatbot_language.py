"""Answer in the language the visitor actually wrote in.

Pure, so these tests are pure. The asymmetry is the point and is asserted
below: a Chinese question always wins over a stated "en", but an English
question never overrides a stated "zh-Hant".
"""

import pytest

from app.features.chatbot.language import resolve_locale


@pytest.mark.parametrize(
    "question",
    [
        "愛21是甚麼",
        "捐款用在哪裡",
        "HK$500可以資助甚麼",
        "Love 21是甚麼",  # mixed script, still a Chinese question
    ],
)
def test_a_chinese_question_overrides_a_stated_english_locale(question: str) -> None:
    assert resolve_locale(question, "en") == "zh-Hant"


@pytest.mark.parametrize(
    "question",
    [
        "what is Love 21",
        "where does my money go",
        "",
        "   ",
        "HK$500?",
    ],
)
def test_an_english_question_stays_english(question: str) -> None:
    assert resolve_locale(question, "en") == "en"


def test_an_english_question_never_overrides_a_stated_chinese_locale() -> None:
    """Asymmetric on purpose.

    Someone who set the site to Chinese and typed an English product name is
    still a Chinese reader. Only the en -> zh-Hant direction is a correction.
    """
    assert resolve_locale("Love 21", "zh-Hant") == "zh-Hant"


def test_a_chinese_question_with_a_stated_chinese_locale_is_unchanged() -> None:
    assert resolve_locale("愛21是甚麼", "zh-Hant") == "zh-Hant"


def test_a_single_han_character_is_below_the_threshold() -> None:
    """One stray character is likelier a paste than a Chinese question."""
    assert resolve_locale("what does 愛 mean", "en") == "en"
