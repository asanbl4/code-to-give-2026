"""Load and validate the knowledge corpus.

Content errors are boot errors. A missing translation or an unsourced number
must stop the app, not reach a visitor -- so every failure in here raises
`CorpusError` with the offending entry id rather than being skipped.
"""

from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml
from pydantic import ValidationError

from app.features.chatbot.models import Entry
from app.features.chatbot.stats import UnknownStatError, load_stats, resolve_tokens

KNOWLEDGE_DIR = Path(__file__).resolve().parent / "knowledge"

_TEXT_FIELDS = ("answer_en", "answer_zh", "easy_read_en", "easy_read_zh")


class CorpusError(ValueError):
    """An entry the corpus will not accept. Always names the entry."""


def parse_entries(raw_entries: list[dict[str, Any]], source_name: str) -> list[Entry]:
    """Validate raw dicts into Entries, resolving stat tokens as we go."""
    stats = load_stats()
    entries: list[Entry] = []

    for raw in raw_entries:
        entry_id = raw.get("id", "<no id>")
        resolved = dict(raw)

        for field in _TEXT_FIELDS:
            value = resolved.get(field)
            if isinstance(value, str):
                try:
                    resolved[field] = resolve_tokens(value, stats).strip()
                except UnknownStatError as exc:
                    raise CorpusError(f"{source_name}: entry '{entry_id}': {exc}") from exc

        try:
            entries.append(Entry.model_validate(resolved))
        except ValidationError as exc:
            raise CorpusError(f"{source_name}: entry '{entry_id}' is invalid: {exc}") from exc

    return entries


@lru_cache(maxsize=1)
def load_corpus() -> list[Entry]:
    """Every entry across knowledge/*.yaml, validated. Cached."""
    entries: list[Entry] = []

    for path in sorted(KNOWLEDGE_DIR.glob("*.yaml")):
        raw = yaml.safe_load(path.read_text(encoding="utf-8")) or []
        if not isinstance(raw, list):
            raise CorpusError(f"{path.name}: expected a list of entries at the top level")
        entries.extend(parse_entries(raw, source_name=path.name))

    if not entries:
        raise CorpusError(f"No entries found in {KNOWLEDGE_DIR}")

    _check_ids_unique(entries)
    _check_followups_resolve(entries)
    return entries


def _check_ids_unique(entries: list[Entry]) -> None:
    seen: set[str] = set()
    for entry in entries:
        if entry.id in seen:
            raise CorpusError(f"Duplicate entry id '{entry.id}'")
        seen.add(entry.id)


def _check_followups_resolve(entries: list[Entry]) -> None:
    known = {entry.id for entry in entries}
    for entry in entries:
        for followup in entry.followups:
            if followup not in known:
                raise CorpusError(
                    f"Entry '{entry.id}' has followup '{followup}' that does not exist"
                )
