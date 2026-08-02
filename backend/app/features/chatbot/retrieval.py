"""Rank corpus entries against a question.

Pure Python cosine, deliberately. The corpus is a few hundred vectors, so a
ranking pass is a fraction of a millisecond -- numpy would be a dependency we
cannot justify in one sentence.

Two ranking paths. `rank` is the real one and needs Ollama. `rank_lexically` is
the fallback for when Ollama is not running: character-bigram overlap, which
works on English and Chinese alike (whitespace tokenising does not). It is
crude, but the suggested-question buttons send exact trigger text, so they score
1.0 and keep working with no model at all.
"""

import math
import re
import unicodedata

from app.features.chatbot import ollama
from app.features.chatbot.index import VectorIndex
from app.features.chatbot.models import Entry

_PUNCTUATION = re.compile(r"[^\w\s]", re.UNICODE)


def cosine(a: list[float], b: list[float]) -> float:
    """Cosine similarity. Returns 0.0 for a zero vector rather than raising."""
    dot = sum(x * y for x, y in zip(a, b, strict=True))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return dot / (norm_a * norm_b)


def _bigrams(text: str) -> set[str]:
    """Character bigrams of normalised text. Language-agnostic by design."""
    folded = unicodedata.normalize("NFKC", text).casefold()
    stripped = _PUNCTUATION.sub(" ", folded)
    compact = "".join(stripped.split())
    if len(compact) < 2:
        return {compact} if compact else set()
    return {compact[i : i + 2] for i in range(len(compact) - 1)}


def lexical_score(question: str, trigger: str) -> float:
    """Jaccard overlap of character bigrams, 0.0 to 1.0."""
    left, right = _bigrams(question), _bigrams(trigger)
    if not left or not right:
        return 0.0
    return len(left & right) / len(left | right)


async def rank(
    question: str,
    vector_index: VectorIndex,
    entries: dict[str, Entry],
) -> list[tuple[Entry, float]]:
    """Entries by cosine similarity, best first. Raises OllamaUnavailable."""
    question_vector = await ollama.embed(question)

    best: dict[str, float] = {}
    for trigger in vector_index.triggers:
        score = cosine(question_vector, trigger.vector)
        if score > best.get(trigger.entry_id, -1.0):
            best[trigger.entry_id] = score

    return _sorted_pairs(best, entries)


def rank_lexically(question: str, entries: dict[str, Entry]) -> list[tuple[Entry, float]]:
    """Entries by bigram overlap, best first. Never raises."""
    best: dict[str, float] = {}
    for entry in entries.values():
        for trigger in [*entry.triggers_en, *entry.triggers_zh]:
            score = lexical_score(question, trigger)
            if score > best.get(entry.id, -1.0):
                best[entry.id] = score

    return _sorted_pairs(best, entries)


def _sorted_pairs(scores: dict[str, float], entries: dict[str, Entry]) -> list[tuple[Entry, float]]:
    pairs = [
        (entries[entry_id], score) for entry_id, score in scores.items() if entry_id in entries
    ]
    return sorted(pairs, key=lambda pair: pair[1], reverse=True)
