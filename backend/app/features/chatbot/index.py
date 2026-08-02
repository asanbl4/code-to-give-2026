"""Precomputed trigger embeddings, and the check that they match the corpus.

Each *trigger phrase* is embedded separately rather than one vector per entry:
an entry's score is the best of its triggers, which matches far better than
averaging several differently-worded questions into one blurred vector.

The index is committed so the app starts instantly and works before Ollama is
running. `corpus_hash` is stored alongside, and a test asserts it still matches
-- editing a YAML without rebuilding fails CI rather than silently serving
stale answers on judging day.
"""

import hashlib
import json
from pathlib import Path

from pydantic import BaseModel

from app.config import get_settings
from app.features.chatbot import ollama
from app.features.chatbot.corpus import load_corpus
from app.features.chatbot.models import Entry

INDEX_PATH = Path(__file__).resolve().parent / "index.json"


class IndexedTrigger(BaseModel):
    entry_id: str
    text: str
    vector: list[float]


class VectorIndex(BaseModel):
    corpus_hash: str
    model: str
    triggers: list[IndexedTrigger]


def corpus_hash(entries: list[Entry]) -> str:
    """Fingerprint of everything that would change retrieval or output."""
    digest = hashlib.sha256()
    for entry in sorted(entries, key=lambda e: e.id):
        digest.update(entry.model_dump_json(exclude_none=False).encode("utf-8"))
    return digest.hexdigest()


def load_index() -> VectorIndex | None:
    """The stored index, or None if it has not been built yet."""
    if not INDEX_PATH.exists():
        return None
    return VectorIndex.model_validate_json(INDEX_PATH.read_text(encoding="utf-8"))


async def build_index() -> VectorIndex:
    """Embed every trigger in the corpus. Requires Ollama to be running."""
    entries = load_corpus()
    triggers: list[IndexedTrigger] = []

    for entry in entries:
        for text in [*entry.triggers_en, *entry.triggers_zh]:
            vector = await ollama.embed(text)
            triggers.append(IndexedTrigger(entry_id=entry.id, text=text, vector=vector))

    return VectorIndex(
        corpus_hash=corpus_hash(entries),
        model=get_settings().chatbot_embed_model,
        triggers=triggers,
    )


def write_index(vector_index: VectorIndex) -> None:
    INDEX_PATH.write_text(
        json.dumps(vector_index.model_dump(), ensure_ascii=False, indent=1),
        encoding="utf-8",
    )
