"""Splitting is pure, so these tests are pure -- no index, no Ollama, no app.

The load-bearing assertion is the negative one: anything not confidently
compound must come back as a single element, because that is what makes the
caller fall through to the existing, known-good path.
"""

import pytest

from app.features.chatbot.splitting import split_question


@pytest.mark.parametrize(
    "question",
    [
        "What is Love 21?",
        "where does my money go",
        "愛21是甚麼？",
        "",
        "   ",
    ],
)
def test_single_questions_are_not_split(question: str) -> None:
    assert len(split_question(question)) == 1


def test_splits_on_english_conjunction() -> None:
    parts = split_question("What is Love 21 and what does HK$500 fund?")
    assert parts == ["What is Love 21", "what does HK$500 fund"]


def test_splits_on_terminal_punctuation() -> None:
    parts = split_question("What is Love 21? What does HK$500 fund?")
    assert parts == ["What is Love 21", "What does HK$500 fund"]


def test_splits_chinese_on_terminal_punctuation() -> None:
    parts = split_question("愛21是甚麼？HK$500可以資助甚麼？")
    assert parts == ["愛21是甚麼", "HK$500可以資助甚麼"]


def test_does_not_split_a_noun_phrase() -> None:
    """'nutrition and dietetics' is one topic, not two questions."""
    assert split_question("tell me about nutrition and dietetics") == [
        "tell me about nutrition and dietetics"
    ]


def test_does_not_split_a_chinese_noun_phrase() -> None:
    assert split_question("運動和營養") == ["運動和營養"]


def test_both_sides_must_look_like_questions() -> None:
    """One interrogative side is not enough -- 'and' is usually not a joint."""
    assert split_question("what do you do and thanks for your help") == [
        "what do you do and thanks for your help"
    ]


def test_four_parts_are_treated_as_one_question() -> None:
    """Four stacked answers is not an answer. Cap and fall through."""
    question = "what is Love 21? who can join? how much is a class? is it free?"
    assert split_question(question) == [question]


def test_a_statement_half_does_not_split() -> None:
    """Both sides must ask something.

    "what do you do and I want to hurt myself" stays whole -- 'I want to hurt
    myself' contains no question word. That is safe rather than lucky: the
    whole question still ranks, and distress language retrieves refuse-distress
    at high confidence on the ordinary single-question path.
    """
    question = "what do you do and I want to hurt myself"
    assert split_question(question) == [question]


def test_a_leading_conjunction_is_stripped() -> None:
    """Terminator splitting leaves 'and' stranded at the front of part two."""
    assert split_question("what do you do? And can my child join?") == [
        "what do you do",
        "can my child join",
    ]


def test_parts_are_stripped_and_empty_fragments_dropped() -> None:
    parts = split_question("what do you do?  can my child join?  ")
    assert parts == ["what do you do", "can my child join"]
