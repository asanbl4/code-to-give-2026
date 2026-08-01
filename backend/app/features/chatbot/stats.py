"""Numbers, and the single file they are allowed to come from.

Non-negotiable #8 forbids unverified statistics in shipped copy. Rather than
trusting every future author to remember that, corpus text carries
`{{ token }}` references and this module resolves them against
`content/impact-stats.yaml`. An unknown token raises, so an unsourced number
fails at load time instead of reaching a visitor.
"""

import re
from functools import lru_cache
from pathlib import Path

import yaml

# backend/app/features/chatbot/stats.py -> repo root
STATS_PATH = Path(__file__).resolve().parents[4] / "content" / "impact-stats.yaml"

_TOKEN = re.compile(r"\{\{\s*(\w+)\s*\}\}")


class UnknownStatError(ValueError):
    """A `{{ token }}` with no matching key in impact-stats.yaml."""


class MalformedStatsError(ValueError):
    """impact-stats.yaml is not shaped the way load_stats expects."""


def _fail(problem: str) -> None:
    raise MalformedStatsError(
        f"{STATS_PATH.name} is malformed: {problem}. Expected a top-level "
        "'stats:' list whose entries each have a 'key' and a 'value'. "
        f"File: {STATS_PATH}"
    )


@lru_cache(maxsize=1)
def load_stats() -> dict[str, str]:
    """Stat key -> display value. Cached; the file does not change at runtime.

    Every failure names the file and the offending entry. This is edited by
    hand between demos, so a typo has to read as "fix your YAML" rather than
    as a bare KeyError that looks like an application bug.
    """
    raw = yaml.safe_load(STATS_PATH.read_text(encoding="utf-8"))

    if raw is None:
        _fail("the file is empty")
    if not isinstance(raw, dict):
        _fail(f"the top level is {type(raw).__name__}, not a mapping")
    if "stats" not in raw:
        _fail("no top-level 'stats' key")
    if not isinstance(raw["stats"], list):
        _fail(f"'stats' is {type(raw['stats']).__name__}, not a list")

    resolved: dict[str, str] = {}
    for position, entry in enumerate(raw["stats"], start=1):
        if not isinstance(entry, dict):
            _fail(f"entry {position} is {type(entry).__name__}, not a mapping")
        if "key" not in entry:
            _fail(f"entry {position} has no 'key'")
        if "value" not in entry:
            _fail(f"entry {position} ('{entry['key']}') has no 'value'")
        resolved[entry["key"]] = str(entry["value"])

    return resolved


def resolve_tokens(text: str, stats: dict[str, str]) -> str:
    """Replace every `{{ key }}` in `text`, raising on any key we cannot source."""

    def substitute(match: re.Match[str]) -> str:
        key = match.group(1)
        if key not in stats:
            raise UnknownStatError(
                f"'{{{{ {key} }}}}' has no entry in content/impact-stats.yaml. "
                "Add it there with a source, or remove the number."
            )
        return stats[key]

    return _TOKEN.sub(substitute, text)
