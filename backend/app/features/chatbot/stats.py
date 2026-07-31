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


@lru_cache(maxsize=1)
def load_stats() -> dict[str, str]:
    """Stat key -> display value. Cached; the file does not change at runtime."""
    raw = yaml.safe_load(STATS_PATH.read_text(encoding="utf-8"))
    return {entry["key"]: str(entry["value"]) for entry in raw["stats"]}


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
