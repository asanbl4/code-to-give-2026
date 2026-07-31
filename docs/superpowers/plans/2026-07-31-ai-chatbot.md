# AI Visitor Assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A locally-run assistant that answers visitor questions about Love 21 in English or Traditional Chinese, grounded in a curated corpus, and hands the user a labelled button to the right page.

**Architecture:** Retrieval over a hand-written bilingual YAML corpus, embedded with `bge-m3` via Ollama. A confidence router returns a staff-written answer verbatim on a strong match, lets `qwen3:4b` compose strictly from retrieved passages on a moderate match, and refuses on a weak one. Every layer degrades rather than failing: no Ollama means lexical matching, no corpus means the app refuses to boot.

**Tech Stack:** FastAPI, Pydantic, PyYAML, httpx, Ollama (`qwen3:4b`, `bge-m3`), Next.js 16 Client Components, Tailwind v4, pytest.

**Spec:** `docs/superpowers/specs/2026-07-31-ai-chatbot-design.md`

## Global Constraints

These come from `local/CONTEXT.md` §1 and apply to **every** task.

- **Never `os.getenv`.** All configuration goes through `get_settings()` in `app/config.py`.
- **Every user-facing string needs EN + 繁體中文.** No English-only string ships. No machine translation at request time.
- **No number appears as a literal in corpus text.** Numbers are `{{ token }}` references resolved from `content/impact-stats.yaml`.
- **No member names, photos, or quotes** anywhere in the corpus.
- **Donation copy frames person → programme → money.** Never "support <name>".
- **Every icon carries a text label.** No icon-only controls.
- **Honour `prefers-reduced-motion: reduce`** — no transitions under it.
- **Off-black on off-white.** Never `#000` on `#fff`.
- Ruff: line-length 100, `select = ["E", "F", "I", "UP"]`. `UP` means `datetime.UTC`, not `timezone.utc`.
- Python ≥3.12. Run `uv run ruff check . && uv run ruff format .` before every commit.
- Backend commands run from `backend/`. Frontend commands run from `frontend/`.

---

## File Structure

**Backend** (`backend/app/features/chatbot/`)

| File | Responsibility |
|---|---|
| `knowledge/*.yaml` | The corpus. Staff-editable content, no code. |
| `models.py` | Pydantic shapes: `Entry`, `ChatRequest`, `ChatResponse`, `Action`, `Source`, `Followup`. |
| `stats.py` | Load `content/impact-stats.yaml`; resolve `{{ token }}` in a string. |
| `corpus.py` | Load + validate YAML into `Entry` objects. Raises on any invalid entry. |
| `ollama.py` | The only module that knows Ollama exists. `embed()`, `generate()`. |
| `index.py` | Build/load `index.json`; corpus-hash staleness check. |
| `retrieval.py` | Rank entries for a question. Cosine when embeddings work, lexical when they don't. |
| `service.py` | Confidence routing. The only place thresholds are compared. |
| `router.py` | `POST /api/chat`. |
| `build_index.py` | CLI to regenerate `index.json`. |
| `README.md` | How to run it, how staff edit answers. |

**Frontend** (`frontend/features/chatbot/`)

| File | Responsibility |
|---|---|
| `types.ts` | Mirror of `models.py`. |
| `api.ts` | `postQuestion()` — browser-side fetch, returns a result object. |
| `components/ChatLauncher.tsx` | Text-labelled trigger button; owns open/closed state. |
| `components/ChatPanel.tsx` | The panel shell: focus, Escape, full-screen breakpoint. |
| `components/ChatTranscript.tsx` | Messages + the single `aria-live` region. |
| `components/SuggestedQuestions.tsx` | Opening questions and per-answer followups. |
| `README.md` | How to drop it in, what the accessibility contract is. |

**Repo root**

| File | Responsibility |
|---|---|
| `content/impact-stats.yaml` | Single source of truth for every number on the site (`CONTEXT.md` §4). |

---

## Task 1: Settings, impact-stats, and the stats loader

**Files:**
- Create: `content/impact-stats.yaml`
- Create: `backend/app/features/chatbot/__init__.py`
- Create: `backend/app/features/chatbot/stats.py`
- Modify: `backend/app/config.py`
- Modify: `backend/.env.example`
- Modify: `backend/pyproject.toml`
- Test: `backend/tests/test_chatbot_stats.py`

**Interfaces:**
- Consumes: `get_settings()` from `app/config.py`.
- Produces:
  - `load_stats() -> dict[str, str]` — stat key → display value, cached.
  - `resolve_tokens(text: str, stats: dict[str, str]) -> str` — replaces `{{ key }}`; raises `UnknownStatError` on an unknown key.
  - `class UnknownStatError(ValueError)`.
  - Settings fields: `chatbot_enabled`, `ollama_host`, `chatbot_model`, `chatbot_embed_model`, `chatbot_high_confidence`, `chatbot_low_confidence`, `chatbot_timeout_seconds`.

- [ ] **Step 1: Add the PyYAML dependency**

The corpus is edited by non-developers, and YAML handles multi-line bilingual text far better than JSON. That is the one-sentence justification the project requires for a new dependency.

Run from `backend/`:

```bash
uv add pyyaml
```

- [ ] **Step 2: Write `content/impact-stats.yaml`**

From the repo root. Values are the client's own deck figures per `CONTEXT.md` §4, tagged as unreconciled.

```yaml
# Single source of truth for every number shown on the site (CONTEXT.md §4).
# Four sources disagree; these are the client's deck figures, pending
# reconciliation with staff (CONTEXT.md §9 question 1).
#
# `key` is what {{ tokens }} in the chatbot corpus reference.
stats:
  - key: families_supported
    value: "680+"
    label_en: "families supported"
    label_zh: "個受支援家庭"
    source: love21-deck-2026
    as_of: "2026-07"
    confidence: client-provided, pending reconciliation

  - key: activities_per_month
    value: "900+"
    label_en: "activities every month"
    label_zh: "每月活動"
    source: love21-deck-2026
    as_of: "2026-07"
    confidence: client-provided, pending reconciliation

  - key: activity_types
    value: "90+"
    label_en: "types of activity"
    label_zh: "種活動類型"
    source: love21-deck-2026
    as_of: "2026-07"
    confidence: client-provided, pending reconciliation

  - key: volunteer_hours_per_month
    value: "500+"
    label_en: "volunteer hours a month"
    label_zh: "每月義工時數"
    source: love21-deck-2026
    as_of: "2026-07"
    confidence: client-provided, pending reconciliation

  - key: days_per_week
    value: "7"
    label_en: "days a week"
    label_zh: "每週開放日數"
    source: love21-deck-2026
    as_of: "2026-07"
    confidence: client-provided, pending reconciliation

  - key: hkd_per_class
    value: "500"
    label_en: "HK dollars funds one class"
    label_zh: "港幣資助一堂課"
    source: love21-fundraising-material
    as_of: "2026-07"
    confidence: client-provided

  - key: class_capacity
    value: "15"
    label_en: "members per class"
    label_zh: "每堂課成員人數"
    source: love21-fundraising-material
    as_of: "2026-07"
    confidence: client-provided
```

- [ ] **Step 3: Write the failing test**

Create `backend/tests/test_chatbot_stats.py`:

```python
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
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `uv run pytest tests/test_chatbot_stats.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.features.chatbot'`

- [ ] **Step 5: Create the package and implement `stats.py`**

Create `backend/app/features/chatbot/__init__.py` (empty file).

Create `backend/app/features/chatbot/stats.py`:

```python
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
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `uv run pytest tests/test_chatbot_stats.py -v`
Expected: PASS, 6 tests

- [ ] **Step 7: Add settings**

In `backend/app/config.py`, add these fields to `Settings` after the Instagram block:

```python
    # --- Chatbot feature ---------------------------------------------------
    # false hides the launcher and makes /api/chat return 503. The rest of the
    # site is unaffected -- the same "a fresh clone still runs" shape as the
    # blank Supabase variables above.
    chatbot_enabled: bool = True
    # 127.0.0.1 rather than localhost: Node and Python may resolve localhost to
    # ::1, which Ollama does not bind by default.
    ollama_host: str = "http://127.0.0.1:11434"
    chatbot_model: str = "qwen3:4b"
    chatbot_embed_model: str = "bge-m3"
    # Cosine score at or above which a curated answer is returned verbatim.
    chatbot_high_confidence: float = 0.75
    # Below this, we refuse rather than guess. Tune both against real scores --
    # see build_index.py --scores.
    chatbot_low_confidence: float = 0.45
    # A demo must never hang: abandon generation past this and fall back.
    chatbot_timeout_seconds: float = 20.0
```

- [ ] **Step 8: Add the same variables to `backend/.env.example`**

Append:

```
# --- Chatbot feature ---------------------------------------------------------
# false hides the launcher and makes /api/chat return 503, so a teammate who
# has not installed Ollama still gets a working site.
CHATBOT_ENABLED=true
# Use 127.0.0.1, not localhost -- see the note on NEXT_PUBLIC_API_URL.
OLLAMA_HOST=http://127.0.0.1:11434
CHATBOT_MODEL=qwen3:4b
CHATBOT_EMBED_MODEL=bge-m3
CHATBOT_HIGH_CONFIDENCE=0.75
CHATBOT_LOW_CONFIDENCE=0.45
CHATBOT_TIMEOUT_SECONDS=20
```

- [ ] **Step 9: Verify settings load**

Run: `uv run python -c "from app.config import get_settings; s = get_settings(); print(s.chatbot_model, s.chatbot_high_confidence, s.chatbot_enabled)"`
Expected: `qwen3:4b 0.75 True`

- [ ] **Step 10: Lint and commit**

```bash
uv run ruff check . && uv run ruff format .
uv run pytest
git add ../content/impact-stats.yaml app/features/chatbot/ app/config.py .env.example pyproject.toml uv.lock tests/test_chatbot_stats.py
git commit -m "feat(chatbot): impact-stats source of truth and stat-token resolution"
```

---

## Task 2: Corpus models, loader, and validation

**Files:**
- Create: `backend/app/features/chatbot/models.py`
- Create: `backend/app/features/chatbot/corpus.py`
- Create: `backend/app/features/chatbot/knowledge/about.yaml`
- Create: `backend/app/features/chatbot/knowledge/donating.yaml`
- Create: `backend/app/features/chatbot/knowledge/refusals.yaml`
- Test: `backend/tests/test_chatbot_corpus.py`

**Interfaces:**
- Consumes: `load_stats()`, `resolve_tokens()`, `UnknownStatError` from Task 1.
- Produces:
  - `class Entry(BaseModel)` with fields `id, tags, triggers_en, triggers_zh, answer_en, answer_zh, easy_read_en, easy_read_zh, action, followups, source, is_refusal`.
  - `class Action(BaseModel)`: `label_en, label_zh, href`.
  - `load_corpus() -> list[Entry]` — cached; raises `CorpusError` on any invalid entry.
  - `class CorpusError(ValueError)`.
  - `Entry.answer(locale, easy_read) -> str` and `Entry.triggers(locale) -> list[str]`.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_chatbot_corpus.py`:

```python
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `uv run pytest tests/test_chatbot_corpus.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.features.chatbot.corpus'`

- [ ] **Step 3: Write `models.py`**

Create `backend/app/features/chatbot/models.py`:

```python
"""Shapes for the chatbot feature.

`Entry` is the corpus record. Everything else is the API boundary -- keep it in
sync with `frontend/features/chatbot/types.ts`.
"""

from typing import Literal

from pydantic import BaseModel, Field

Locale = Literal["en", "zh-Hant"]
Route = Literal["curated", "generated", "refused", "fallback"]


class Action(BaseModel):
    """The 'take me there' button as the *corpus* stores it, in both locales.

    Navigation only -- never a submission.
    """

    label_en: str
    label_zh: str
    #: Site-relative, may carry pre-filled state: /donate?amount=500
    href: str

    def resolve(self, locale: Locale) -> "ResolvedAction":
        return ResolvedAction(
            label=self.label_en if locale == "en" else self.label_zh,
            href=self.href,
        )


class ResolvedAction(BaseModel):
    """The action as the *browser* receives it: one label, already chosen.

    The API boundary must not ship both locales -- the frontend would then have
    to re-implement the choice, and the two would drift.
    """

    label: str
    href: str


class Entry(BaseModel):
    """One curated question-and-answer, in both locales.

    Text fields arrive with `{{ stat }}` tokens already resolved -- see
    `corpus.parse_entries`.
    """

    id: str
    tags: list[str] = Field(default_factory=list)

    triggers_en: list[str]
    triggers_zh: list[str]

    answer_en: str
    answer_zh: str
    easy_read_en: str
    easy_read_zh: str

    action: Action | None = None
    #: Ids of other entries, offered as next questions.
    followups: list[str] = Field(default_factory=list)

    #: client-provided | staff-confirmed | annual-report-2023-24
    source: str
    #: True for medical/therapeutic/safeguarding handoffs. These short-circuit
    #: the model entirely -- see service.answer_question.
    is_refusal: bool = False

    def answer(self, locale: Locale, easy_read: bool) -> str:
        if easy_read:
            return self.easy_read_en if locale == "en" else self.easy_read_zh
        return self.answer_en if locale == "en" else self.answer_zh

    def triggers(self, locale: Locale) -> list[str]:
        return self.triggers_en if locale == "en" else self.triggers_zh


class Source(BaseModel):
    """Where an answer came from. Shown to the user and used in the demo."""

    entry_id: str
    label: str


class Followup(BaseModel):
    label: str
    question: str


class ChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=500)
    locale: Locale = "en"
    easy_read: bool = False


class ChatResponse(BaseModel):
    """`route` is deliberately exposed, the same honesty as Instagram's
    `source: live | fixture`. It drives the "answering from saved answers"
    note and makes the confidence routing demonstrable."""

    answer: str
    route: Route
    source: Source | None = None
    action: ResolvedAction | None = None
    followups: list[Followup] = Field(default_factory=list)
    locale: Locale
```

**Interfaces produced by this step (later tasks depend on these exact names):**
`Action.resolve(locale) -> ResolvedAction`, `ResolvedAction(label, href)`,
`ChatResponse.action: ResolvedAction | None`.

- [ ] **Step 4: Write `corpus.py`**

Create `backend/app/features/chatbot/corpus.py`:

```python
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
                raise CorpusError(f"Entry '{entry.id}' has followup '{followup}' that does not exist")
```

- [ ] **Step 5: Write the seed corpus files**

Create `backend/app/features/chatbot/knowledge/about.yaml`:

```yaml
# What Love 21 is and who it serves.
# Every answer needs EN + 繁體中文 + both Easy Read variants and a source.
# Numbers are {{ tokens }} from content/impact-stats.yaml -- never literals.

- id: about-what-is-love21
  tags: [about]
  triggers_en:
    - "what is Love 21"
    - "what does Love 21 do"
    - "tell me about this charity"
    - "who are you"
  triggers_zh:
    - "甚麼是愛21"
    - "愛21是做甚麼的"
    - "這個機構是做甚麼的"
  answer_en: >
    Love 21 is a Hong Kong charity for the Down syndrome, autistic and
    neurodiverse community. We run free sport, nutrition, family-support and
    enrichment programmes — {{ activity_types }} types of activity,
    {{ days_per_week }} days a week, supporting {{ families_supported }}
    families.
  answer_zh: >
    愛21是一間香港慈善機構，服務唐氏綜合症、自閉症及神經多樣性社群。我們提供免費
    的運動、營養、家庭支援及才能發展課程——共{{ activity_types }}種活動類型，
    每週{{ days_per_week }}天開放，支援{{ families_supported }}個家庭。
  easy_read_en: >
    Love 21 is a charity in Hong Kong.
    We run free classes for people with Down syndrome and autistic people.
    We do sport, food and fun activities.
  easy_read_zh: >
    愛21是香港的慈善機構。
    我們為唐氏綜合症人士和自閉症人士提供免費課程。
    我們有運動、飲食和有趣的活動。
  action:
    label_en: "See our programmes"
    label_zh: "查看我們的課程"
    href: "/programmes"
  followups: [about-who-can-join, volunteer-how-to-start]
  source: client-provided

- id: about-who-can-join
  tags: [about, joining]
  triggers_en:
    - "who can join"
    - "can my child join"
    - "am I eligible"
    - "is it only for Down syndrome"
  triggers_zh:
    - "誰可以參加"
    - "我的孩子可以參加嗎"
    - "是否只限唐氏綜合症人士"
  answer_en: >
    Our programmes are for people with Down syndrome, autistic people, and the
    wider neurodiverse community, along with their families. Everything is free
    to members. The best next step is to get in touch and tell us a little about
    who would be joining.
  answer_zh: >
    我們的課程服務唐氏綜合症人士、自閉症人士及更廣泛的神經多樣性社群，以及他們的
    家人。所有課程對成員均為免費。下一步最好是聯絡我們，簡單告訴我們參加者的情況。
  easy_read_en: >
    People with Down syndrome can join.
    Autistic people can join.
    Families can join too.
    It is free.
  easy_read_zh: >
    唐氏綜合症人士可以參加。
    自閉症人士可以參加。
    家人也可以參加。
    這是免費的。
  action:
    label_en: "Get in touch"
    label_zh: "聯絡我們"
    href: "/contact"
  followups: [about-what-is-love21]
  source: client-provided
```

Create `backend/app/features/chatbot/knowledge/donating.yaml`:

```yaml
# Donation answers. Non-negotiable #7: person -> programme -> money.
# Never frame a gift as supporting a named individual.

- id: donate-what-500-funds
  tags: [donating]
  triggers_en:
    - "where does my money go"
    - "what does my donation pay for"
    - "how much should I give"
    - "what will my donation do"
  triggers_zh:
    - "捐款用在哪裡"
    - "我的捐款如何運用"
    - "應該捐多少"
  answer_en: >
    HK${{ hkd_per_class }} funds one class for up to {{ class_capacity }}
    members — the coach, the space and the equipment. Every Love 21 programme is
    free to members, so your gift goes to the programme rather than to any one
    person.
  answer_zh: >
    港幣{{ hkd_per_class }}元可資助一堂課，最多{{ class_capacity }}位成員參與——
    包括教練、場地和器材。愛21所有課程對成員均為免費，因此你的捐款支持的是整個
    課程，而非任何個別人士。
  easy_read_en: >
    HK${{ hkd_per_class }} pays for one class.
    Up to {{ class_capacity }} people can join that class.
    Classes are free for our members.
  easy_read_zh: >
    港幣{{ hkd_per_class }}元可以支付一堂課。
    最多{{ class_capacity }}人可以參加。
    課程對我們的成員是免費的。
  action:
    label_en: "See what your gift funds"
    label_zh: "看看你的捐款可以做甚麼"
    href: "/donate?amount=500&frequency=monthly"
  followups: [donate-monthly-or-one-off]
  source: client-provided

- id: donate-monthly-or-one-off
  tags: [donating]
  triggers_en:
    - "monthly or one off"
    - "can I give every month"
    - "regular giving"
  triggers_zh:
    - "每月捐款還是單次捐款"
    - "可以每月捐款嗎"
    - "定期捐款"
  answer_en: >
    Both work. A monthly gift helps most, because programmes run every week and
    steady income lets staff plan a term ahead rather than month to month. You
    can change or stop a monthly gift whenever you like.
  answer_zh: >
    兩者都可以。每月捐款的幫助最大，因為課程每週進行，穩定的收入讓職員能夠提前規劃
    整個學期，而不只是逐月安排。你可以隨時更改或停止每月捐款。
  easy_read_en: >
    You can give money one time.
    You can also give a small amount every month.
    Giving every month helps us plan.
    You can stop any time.
  easy_read_zh: >
    你可以捐款一次。
    你也可以每月捐少少。
    每月捐款幫助我們計劃。
    你可以隨時停止。
  action:
    label_en: "Go to monthly giving"
    label_zh: "前往每月捐款"
    href: "/donate?frequency=monthly"
  followups: [donate-what-500-funds]
  source: client-provided
```

Create `backend/app/features/chatbot/knowledge/refusals.yaml`:

```yaml
# Handoffs, not answers.
#
# These are ordinary corpus entries, so they retrieve at high confidence and
# short-circuit the model entirely (service.answer_question checks is_refusal
# before any generation). Retrieval as the safety filter is stronger than
# asking a 4B model to police itself.

- id: refuse-medical-advice
  tags: [refusal]
  is_refusal: true
  triggers_en:
    - "is my child autistic"
    - "what therapy should we try"
    - "should my child take medication"
    - "how do I get a diagnosis"
    - "what treatment do you recommend"
  triggers_zh:
    - "我的孩子是否自閉症"
    - "應該接受甚麼治療"
    - "應該吃藥嗎"
    - "如何取得診斷"
  answer_en: >
    That is not something I can help with — questions about diagnosis, therapy
    or treatment need a person who knows your situation. Our team talks with
    families about this often and can point you in the right direction.
  answer_zh: >
    這方面我幫不上忙——有關診斷、治療或療程的問題，需要由了解你情況的專業人士解答。
    我們的團隊經常與家庭討論這些事情，可以為你指引方向。
  easy_read_en: >
    I cannot answer questions about health or therapy.
    A person from our team can help you.
    Please contact us.
  easy_read_zh: >
    我不能回答健康或治療的問題。
    我們團隊的同事可以幫你。
    請聯絡我們。
  action:
    label_en: "Contact our team"
    label_zh: "聯絡我們的團隊"
    href: "/contact"
  source: staff-confirmed

- id: refuse-distress
  tags: [refusal, safeguarding]
  is_refusal: true
  triggers_en:
    - "I want to hurt myself"
    - "I am in crisis"
    - "I feel unsafe"
    - "someone is being hurt"
  triggers_zh:
    - "我想傷害自己"
    - "我很危險"
    - "我感到不安全"
    - "有人受到傷害"
  answer_en: >
    I am not the right help for this, and I do not want to leave you with a
    chatbot. Please speak to a person now. In Hong Kong you can call 999 in an
    emergency, or reach our team directly on the contact page.
  answer_zh: >
    這件事我幫不了你，我也不想讓你只面對一個聊天機械人。請立即與真人聯絡。在香港，
    緊急情況可致電999，或透過聯絡頁面直接聯繫我們的團隊。
  easy_read_en: >
    I cannot help with this.
    Please talk to a person now.
    In an emergency call 999.
  easy_read_zh: >
    這件事我幫不到你。
    請立即與人傾談。
    緊急時請致電999。
  action:
    label_en: "Contact a person"
    label_zh: "聯絡真人"
    href: "/contact"
  source: staff-confirmed
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `uv run pytest tests/test_chatbot_corpus.py -v`
Expected: PASS, 11 tests

- [ ] **Step 7: Verify the corpus fails loudly on a bad entry**

Temporarily add `{{ not_a_stat }}` to `about.yaml`'s first `answer_en`, then run:

Run: `uv run python -c "from app.features.chatbot.corpus import load_corpus; load_corpus()"`
Expected: `CorpusError: about.yaml: entry 'about-what-is-love21': '{{ not_a_stat }}' has no entry in content/impact-stats.yaml...`

Revert the change and re-run to confirm it loads cleanly.

- [ ] **Step 8: Lint and commit**

```bash
uv run ruff check . && uv run ruff format .
uv run pytest
git add app/features/chatbot/ tests/test_chatbot_corpus.py
git commit -m "feat(chatbot): corpus models, validation, and seed entries"
```

---

## Task 3: The Ollama client

**Files:**
- Create: `backend/app/features/chatbot/ollama.py`
- Test: `backend/tests/test_chatbot_ollama.py`

**Interfaces:**
- Consumes: `get_settings()`.
- Produces:
  - `async embed(text: str) -> list[float]`
  - `async generate(system: str, user: str) -> str`
  - `class OllamaUnavailable(RuntimeError)` — raised for transport failures, bad status, and timeouts.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_chatbot_ollama.py`:

```python
"""The only module that talks to Ollama, tested without Ollama.

httpx.MockTransport lets us assert on the exact request body -- which matters
for `think: false`, without which qwen3 adds 10-20s of reasoning to every answer.
"""

import httpx
import pytest

from app.features.chatbot import ollama


def _client_factory(handler):
    def factory(**kwargs):
        kwargs.pop("transport", None)
        return httpx.AsyncClient(transport=httpx.MockTransport(handler), **kwargs)

    return factory


@pytest.mark.anyio
async def test_embed_returns_the_vector(monkeypatch) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"embeddings": [[0.1, 0.2, 0.3]]})

    monkeypatch.setattr(ollama.httpx, "AsyncClient", _client_factory(handler))

    assert await ollama.embed("hello") == [0.1, 0.2, 0.3]


@pytest.mark.anyio
async def test_embed_posts_to_the_embed_endpoint(monkeypatch) -> None:
    seen: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["url"] = str(request.url)
        return httpx.Response(200, json={"embeddings": [[0.1]]})

    monkeypatch.setattr(ollama.httpx, "AsyncClient", _client_factory(handler))
    await ollama.embed("hello")

    assert seen["url"].endswith("/api/embed")


@pytest.mark.anyio
async def test_generate_disables_thinking(monkeypatch) -> None:
    """qwen3 is a hybrid reasoning model; leaving thinking on ruins latency."""
    seen: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["body"] = request.read().decode()
        return httpx.Response(200, json={"message": {"content": "an answer"}})

    monkeypatch.setattr(ollama.httpx, "AsyncClient", _client_factory(handler))
    result = await ollama.generate("be helpful", "what is this")

    assert '"think": false' in seen["body"] or '"think":false' in seen["body"]
    assert result == "an answer"


@pytest.mark.anyio
async def test_connection_failure_raises_ollama_unavailable(monkeypatch) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connection refused")

    monkeypatch.setattr(ollama.httpx, "AsyncClient", _client_factory(handler))

    with pytest.raises(ollama.OllamaUnavailable):
        await ollama.embed("hello")


@pytest.mark.anyio
async def test_error_status_raises_ollama_unavailable(monkeypatch) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(404, json={"error": "model not found"})

    monkeypatch.setattr(ollama.httpx, "AsyncClient", _client_factory(handler))

    with pytest.raises(ollama.OllamaUnavailable):
        await ollama.generate("s", "u")


@pytest.mark.anyio
async def test_timeout_raises_ollama_unavailable(monkeypatch) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("too slow")

    monkeypatch.setattr(ollama.httpx, "AsyncClient", _client_factory(handler))

    with pytest.raises(ollama.OllamaUnavailable):
        await ollama.generate("s", "u")
```

- [ ] **Step 2: Add the anyio pytest plugin and fixture**

Run from `backend/`:

```bash
uv add --dev anyio
```

Append to `backend/tests/conftest.py`:

```python
@pytest.fixture
def anyio_backend() -> str:
    """Async tests run on asyncio only; we have no trio dependency."""
    return "asyncio"
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `uv run pytest tests/test_chatbot_ollama.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.features.chatbot.ollama'`

- [ ] **Step 4: Implement `ollama.py`**

Create `backend/app/features/chatbot/ollama.py`:

```python
"""The only module in the app that knows Ollama exists.

Same discipline as `app/db.py` being the only place a Supabase client is built:
swapping to llama.cpp or a hosted model touches this file and no other.

Everything runs on the machine serving the site. No question, and no part of
the corpus, leaves the box.
"""

import logging

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()


class OllamaUnavailable(RuntimeError):
    """Ollama could not be reached, refused, or took too long.

    Callers treat this as "degrade", never as "fail" -- see service.py.
    """


async def embed(text: str) -> list[float]:
    """Embed one string. Raises OllamaUnavailable on any failure."""
    payload = {"model": settings.chatbot_embed_model, "input": text}

    data = await _post("/api/embed", payload, timeout=30.0)
    try:
        return data["embeddings"][0]
    except (KeyError, IndexError) as exc:
        raise OllamaUnavailable(f"Unexpected embed response shape: {data}") from exc


async def generate(system: str, user: str) -> str:
    """One non-streaming completion.

    `think: false` matters: qwen3 is a hybrid reasoning model and will otherwise
    spend 10-20s reasoning before every answer. If a future model ignores the
    flag, add "/no_think" to the system prompt as well.
    """
    payload = {
        "model": settings.chatbot_model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "stream": False,
        "think": False,
        "options": {"temperature": 0.2},
    }

    data = await _post("/api/chat", payload, timeout=settings.chatbot_timeout_seconds)
    try:
        return data["message"]["content"].strip()
    except (KeyError, AttributeError) as exc:
        raise OllamaUnavailable(f"Unexpected chat response shape: {data}") from exc


async def _post(path: str, payload: dict, timeout: float) -> dict:
    url = f"{settings.ollama_host.rstrip('/')}{path}"
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as exc:
        logger.warning("Ollama call to %s failed: %s", path, exc)
        raise OllamaUnavailable(str(exc)) from exc
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `uv run pytest tests/test_chatbot_ollama.py -v`
Expected: PASS, 6 tests

- [ ] **Step 6: Lint and commit**

```bash
uv run ruff check . && uv run ruff format .
uv run pytest
git add app/features/chatbot/ollama.py tests/test_chatbot_ollama.py tests/conftest.py pyproject.toml uv.lock
git commit -m "feat(chatbot): Ollama client with degrade-not-fail error handling"
```

---

## Task 4: Index build and staleness detection

**Files:**
- Create: `backend/app/features/chatbot/index.py`
- Create: `backend/app/features/chatbot/build_index.py`
- Create: `backend/app/features/chatbot/index.json` (generated)
- Test: `backend/tests/test_chatbot_index.py`

**Interfaces:**
- Consumes: `load_corpus()`, `Entry`, `ollama.embed()`.
- Produces:
  - `corpus_hash(entries: list[Entry]) -> str`
  - `class IndexedTrigger(BaseModel)`: `entry_id, text, vector`.
  - `class VectorIndex(BaseModel)`: `corpus_hash, model, triggers`.
  - `load_index() -> VectorIndex | None` — `None` when the file is absent.
  - `async build_index() -> VectorIndex`
  - `INDEX_PATH: Path`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_chatbot_index.py`:

```python
"""The index, and the staleness check that stops a stale one reaching a demo."""

import pytest

from app.features.chatbot import index
from app.features.chatbot.corpus import load_corpus


def test_corpus_hash_is_stable() -> None:
    entries = load_corpus()

    assert index.corpus_hash(entries) == index.corpus_hash(entries)


def test_corpus_hash_changes_when_text_changes() -> None:
    entries = load_corpus()
    before = index.corpus_hash(entries)

    mutated = [e.model_copy(update={"answer_en": e.answer_en + " extra"}) for e in entries]

    assert index.corpus_hash(mutated) != before


def test_index_file_exists() -> None:
    """A missing index means someone forgot `uv run python -m
    app.features.chatbot.build_index`."""
    assert index.INDEX_PATH.exists(), "Run: uv run python -m app.features.chatbot.build_index"


def test_index_is_not_stale() -> None:
    """Edit a knowledge YAML without rebuilding and this fails, rather than the
    bot silently answering from an old index during the demo."""
    stored = index.load_index()

    assert stored is not None
    assert stored.corpus_hash == index.corpus_hash(load_corpus()), (
        "index.json is out of date. Run: uv run python -m app.features.chatbot.build_index"
    )


def test_every_trigger_is_indexed() -> None:
    stored = index.load_index()
    entries = load_corpus()

    expected = sum(len(e.triggers_en) + len(e.triggers_zh) for e in entries)

    assert len(stored.triggers) == expected


@pytest.mark.anyio
async def test_build_index_embeds_every_trigger(monkeypatch) -> None:
    calls: list[str] = []

    async def fake_embed(text: str) -> list[float]:
        calls.append(text)
        return [0.5, 0.5]

    monkeypatch.setattr(index.ollama, "embed", fake_embed)

    built = await index.build_index()
    entries = load_corpus()
    expected = sum(len(e.triggers_en) + len(e.triggers_zh) for e in entries)

    assert len(calls) == expected
    assert len(built.triggers) == expected
    assert built.corpus_hash == index.corpus_hash(entries)
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `uv run pytest tests/test_chatbot_index.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.features.chatbot.index'`

- [ ] **Step 3: Implement `index.py`**

Create `backend/app/features/chatbot/index.py`:

```python
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
```

- [ ] **Step 4: Implement `build_index.py`**

Create `backend/app/features/chatbot/build_index.py`:

```python
"""Rebuild index.json. Run after editing anything under knowledge/.

    uv run python -m app.features.chatbot.build_index
    uv run python -m app.features.chatbot.build_index --scores

`--scores` prints the similarity of a handful of probe questions against every
entry. Use it to set CHATBOT_HIGH_CONFIDENCE and CHATBOT_LOW_CONFIDENCE from
real numbers instead of guessing -- bge-m3 scores run high, and the defaults are
a starting point, not a measurement.
"""

import asyncio
import sys

from app.features.chatbot import index, retrieval
from app.features.chatbot.corpus import load_corpus

_PROBES = [
    ("en", "what does love 21 actually do?"),
    ("en", "how much money should I donate"),
    ("en", "can I bring my company team to help"),
    ("en", "what is the weather in Tokyo"),
    ("zh-Hant", "愛21是甚麼機構"),
    ("zh-Hant", "我可以怎樣捐款"),
]


async def main() -> None:
    print("Embedding triggers (needs Ollama running)...")
    built = await index.build_index()
    index.write_index(built)
    print(f"Wrote {index.INDEX_PATH} — {len(built.triggers)} triggers, model {built.model}")

    if "--scores" in sys.argv:
        print("\nProbe scores (tune thresholds from these):\n")
        entries = {entry.id: entry for entry in load_corpus()}
        for locale, question in _PROBES:
            ranked = await retrieval.rank(question, built, entries)
            top = ranked[:3]
            print(f"  [{locale}] {question!r}")
            for entry, score in top:
                print(f"      {score:.3f}  {entry.id}")
            print()


if __name__ == "__main__":
    asyncio.run(main())
```

- [ ] **Step 5: Pull the models and build the index**

`build_index` needs Ollama. Install it from <https://ollama.com/download>, then:

```bash
ollama pull qwen3:4b
ollama pull bge-m3
ollama list
```

Expected: both models listed. Then from `backend/`:

```bash
uv run python -m app.features.chatbot.build_index
```

Expected: `Wrote .../index.json — 44 triggers, model bge-m3`

(44 is the trigger count of the seed corpus from Task 2: 7 + 7 + 7 + 6 + 9 + 8.
If yours differs, you changed the corpus — that is fine, the test in Step 6
derives the number rather than hardcoding it.)

Note: this step depends on `retrieval.rank` only for `--scores`, which Task 5 adds. Run without `--scores` here; run with it at the end of Task 5.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `uv run pytest tests/test_chatbot_index.py -v`
Expected: PASS, 6 tests

- [ ] **Step 7: Commit**

```bash
uv run ruff check . && uv run ruff format .
git add app/features/chatbot/index.py app/features/chatbot/build_index.py app/features/chatbot/index.json tests/test_chatbot_index.py
git commit -m "feat(chatbot): committed trigger index with staleness detection"
```

---

## Task 5: Retrieval — cosine, with a lexical fallback

**Files:**
- Create: `backend/app/features/chatbot/retrieval.py`
- Test: `backend/tests/test_chatbot_retrieval.py`

**Interfaces:**
- Consumes: `VectorIndex`, `IndexedTrigger`, `Entry`, `ollama.embed`, `OllamaUnavailable`.
- Produces:
  - `cosine(a: list[float], b: list[float]) -> float`
  - `lexical_score(question: str, trigger: str) -> float`
  - `async rank(question, vector_index, entries) -> list[tuple[Entry, float]]` — descending; raises `OllamaUnavailable` if embedding fails.
  - `rank_lexically(question, entries) -> list[tuple[Entry, float]]`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_chatbot_retrieval.py`:

```python
"""Ranking, and the lexical path that keeps the bot answering without Ollama."""

import pytest

from app.features.chatbot import retrieval
from app.features.chatbot.corpus import load_corpus
from app.features.chatbot.index import IndexedTrigger, VectorIndex


def test_cosine_of_identical_vectors_is_one() -> None:
    assert retrieval.cosine([1.0, 0.0], [1.0, 0.0]) == pytest.approx(1.0)


def test_cosine_of_orthogonal_vectors_is_zero() -> None:
    assert retrieval.cosine([1.0, 0.0], [0.0, 1.0]) == pytest.approx(0.0)


def test_cosine_ignores_magnitude() -> None:
    assert retrieval.cosine([2.0, 0.0], [9.0, 0.0]) == pytest.approx(1.0)


def test_cosine_of_zero_vector_is_zero_not_an_error() -> None:
    assert retrieval.cosine([0.0, 0.0], [1.0, 1.0]) == 0.0


def test_lexical_score_is_one_for_an_exact_match() -> None:
    assert retrieval.lexical_score("what is Love 21", "what is Love 21") == pytest.approx(1.0)


def test_lexical_score_ignores_case_and_punctuation() -> None:
    assert retrieval.lexical_score("What is Love 21?", "what is love 21") > 0.9


def test_lexical_score_is_low_for_unrelated_text() -> None:
    assert retrieval.lexical_score("weather in Tokyo", "how do I donate") < 0.3


def test_lexical_score_works_on_chinese() -> None:
    """Whitespace tokenising fails on Chinese; character bigrams do not."""
    assert retrieval.lexical_score("甚麼是愛21", "甚麼是愛21") == pytest.approx(1.0)
    assert retrieval.lexical_score("甚麼是愛21", "我可以怎樣捐款") < 0.3


@pytest.mark.anyio
async def test_rank_puts_the_best_entry_first(monkeypatch) -> None:
    entries = {entry.id: entry for entry in load_corpus()}
    target = "donate-what-500-funds"

    vector_index = VectorIndex(
        corpus_hash="x",
        model="test",
        triggers=[
            IndexedTrigger(entry_id="about-what-is-love21", text="a", vector=[0.0, 1.0]),
            IndexedTrigger(entry_id=target, text="b", vector=[1.0, 0.0]),
        ],
    )

    async def fake_embed(text: str) -> list[float]:
        return [1.0, 0.0]

    monkeypatch.setattr(retrieval.ollama, "embed", fake_embed)

    ranked = await retrieval.rank("where does my money go", vector_index, entries)

    assert ranked[0][0].id == target
    assert ranked[0][1] == pytest.approx(1.0)


@pytest.mark.anyio
async def test_rank_takes_the_best_trigger_per_entry(monkeypatch) -> None:
    """An entry with five triggers must not be penalised for the four that miss."""
    entries = {entry.id: entry for entry in load_corpus()}
    target = "donate-what-500-funds"

    vector_index = VectorIndex(
        corpus_hash="x",
        model="test",
        triggers=[
            IndexedTrigger(entry_id=target, text="miss", vector=[0.0, 1.0]),
            IndexedTrigger(entry_id=target, text="hit", vector=[1.0, 0.0]),
        ],
    )

    async def fake_embed(text: str) -> list[float]:
        return [1.0, 0.0]

    monkeypatch.setattr(retrieval.ollama, "embed", fake_embed)
    ranked = await retrieval.rank("q", vector_index, entries)

    assert ranked[0][1] == pytest.approx(1.0)


def test_rank_lexically_matches_a_suggested_question_exactly() -> None:
    """The suggested-question buttons must keep working with no model running."""
    entries = {entry.id: entry for entry in load_corpus()}
    entry = entries["about-what-is-love21"]

    ranked = retrieval.rank_lexically(entry.triggers_en[0], entries)

    assert ranked[0][0].id == "about-what-is-love21"
    assert ranked[0][1] == pytest.approx(1.0)
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `uv run pytest tests/test_chatbot_retrieval.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.features.chatbot.retrieval'`

- [ ] **Step 3: Implement `retrieval.py`**

Create `backend/app/features/chatbot/retrieval.py`:

```python
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


def _sorted_pairs(
    scores: dict[str, float], entries: dict[str, Entry]
) -> list[tuple[Entry, float]]:
    pairs = [(entries[entry_id], score) for entry_id, score in scores.items() if entry_id in entries]
    return sorted(pairs, key=lambda pair: pair[1], reverse=True)
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `uv run pytest tests/test_chatbot_retrieval.py -v`
Expected: PASS, 11 tests

- [ ] **Step 5: Calibrate the thresholds against real scores**

With Ollama running:

Run: `uv run python -m app.features.chatbot.build_index --scores`

Read the output. The off-topic probe ("what is the weather in Tokyo") should score clearly below every on-topic probe. If the gap between on-topic and off-topic is not comfortably either side of the defaults, update `CHATBOT_HIGH_CONFIDENCE` and `CHATBOT_LOW_CONFIDENCE` in `backend/.env` **and** the defaults in `config.py`, and note the observed numbers in the commit message.

- [ ] **Step 6: Commit**

```bash
uv run ruff check . && uv run ruff format .
uv run pytest
git add app/features/chatbot/retrieval.py tests/test_chatbot_retrieval.py app/config.py
git commit -m "feat(chatbot): cosine ranking with a language-agnostic lexical fallback"
```

---

## Task 6: The confidence router

**Files:**
- Create: `backend/app/features/chatbot/service.py`
- Test: `backend/tests/test_chatbot_service.py`

**Interfaces:**
- Consumes: everything from Tasks 1–5.
- Produces:
  - `async answer_question(request: ChatRequest) -> ChatResponse`
  - `SYSTEM_PROMPT_EN`, `SYSTEM_PROMPT_ZH`
  - `build_followups(entry, entries, locale) -> list[Followup]`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_chatbot_service.py`:

```python
"""Confidence routing -- the heart of the feature.

The load-bearing assertions are the negative ones: a refusal must never reach
the model, and a dead Ollama must never produce a 500.
"""

import pytest

from app.features.chatbot import service
from app.features.chatbot.models import ChatRequest
from app.features.chatbot.ollama import OllamaUnavailable


class FakeOllama:
    """Records calls so tests can assert the model was NOT used."""

    def __init__(self, vector: list[float] | None = None, text: str = "generated answer") -> None:
        self.vector = vector or [1.0, 0.0]
        self.text = text
        self.embed_calls: list[str] = []
        self.generate_calls: list[tuple[str, str]] = []

    async def embed(self, text: str) -> list[float]:
        self.embed_calls.append(text)
        return self.vector

    async def generate(self, system: str, user: str) -> str:
        self.generate_calls.append((system, user))
        return self.text


@pytest.fixture
def fake_ollama(monkeypatch) -> FakeOllama:
    fake = FakeOllama()
    monkeypatch.setattr(service.ollama, "embed", fake.embed)
    monkeypatch.setattr(service.ollama, "generate", fake.generate)
    monkeypatch.setattr(service.retrieval.ollama, "embed", fake.embed)
    return fake


def _force_score(monkeypatch, entry_id: str, score: float) -> None:
    """Pin retrieval so each confidence band can be tested in isolation."""
    from app.features.chatbot.corpus import load_corpus

    entry = next(e for e in load_corpus() if e.id == entry_id)

    async def fake_rank(question, vector_index, entries):
        return [(entry, score)]

    monkeypatch.setattr(service.retrieval, "rank", fake_rank)


@pytest.mark.anyio
async def test_high_confidence_returns_the_curated_answer_verbatim(
    monkeypatch, fake_ollama
) -> None:
    _force_score(monkeypatch, "donate-what-500-funds", 0.92)

    response = await service.answer_question(ChatRequest(question="where does my money go"))

    assert response.route == "curated"
    assert "HK$500" in response.answer
    assert fake_ollama.generate_calls == [], "a high-confidence match must not call the model"


@pytest.mark.anyio
async def test_mid_confidence_generates_from_retrieved_passages(monkeypatch, fake_ollama) -> None:
    _force_score(monkeypatch, "donate-what-500-funds", 0.60)

    response = await service.answer_question(ChatRequest(question="tell me about giving"))

    assert response.route == "generated"
    assert response.answer == "generated answer"
    assert len(fake_ollama.generate_calls) == 1

    _system, user = fake_ollama.generate_calls[0]
    assert "HK$500" in user, "retrieved passages must be in the prompt"


@pytest.mark.anyio
async def test_low_confidence_refuses_without_calling_the_model(monkeypatch, fake_ollama) -> None:
    _force_score(monkeypatch, "donate-what-500-funds", 0.10)

    response = await service.answer_question(ChatRequest(question="what is the capital of Peru"))

    assert response.route == "refused"
    assert fake_ollama.generate_calls == []
    assert response.action is not None, "a refusal must offer a human"


@pytest.mark.anyio
async def test_refusal_entry_never_reaches_the_model(monkeypatch, fake_ollama) -> None:
    """The safety property. Scored mid-band on purpose: is_refusal must win."""
    _force_score(monkeypatch, "refuse-medical-advice", 0.60)

    response = await service.answer_question(ChatRequest(question="is my child autistic"))

    assert response.route == "refused"
    assert fake_ollama.generate_calls == []
    assert "cannot" in response.answer.lower() or "not" in response.answer.lower()


@pytest.mark.anyio
async def test_ollama_down_falls_back_lexically(monkeypatch) -> None:
    async def dead_embed(text: str) -> list[float]:
        raise OllamaUnavailable("connection refused")

    monkeypatch.setattr(service.retrieval.ollama, "embed", dead_embed)

    response = await service.answer_question(ChatRequest(question="what is Love 21"))

    assert response.route == "fallback"
    assert response.answer, "the fallback must still answer"


@pytest.mark.anyio
async def test_generation_failure_falls_back_to_the_curated_answer(monkeypatch) -> None:
    """A model that dies mid-answer must not take the page with it."""
    _force_score(monkeypatch, "donate-what-500-funds", 0.60)

    async def ok_embed(text: str) -> list[float]:
        return [1.0, 0.0]

    async def dead_generate(system: str, user: str) -> str:
        raise OllamaUnavailable("timed out")

    monkeypatch.setattr(service.retrieval.ollama, "embed", ok_embed)
    monkeypatch.setattr(service.ollama, "generate", dead_generate)

    response = await service.answer_question(ChatRequest(question="tell me about giving"))

    assert response.route == "fallback"
    assert "HK$500" in response.answer


@pytest.mark.anyio
async def test_response_carries_locale_and_action(monkeypatch, fake_ollama) -> None:
    _force_score(monkeypatch, "donate-what-500-funds", 0.92)

    response = await service.answer_question(
        ChatRequest(question="捐款用在哪裡", locale="zh-Hant")
    )

    assert response.locale == "zh-Hant"
    assert response.action is not None
    assert response.action.href.startswith("/donate")
    assert "港幣" in response.answer


@pytest.mark.anyio
async def test_easy_read_returns_the_easy_read_text(monkeypatch, fake_ollama) -> None:
    _force_score(monkeypatch, "donate-what-500-funds", 0.92)

    response = await service.answer_question(
        ChatRequest(question="where does my money go", easy_read=True)
    )

    assert response.answer.startswith("HK$500 pays for one class.")


@pytest.mark.anyio
async def test_followups_resolve_to_labels(monkeypatch, fake_ollama) -> None:
    _force_score(monkeypatch, "donate-what-500-funds", 0.92)

    response = await service.answer_question(ChatRequest(question="where does my money go"))

    assert response.followups
    assert all(f.label and f.question for f in response.followups)
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `uv run pytest tests/test_chatbot_service.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.features.chatbot.service'`

- [ ] **Step 3: Implement `service.py`**

Create `backend/app/features/chatbot/service.py`:

```python
"""Confidence routing: the one place a score is compared to a threshold.

    score >= high  -> the curated answer, verbatim, no model call
    low <= s < high -> the model composes, strictly from retrieved passages
    score < low    -> refuse, and offer a person

Two properties are load-bearing and are asserted in the tests:

* a `is_refusal` entry short-circuits before any generation, so medical and
  safeguarding questions can never be answered by a 4B model;
* every failure path degrades to a written answer. This function does not
  raise, so the endpoint cannot 500.
"""

import logging

from app.config import get_settings
from app.features.chatbot import index, ollama, retrieval
from app.features.chatbot.corpus import load_corpus
from app.features.chatbot.models import (
    Action,
    ChatRequest,
    ChatResponse,
    Entry,
    Followup,
    Locale,
    ResolvedAction,
    Source,
)
from app.features.chatbot.ollama import OllamaUnavailable

logger = logging.getLogger(__name__)

settings = get_settings()

SYSTEM_PROMPT_EN = """You are the help assistant for Love 21 Foundation, a Hong Kong charity \
for the Down syndrome, autistic and neurodiverse community.

Rules you must follow:
- Answer ONLY using the reference passages given. If they do not contain the answer, say you \
do not know and suggest contacting the team.
- Never invent statistics, dates, prices or names. If a number is not in the passages, do not \
give a number.
- Never suggest donating to a named individual. Donations support programmes.
- Never give medical, diagnostic or therapeutic advice.
- Write plainly and warmly, in short sentences. Two or three sentences is usually enough.
- Lead with what people can do. Never use pity framing.
- Reply in English."""

SYSTEM_PROMPT_ZH = SYSTEM_PROMPT_EN.replace(
    "- Reply in English.",
    "- Reply in Traditional Chinese (繁體中文), never Simplified.",
)

_REFUSAL_FALLBACK_EN = (
    "I'm not sure about that one. Our team can help — please get in touch and "
    "someone will come back to you."
)
_REFUSAL_FALLBACK_ZH = "這個問題我不太確定。我們的團隊可以幫忙——請聯絡我們，同事會回覆你。"

_CONTACT_ACTION = Action(
    label_en="Contact our team",
    label_zh="聯絡我們的團隊",
    href="/contact",
)


async def answer_question(request: ChatRequest) -> ChatResponse:
    """Route one question. Never raises."""
    entries = {entry.id: entry for entry in load_corpus()}
    vector_index = index.load_index()

    ranked, degraded = await _rank(request.question, vector_index, entries)

    if not ranked:
        return _refusal(request.locale, route="refused")

    entry, score = ranked[0]

    # Refusals win over every threshold: a medical question that happens to
    # score mid-band must still never reach the model.
    if entry.is_refusal:
        return _from_entry(entry, request, entries, route="refused")

    if degraded:
        if score < settings.chatbot_low_confidence:
            return _refusal(request.locale, route="fallback")
        return _from_entry(entry, request, entries, route="fallback")

    if score >= settings.chatbot_high_confidence:
        return _from_entry(entry, request, entries, route="curated")

    if score < settings.chatbot_low_confidence:
        return _refusal(request.locale, route="refused")

    return await _generate(entry, ranked, request, entries)


async def _rank(
    question: str,
    vector_index: index.VectorIndex | None,
    entries: dict[str, Entry],
) -> tuple[list[tuple[Entry, float]], bool]:
    """(ranked entries, degraded). Degraded means no embeddings were available."""
    if vector_index is None:
        logger.warning("No index.json; using lexical retrieval")
        return retrieval.rank_lexically(question, entries), True

    try:
        return await retrieval.rank(question, vector_index, entries), False
    except OllamaUnavailable as exc:
        logger.warning("Embedding unavailable, using lexical retrieval: %s", exc)
        return retrieval.rank_lexically(question, entries), True


async def _generate(
    entry: Entry,
    ranked: list[tuple[Entry, float]],
    request: ChatRequest,
    entries: dict[str, Entry],
) -> ChatResponse:
    """Compose from the top passages, falling back to the best curated answer."""
    passages = "\n\n".join(
        f"[{candidate.id}]\n{candidate.answer(request.locale, request.easy_read)}"
        for candidate, _ in ranked[:4]
    )
    system = SYSTEM_PROMPT_EN if request.locale == "en" else SYSTEM_PROMPT_ZH
    user = f"Reference passages:\n\n{passages}\n\nVisitor's question: {request.question}"

    try:
        answer = await ollama.generate(system, user)
    except OllamaUnavailable as exc:
        logger.warning("Generation failed, serving the curated answer: %s", exc)
        return _from_entry(entry, request, entries, route="fallback")

    if not answer:
        return _from_entry(entry, request, entries, route="fallback")

    return ChatResponse(
        answer=answer,
        route="generated",
        source=Source(entry_id=entry.id, label=entry.triggers(request.locale)[0]),
        action=_resolve(entry.action, request.locale),
        followups=build_followups(entry, entries, request.locale),
        locale=request.locale,
    )


def _from_entry(
    entry: Entry,
    request: ChatRequest,
    entries: dict[str, Entry],
    route: str,
) -> ChatResponse:
    return ChatResponse(
        answer=entry.answer(request.locale, request.easy_read),
        route=route,  # type: ignore[arg-type]
        source=Source(entry_id=entry.id, label=entry.triggers(request.locale)[0]),
        action=_resolve(entry.action, request.locale),
        followups=build_followups(entry, entries, request.locale),
        locale=request.locale,
    )


def _resolve(action: Action | None, locale: Locale) -> ResolvedAction | None:
    """Pick the label for this locale. The browser receives one, never both."""
    return None if action is None else action.resolve(locale)


def _refusal(locale: Locale, route: str) -> ChatResponse:
    return ChatResponse(
        answer=_REFUSAL_FALLBACK_EN if locale == "en" else _REFUSAL_FALLBACK_ZH,
        route=route,  # type: ignore[arg-type]
        source=None,
        action=_CONTACT_ACTION.resolve(locale),
        followups=[],
        locale=locale,
    )


def build_followups(
    entry: Entry, entries: dict[str, Entry], locale: Locale
) -> list[Followup]:
    """Authored next questions, resolved to their first trigger phrase.

    Authored rather than generated: the suggested path through the site stays
    deliberate instead of being improvised by a 4B model.
    """
    followups: list[Followup] = []
    for followup_id in entry.followups:
        target = entries.get(followup_id)
        if target is None:
            continue
        triggers = target.triggers(locale)
        if not triggers:
            continue
        followups.append(Followup(label=triggers[0], question=triggers[0]))
    return followups
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `uv run pytest tests/test_chatbot_service.py -v`
Expected: PASS, 9 tests

- [ ] **Step 5: Commit**

```bash
uv run ruff check . && uv run ruff format .
uv run pytest
git add app/features/chatbot/service.py tests/test_chatbot_service.py
git commit -m "feat(chatbot): confidence routing with refusal short-circuit"
```

---

## Task 7: The endpoint, wiring, and the backend README

**Files:**
- Create: `backend/app/features/chatbot/router.py`
- Create: `backend/app/features/chatbot/README.md`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_chatbot_api.py`

**Interfaces:**
- Consumes: `answer_question`, `ChatRequest`, `ChatResponse`.
- Produces: `POST /api/chat`; `router` registered in `app.main`.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_chatbot_api.py`:

```python
"""The HTTP boundary: validation, the kill switch, and never returning a 500."""

import pytest
from fastapi.testclient import TestClient

from app.features.chatbot import router as chatbot_router
from app.features.chatbot.models import ChatResponse
from app.main import app


@pytest.fixture
def api() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(autouse=True)
def stub_service(monkeypatch) -> None:
    """The routing logic has its own tests; this file is about HTTP."""

    async def fake_answer(request):
        return ChatResponse(answer="stubbed", route="curated", locale=request.locale)

    monkeypatch.setattr(chatbot_router, "answer_question", fake_answer)


def test_post_returns_an_answer(api: TestClient) -> None:
    response = api.post("/api/chat", json={"question": "what is Love 21"})

    assert response.status_code == 200
    body = response.json()
    assert body["answer"] == "stubbed"
    assert body["route"] == "curated"


def test_locale_is_passed_through(api: TestClient) -> None:
    response = api.post("/api/chat", json={"question": "x", "locale": "zh-Hant"})

    assert response.json()["locale"] == "zh-Hant"


def test_empty_question_is_rejected(api: TestClient) -> None:
    response = api.post("/api/chat", json={"question": ""})

    assert response.status_code == 422


def test_overlong_question_is_rejected(api: TestClient) -> None:
    """Cheap prompt-stuffing guard, enforced server-side too."""
    response = api.post("/api/chat", json={"question": "x" * 501})

    assert response.status_code == 422


def test_unknown_locale_is_rejected(api: TestClient) -> None:
    response = api.post("/api/chat", json={"question": "x", "locale": "fr"})

    assert response.status_code == 422


def test_disabled_returns_503(api: TestClient, monkeypatch) -> None:
    monkeypatch.setattr(chatbot_router.settings, "chatbot_enabled", False)

    response = api.post("/api/chat", json={"question": "x"})

    assert response.status_code == 503


def test_health_still_reports_ok(api: TestClient) -> None:
    assert api.get("/health").status_code == 200
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `uv run pytest tests/test_chatbot_api.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.features.chatbot.router'`

- [ ] **Step 3: Implement `router.py`**

Create `backend/app/features/chatbot/router.py`:

```python
"""HTTP route for the chatbot. Registered in `app.main`."""

from fastapi import APIRouter, HTTPException, status

from app.config import get_settings
from app.features.chatbot.corpus import load_corpus
from app.features.chatbot.models import ChatRequest, ChatResponse
from app.features.chatbot.service import answer_question

router = APIRouter(prefix="/api/chat", tags=["chatbot"])

settings = get_settings()

# Validate the corpus at import, which is what makes a bad entry a *boot*
# failure rather than a 500 on whichever visitor happens to hit it first.
# `app.main` imports this module, so uvicorn refuses to start and prints the
# offending entry id. Cheap: load_corpus is cached, so the request path reuses
# this result.
if settings.chatbot_enabled:
    load_corpus()

_DISABLED = (
    "The assistant is switched off. Set CHATBOT_ENABLED=true in backend/.env "
    "and make sure Ollama is running -- see app/features/chatbot/README.md."
)


@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    """Answer one question.

    Never 500s: `answer_question` degrades to a written answer on every failure
    path, so a dead model produces a worse answer rather than a broken page.
    """
    if not settings.chatbot_enabled:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, _DISABLED)
    return await answer_question(request)
```

- [ ] **Step 4: Add the boot-failure test**

Append to `backend/tests/test_chatbot_api.py`:

```python
def test_router_import_fails_on_a_bad_corpus(monkeypatch, tmp_path) -> None:
    """A bad entry must stop the app, not surface as a 500 on a visitor.

    `app.main` imports the router, so the router's import-time `load_corpus()`
    is what turns a content error into a refusal to boot. Reloading the module
    against a deliberately broken knowledge directory exercises exactly that.
    """
    import importlib

    from app.features.chatbot import corpus

    broken = tmp_path / "knowledge"
    broken.mkdir()
    # Missing answer_zh, easy_read_*, triggers, source -- invalid many times over.
    (broken / "bad.yaml").write_text("- id: bad\n  answer_en: x\n", encoding="utf-8")

    monkeypatch.setattr(corpus, "KNOWLEDGE_DIR", broken)
    corpus.load_corpus.cache_clear()
    try:
        with pytest.raises(corpus.CorpusError):
            importlib.reload(chatbot_router)
    finally:
        # Leave the module and the cache as we found them for later tests.
        corpus.load_corpus.cache_clear()
        monkeypatch.undo()
        importlib.reload(chatbot_router)
```

Note: this test reloads a module, so it must not run in parallel with others
that hold a reference to `chatbot_router`. The suite is serial; if that ever
changes, mark this test `serial`.

- [ ] **Step 5: Register the router**

In `backend/app/main.py`, add the import beside the Instagram one:

```python
from app.features.chatbot.router import router as chatbot_router
```

and register it beside the others:

```python
app.include_router(chatbot_router)
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `uv run pytest tests/test_chatbot_api.py -v`
Expected: PASS, 8 tests

- [ ] **Step 7: Verify against a real model end to end**

With Ollama running, start the API (`uv run uvicorn app.main:app --reload --port 8000`) and in another terminal:

```bash
curl -s -X POST http://127.0.0.1:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question":"where does my money go"}'
```

Expected: `"route":"curated"` and an answer containing `HK$500`.

```bash
curl -s -X POST http://127.0.0.1:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question":"is my child autistic"}'
```

Expected: `"route":"refused"` and the contact action.

```bash
curl -s -X POST http://127.0.0.1:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question":"what is the capital of Peru"}'
```

Expected: `"route":"refused"`.

Then stop Ollama (`ollama stop qwen3:4b`, or quit the app entirely) and repeat the first call.
Expected: HTTP 200 with `"route":"fallback"` — **not** a 500.

- [ ] **Step 8: Write the backend README**

Create `backend/app/features/chatbot/README.md`:

```markdown
# Chatbot feature (backend)

A local, grounded assistant. Answers come from a curated bilingual corpus, not
from the model's own knowledge. Nothing leaves the machine.

## Endpoint

    POST /api/chat   { "question": "...", "locale": "en"|"zh-Hant", "easy_read": false }

Returns `answer`, `route`, `source`, `action`, `followups`, `locale`.

`route` says how the answer was produced:

| route | Meaning |
|---|---|
| `curated` | Strong match. A staff-written answer, returned verbatim. No model call. |
| `generated` | Moderate match. The model composed from retrieved passages. |
| `refused` | Weak match, or a refusal entry. Offers a person instead. |
| `fallback` | Ollama was unavailable. Lexical matching, curated text. |

## Setup

    ollama pull qwen3:4b
    ollama pull bge-m3
    uv run python -m app.features.chatbot.build_index

`CHATBOT_ENABLED=false` in `backend/.env` switches the feature off entirely: the
endpoint 503s and the frontend omits the launcher. A teammate without Ollama
still gets a working site.

**If the machine struggles on the day**, drop to the smaller model — no code
change, and answers stay grounded because the corpus does the factual work:

    ollama pull qwen3:1.7b
    # backend/.env
    CHATBOT_MODEL=qwen3:1.7b

Then restart uvicorn. `--reload` watches `.py`, not `.env`.

## Editing answers (for staff)

Everything visitors are told lives in `knowledge/*.yaml`. Each entry needs
English and 繁體中文, an Easy Read version of each, and a `source`.

**Numbers are not typed in.** Write `{{ hkd_per_class }}` and the value comes
from `content/impact-stats.yaml` at the repo root. An unknown token stops the
app from starting — which is the point: no number reaches a visitor without a
source behind it.

**After editing any YAML, rebuild the index:**

    uv run python -m app.features.chatbot.build_index

A test fails if you forget.

## Why it is built this way

Fine-tuning was considered and rejected — it encodes style rather than facts,
and makes ungrounded numbers *more* confident. See
`docs/superpowers/specs/2026-07-31-ai-chatbot-design.md`.

Refusals (medical, safeguarding) are ordinary corpus entries with
`is_refusal: true`. Because they are in the index they retrieve at high
confidence and short-circuit the model completely. Retrieval as the safety
filter beats asking a 4B model to police itself.

## Files

| File | Role |
|---|---|
| `knowledge/*.yaml` | The corpus. Content, no code. |
| `stats.py` | Resolves `{{ tokens }}` from `content/impact-stats.yaml`. |
| `corpus.py` | Loads and validates. Raises rather than shipping a bad entry. |
| `ollama.py` | The only module that talks to Ollama. |
| `index.py` / `build_index.py` | Trigger embeddings + staleness check. |
| `retrieval.py` | Cosine ranking; lexical fallback. |
| `service.py` | Confidence routing. |
| `router.py` | `POST /api/chat`. |
```

- [ ] **Step 9: Commit**

```bash
uv run ruff check . && uv run ruff format .
uv run pytest
git add app/features/chatbot/router.py app/features/chatbot/README.md app/main.py tests/test_chatbot_api.py
git commit -m "feat(chatbot): POST /api/chat, kill switch, and feature README"
```

---

## Task 8: Frontend types and API client

**Files:**
- Create: `frontend/features/chatbot/types.ts`
- Create: `frontend/features/chatbot/api.ts`

**Interfaces:**
- Produces: `ChatResponse`, `ChatResult`, `Locale`, `Route`, `Action`, `Followup`, `Source`; `postQuestion(question, locale, easyRead) -> Promise<ChatResult>`.

- [ ] **Step 1: Write `types.ts`**

Create `frontend/features/chatbot/types.ts`:

```typescript
// Mirrors backend/app/features/chatbot/models.py. Keep the two in sync.

export type Locale = "en" | "zh-Hant";

/** How the answer was produced. Drives the "saved answers" note in the panel. */
export type Route = "curated" | "generated" | "refused" | "fallback";

export interface Action {
  label: string;
  href: string;
}

export interface Source {
  entry_id: string;
  label: string;
}

export interface Followup {
  label: string;
  question: string;
}

export interface ChatResponse {
  answer: string;
  route: Route;
  source: Source | null;
  action: Action | null;
  followups: Followup[];
  locale: Locale;
}

// Result wrapper so callers handle the error case explicitly instead of throwing.
export type ChatResult =
  | { ok: true; response: ChatResponse }
  | { ok: false; error: string };
```

- [ ] **Step 2: Write `api.ts`**

Create `frontend/features/chatbot/api.ts`:

```typescript
import type { ChatResult, Locale } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

/** Longer than the backend's own 20s cap, so the server's fallback wins first. */
const CLIENT_TIMEOUT_MS = 25_000;

/**
 * Ask the backend one question.
 *
 * Unlike every other fetch in this app, this runs in the BROWSER — the panel is
 * a Client Component. That makes CORS_ORIGINS in backend/.env load-bearing for
 * the first time; a CORS failure surfaces here as a generic network error.
 */
export async function postQuestion(
  question: string,
  locale: Locale,
  easyRead: boolean,
): Promise<ChatResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, locale, easy_read: easyRead }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return { ok: false, error: `${response.status} ${response.statusText}` };
    }

    return { ok: true, response: await response.json() };
  } catch (cause) {
    const aborted = cause instanceof DOMException && cause.name === "AbortError";
    return {
      ok: false,
      error: aborted ? "timeout" : `Could not reach the assistant. (${cause})`,
    };
  } finally {
    clearTimeout(timeout);
  }
}
```

- [ ] **Step 3: Typecheck**

Run from `frontend/`: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add features/chatbot/types.ts features/chatbot/api.ts
git commit -m "feat(chatbot): frontend types and browser-side API client"
```

---

## Task 9: The accessible panel shell

Build the shell before the conversation: focus, Escape and the full-screen breakpoint are the parts most likely to be skipped under time pressure, and they are the parts non-negotiable #1 actually cares about.

**Files:**
- Create: `frontend/features/chatbot/components/ChatPanel.tsx`
- Create: `frontend/features/chatbot/components/ChatLauncher.tsx`
- Modify: `frontend/app/page.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `<ChatLauncher />` — self-contained, no required props.
  - `<ChatPanel open, onClose, children, launcherRef />`.

- [ ] **Step 1: Check the Next.js docs before writing a Client Component**

This repo pins Next.js 16, and `frontend/AGENTS.md` warns that conventions have changed from what you may remember.

Run from `frontend/`: `ls node_modules/next/dist/docs/`

Read whatever covers Client Components and `"use client"` before continuing. Basic `useState`/`useEffect`/`useRef` usage is unchanged; do not assume anything beyond that.

- [ ] **Step 2: Write `ChatPanel.tsx`**

Create `frontend/features/chatbot/components/ChatPanel.tsx`:

```tsx
"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";

interface ChatPanelProps {
  open: boolean;
  onClose: () => void;
  /** Focus returns here on close — a keyboard user must not be dumped at the top. */
  launcherRef: RefObject<HTMLButtonElement | null>;
  title: string;
  closeLabel: string;
  children: ReactNode;
}

/**
 * The panel shell. Owns focus, Escape, and the full-screen breakpoint; knows
 * nothing about chat.
 *
 * Accessibility decisions worth not undoing:
 *
 * - **Full-screen below 37.5em, floating above it.** An `em` breakpoint keys off
 *   the user's font size, so one rule covers both a 600px phone and a 1200px
 *   desktop at 200% zoom. A `px` breakpoint would leave the zoomed desktop with
 *   a cramped floating card, which is the usual failure of this pattern.
 * - **Non-modal when floating.** The page stays usable and focus is not trapped.
 *   Trapping is only correct once the panel covers everything.
 * - **No transitions.** Nothing here animates, so `prefers-reduced-motion`
 *   needs no special case (#2).
 */
export function ChatPanel({
  open,
  onClose,
  launcherRef,
  title,
  closeLabel,
  children,
}: ChatPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Escape closes from anywhere inside the panel.
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        launcherRef.current?.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, launcherRef]);

  // Move focus into the panel on open so the next Tab lands inside it.
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={title}
      tabIndex={-1}
      className={[
        "fixed z-50 flex flex-col overflow-hidden bg-white text-zinc-900",
        "border border-zinc-300 shadow-lg outline-none",
        // Full-screen by default; a floating card only once there is room.
        "inset-0 rounded-none",
        "min-[37.5em]:inset-auto min-[37.5em]:bottom-24 min-[37.5em]:right-6",
        "min-[37.5em]:h-[32rem] min-[37.5em]:w-[24rem] min-[37.5em]:rounded-xl",
      ].join(" ")}
    >
      <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
        <h2 className="text-base font-semibold">{title}</h2>
        <button
          type="button"
          onClick={() => {
            onClose();
            launcherRef.current?.focus();
          }}
          className="rounded px-3 py-2 text-sm font-medium text-zinc-700 underline underline-offset-2 hover:text-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
        >
          {/* Text, not an X glyph: non-negotiable #4 forbids icon-only controls. */}
          {closeLabel}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
    </div>
  );
}
```

- [ ] **Step 3: Write `ChatLauncher.tsx`**

Create `frontend/features/chatbot/components/ChatLauncher.tsx`:

```tsx
"use client";

import { useRef, useState } from "react";
import { ChatPanel } from "./ChatPanel";

/**
 * The always-available trigger, plus the panel it opens.
 *
 * Drop `<ChatLauncher />` once in the root layout. It is fixed-position, so it
 * does not matter where in the tree it sits.
 *
 * The label is visible text, never a bare icon (#4). Minimum target size is
 * comfortably past 44x44 CSS px (#7 of CONTEXT §7 applies site-wide, not only
 * to photo markers).
 */
export function ChatLauncher() {
  const [open, setOpen] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        aria-expanded={open}
        className="fixed bottom-6 right-6 z-40 min-h-[3rem] rounded-full border border-zinc-800 bg-zinc-900 px-6 py-3 text-base font-semibold text-zinc-50 shadow-lg hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
      >
        Ask for help
      </button>

      <ChatPanel
        open={open}
        onClose={() => setOpen(false)}
        launcherRef={launcherRef}
        title="Ask for help"
        closeLabel="Close"
      >
        <p className="text-sm text-zinc-600">Conversation goes here.</p>
      </ChatPanel>
    </>
  );
}
```

- [ ] **Step 4: Mount it and reserve space for it**

In `frontend/app/page.tsx`, add the import:

```tsx
import { ChatLauncher } from "@/features/chatbot/components/ChatLauncher";
```

Add `pb-28` to the `<main>` className so the fixed launcher never permanently covers page content, and render `<ChatLauncher />` as the last child of `<main>`:

```tsx
    <main className="flex-1 pb-28 font-sans">
      {/* ...existing sections... */}
      <ChatLauncher />
    </main>
```

- [ ] **Step 5: Verify the accessibility behaviour by hand**

Run from `frontend/`: `npm run dev`, and from `backend/`: `uv run uvicorn app.main:app --reload --port 8000`

Open <http://localhost:3000> and check every line:

1. Tab to the launcher — a visible focus ring appears.
2. Enter opens the panel.
3. Tab moves into the panel, not behind it.
4. Escape closes it **and focus returns to the launcher**.
5. The Close button is reachable and reads "Close" as text.
6. Narrow the window below ~600px — the panel goes full-screen.
7. At full width, press Ctrl+`+` to 200% zoom — the panel goes **full-screen**, not a cramped card. This is the `em` breakpoint doing its job.
8. No horizontal scrollbar appears at 200% zoom.
9. Page content is still readable behind the launcher at the bottom of a scrolled page.

- [ ] **Step 6: Typecheck, lint, commit**

```bash
npx tsc --noEmit
npm run lint
git add features/chatbot/components/ app/page.tsx
git commit -m "feat(chatbot): accessible panel shell with focus and zoom handling"
```

---

## Task 10: The conversation

**Files:**
- Create: `frontend/features/chatbot/components/ChatTranscript.tsx`
- Create: `frontend/features/chatbot/components/SuggestedQuestions.tsx`
- Create: `frontend/features/chatbot/README.md`
- Modify: `frontend/features/chatbot/components/ChatLauncher.tsx`

**Interfaces:**
- Consumes: `postQuestion`, `ChatResponse`, `Followup`, `Locale` from Task 8; `<ChatPanel />` from Task 9.
- Produces: `<ChatTranscript />`, `<SuggestedQuestions />`; a `ChatLauncher` wired end to end.

- [ ] **Step 1: Write `SuggestedQuestions.tsx`**

Create `frontend/features/chatbot/components/SuggestedQuestions.tsx`:

```tsx
"use client";

interface SuggestedQuestionsProps {
  questions: { label: string; question: string }[];
  onPick: (question: string) => void;
  disabled: boolean;
  heading: string;
}

/**
 * Question buttons — the opening set, and the followups after each answer.
 *
 * These are the primary interface, not decoration. A blank text box is a poor
 * starting point for visitors with intellectual disabilities; a short list of
 * real questions is far easier to act on. They also make the no-Ollama fallback
 * work, because each button sends exact trigger text that matches lexically.
 */
export function SuggestedQuestions({
  questions,
  onPick,
  disabled,
  heading,
}: SuggestedQuestionsProps) {
  if (questions.length === 0) return null;

  return (
    <div className="mt-4">
      <h3 className="text-sm font-medium text-zinc-600">{heading}</h3>
      <ul className="mt-2 flex flex-col gap-2">
        {questions.map((item) => (
          <li key={item.question}>
            <button
              type="button"
              onClick={() => onPick(item.question)}
              disabled={disabled}
              className="w-full min-h-[2.75rem] rounded-lg border border-zinc-300 bg-white px-4 py-2 text-left text-sm text-zinc-900 hover:bg-zinc-50 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Write `ChatTranscript.tsx`**

Create `frontend/features/chatbot/components/ChatTranscript.tsx`:

```tsx
"use client";

import type { ChatResponse } from "../types";

export interface Turn {
  question: string;
  response: ChatResponse | null;
  error: string | null;
}

interface ChatTranscriptProps {
  turns: Turn[];
  pending: boolean;
  strings: {
    you: string;
    thinking: string;
    savedAnswers: string;
    failed: string;
    contact: string;
  };
}

/**
 * The conversation so far, and the single live region that announces answers.
 *
 * One `aria-live="polite" aria-atomic="true"` region wraps the whole transcript
 * and each answer is rendered complete, in one go. That is why this feature does
 * not stream tokens: a screen reader re-announces a region that mutates
 * repeatedly, so streaming would read a partial answer several times over. The
 * definition of done asks for names announced once, not twice.
 */
export function ChatTranscript({ turns, pending, strings }: ChatTranscriptProps) {
  return (
    <div aria-live="polite" aria-atomic="true" className="flex flex-col gap-5">
      {turns.map((turn, position) => (
        <div key={`${position}-${turn.question}`} className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-zinc-600">
            {strings.you} {turn.question}
          </p>

          {turn.error !== null && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p>{strings.failed}</p>
              <a
                href="/contact"
                className="mt-2 inline-block font-medium underline underline-offset-2"
              >
                {strings.contact}
              </a>
            </div>
          )}

          {turn.response !== null && (
            <div className="rounded-lg bg-zinc-100 px-4 py-3">
              <p className="whitespace-pre-line text-[0.95rem] leading-relaxed text-zinc-900">
                {turn.response.answer}
              </p>

              {turn.response.action !== null && (
                <a
                  href={turn.response.action.href}
                  className="mt-3 inline-block min-h-[2.75rem] rounded-lg bg-zinc-900 px-4 py-3 text-sm font-semibold text-zinc-50 hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                >
                  {turn.response.action.label}
                </a>
              )}

              {turn.response.route === "fallback" && (
                <p className="mt-3 text-xs text-zinc-600">{strings.savedAnswers}</p>
              )}
            </div>
          )}
        </div>
      ))}

      {pending && <p className="text-sm text-zinc-600">{strings.thinking}</p>}
    </div>
  );
}
```

- [ ] **Step 3: Rewrite `ChatLauncher.tsx` with the full wiring**

Replace `frontend/features/chatbot/components/ChatLauncher.tsx` entirely:

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { postQuestion } from "../api";
import type { Locale } from "../types";
import { ChatPanel } from "./ChatPanel";
import { ChatTranscript, type Turn } from "./ChatTranscript";
import { SuggestedQuestions } from "./SuggestedQuestions";

/**
 * UI chrome in both locales (#5). Answers themselves are bilingual in the
 * backend corpus; these are the labels around them.
 */
const STRINGS = {
  en: {
    launcher: "Ask for help",
    title: "Ask for help",
    close: "Close",
    you: "You asked:",
    thinking: "Thinking…",
    savedAnswers: "Answering from saved answers.",
    failed: "Sorry — I could not answer just now.",
    contact: "Talk to a person",
    startHeading: "Try one of these",
    nextHeading: "You could also ask",
    inputLabel: "Type your question",
    send: "Send",
  },
  "zh-Hant": {
    launcher: "尋求協助",
    title: "尋求協助",
    close: "關閉",
    you: "你問：",
    thinking: "思考中…",
    savedAnswers: "正使用已儲存的答案回覆。",
    failed: "抱歉——暫時無法回答。",
    contact: "與真人聯絡",
    startHeading: "試試這些問題",
    nextHeading: "你也可以問",
    inputLabel: "輸入你的問題",
    send: "傳送",
  },
} as const;

/** Exact trigger text from the corpus, so they also match without Ollama. */
const OPENING_QUESTIONS = {
  en: [
    { label: "What is Love 21?", question: "what is Love 21" },
    { label: "Who can join?", question: "who can join" },
    { label: "Where does my money go?", question: "where does my money go" },
  ],
  "zh-Hant": [
    { label: "甚麼是愛21？", question: "甚麼是愛21" },
    { label: "誰可以參加？", question: "誰可以參加" },
    { label: "捐款用在哪裡？", question: "捐款用在哪裡" },
  ],
} as const;

export function ChatLauncher() {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [pending, setPending] = useState(false);
  const [draft, setDraft] = useState("");
  const [locale, setLocale] = useState<Locale>("en");
  const [easyRead, setEasyRead] = useState(false);

  const launcherRef = useRef<HTMLButtonElement>(null);

  // Inherit the site's language and Easy Read setting rather than owning our
  // own. The accessibility toolbar (CONTEXT §6.1) sets these on <html>.
  useEffect(() => {
    const root = document.documentElement;
    const read = () => {
      setLocale(root.lang === "zh-Hant" ? "zh-Hant" : "en");
      setEasyRead(root.dataset.easyRead === "true");
    };
    read();

    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ["lang", "data-easy-read"] });
    return () => observer.disconnect();
  }, []);

  const strings = STRINGS[locale];

  const ask = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || pending) return;

      setPending(true);
      setDraft("");
      setTurns((previous) => [...previous, { question: trimmed, response: null, error: null }]);

      const result = await postQuestion(trimmed, locale, easyRead);

      setTurns((previous) => {
        const next = [...previous];
        const last = next[next.length - 1];
        next[next.length - 1] = result.ok
          ? { ...last, response: result.response }
          : { ...last, error: result.error };
        return next;
      });
      setPending(false);
    },
    [pending, locale, easyRead],
  );

  const lastResponse = turns[turns.length - 1]?.response ?? null;
  const suggestions =
    lastResponse !== null
      ? lastResponse.followups.map((f) => ({ label: f.label, question: f.question }))
      : [...OPENING_QUESTIONS[locale]];

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        aria-expanded={open}
        className="fixed bottom-6 right-6 z-40 min-h-[3rem] rounded-full border border-zinc-800 bg-zinc-900 px-6 py-3 text-base font-semibold text-zinc-50 shadow-lg hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
      >
        {strings.launcher}
      </button>

      <ChatPanel
        open={open}
        onClose={() => setOpen(false)}
        launcherRef={launcherRef}
        title={strings.title}
        closeLabel={strings.close}
      >
        <ChatTranscript turns={turns} pending={pending} strings={strings} />

        <SuggestedQuestions
          questions={suggestions}
          onPick={ask}
          disabled={pending}
          heading={turns.length === 0 ? strings.startHeading : strings.nextHeading}
        />

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void ask(draft);
          }}
          className="mt-4 flex flex-col gap-2"
        >
          <label htmlFor="chat-input" className="text-sm font-medium text-zinc-700">
            {strings.inputLabel}
          </label>
          <input
            id="chat-input"
            type="text"
            value={draft}
            maxLength={500}
            onChange={(event) => setDraft(event.target.value)}
            className="min-h-[2.75rem] rounded-lg border border-zinc-400 px-3 py-2 text-base text-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
          />
          <button
            type="submit"
            disabled={pending || draft.trim().length === 0}
            className="min-h-[2.75rem] rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-50 hover:bg-zinc-800 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
          >
            {strings.send}
          </button>
        </form>
      </ChatPanel>
    </>
  );
}
```

- [ ] **Step 4: Verify end to end by hand**

With both servers and Ollama running, open <http://localhost:3000>:

1. Open the panel, click **"Where does my money go?"** — an answer appears mentioning HK$500, with a **"See what your gift funds"** button.
2. The followup buttons change to the next questions.
3. Type "can I bring my company team" and Send — an answer appears (likely `generated`).
4. Type "what is the capital of Peru" — the refusal answer appears with a contact link.
5. Type "is my child autistic" — the medical handoff appears. **Confirm the backend log shows no generation call.**

- [ ] **Step 5: Verify the degraded path**

Quit Ollama entirely, then reload and click a suggested question.

Expected: an answer still appears, with "Answering from saved answers." underneath. No error, no blank panel.

- [ ] **Step 6: Verify the Chinese path**

In the browser console: `document.documentElement.lang = "zh-Hant"`

Expected: the launcher, headings, and buttons switch to 繁體中文 without a reload, and answers come back in Chinese.

Then: `document.documentElement.dataset.easyRead = "true"` and ask again.
Expected: shorter, simpler answers.

- [ ] **Step 7: Write the frontend README**

Create `frontend/features/chatbot/README.md`:

```markdown
# Chatbot feature (frontend)

The visitor-facing assistant. Talks only to our own backend (`POST /api/chat`),
which talks to a model running on the same machine.

## Use it

Render it once, anywhere — it is fixed-position:

    import { ChatLauncher } from "@/features/chatbot/components/ChatLauncher";

    <ChatLauncher />;

Give the page a bottom padding (`pb-28`) so the launcher never permanently
covers content.

## The accessibility contract

Do not undo these without reading `local/CONTEXT.md` §1 first.

- The launcher shows **text**, never a bare icon (#4).
- The panel is **full-screen below `37.5em`** and floating above it. The `em`
  breakpoint is deliberate: it covers both a small phone and a desktop at 200%
  zoom, which a `px` breakpoint does not.
- **Escape closes and returns focus to the launcher.**
- Answers render **complete, once**, into a single `aria-live="polite"` region.
  This is why tokens are not streamed — a mutating live region gets re-announced.
- **Nothing animates**, so `prefers-reduced-motion` needs no special case (#2).
- Locale and Easy Read are **inherited from `<html>`** (`lang`,
  `data-easy-read`), which the accessibility toolbar owns. The panel does not
  have its own language switch.

## Files

| File | Role |
|---|---|
| `types.ts` | Mirror of `backend/app/features/chatbot/models.py`. |
| `api.ts` | `postQuestion()`. Runs in the browser — CORS applies. |
| `components/ChatLauncher.tsx` | Trigger, state, and all UI strings. |
| `components/ChatPanel.tsx` | Shell: focus, Escape, breakpoint. |
| `components/ChatTranscript.tsx` | Messages and the live region. |
| `components/SuggestedQuestions.tsx` | Opening questions and followups. |

## Note

Suggested-question buttons send **exact trigger text** from the backend corpus.
That is what lets them keep working when Ollama is not running, since the
lexical fallback matches them at 1.0. If you reword a button, reword the trigger
in `backend/app/features/chatbot/knowledge/*.yaml` too.
```

- [ ] **Step 8: Typecheck, lint, commit**

```bash
npx tsc --noEmit
npm run lint
npm run build
git add features/chatbot/
git commit -m "feat(chatbot): conversation, suggested questions, and bilingual chrome"
```

---

## Task 11: Fill out the corpus

**Not for a subagent.** Decided 2026-08-01: Tasks 1–10 are executed by
implementer subagents and execution stops here. This task produces factual
claims about a real charity, and `CONTEXT.md` §12 forbids inventing statistics,
schedules, quotes or testimonials — so the answers are written by the team, with
staff confirming anything unsourced. The deliverable handed over is the
scaffolding: entry ids, trigger phrases, and the list of what staff must confirm.

The engineering is done at this point. This task is content, and it is the critical path — see the risk section of the spec.

**Files:**
- Create: `backend/app/features/chatbot/knowledge/programmes.yaml`
- Create: `backend/app/features/chatbot/knowledge/volunteering.yaml`
- Create: `backend/app/features/chatbot/knowledge/visiting.yaml`
- Modify: `backend/app/features/chatbot/knowledge/about.yaml`
- Modify: `backend/app/features/chatbot/knowledge/donating.yaml`
- Modify: `backend/app/features/chatbot/index.json` (regenerated)

**Interfaces:**
- Consumes: the `Entry` schema from Task 2.
- Produces: ~35 entries total.

- [ ] **Step 1: Confirm who writes the 繁體中文**

**Do not skip this.** If nobody on the team reads Traditional Chinese, stop and
raise it: machine-translated Chinese on a Cantonese-first charity's site is worse
than an honest "Chinese coming soon". This is the decision the spec flags as
needing to be made by 2026-08-01.

- [ ] **Step 2: Write `programmes.yaml`**

Cover the five programme areas from `CONTEXT.md` §5.1 item 2 — Sport & Fitness,
Nutrition & Dietetics, Family Support, Community & Enrichment, Employment. Each
entry answers what it is, who it is for, when it runs, and how to join.

Use the entry format from `donating.yaml`. Every entry needs `triggers_en`,
`triggers_zh`, `answer_en`, `answer_zh`, `easy_read_en`, `easy_read_zh`, and
`source`. Add an `action` pointing at `/programmes/<slug>` and `followups` to
related entries.

Where a schedule or age range is not known, **do not invent one** — write the
answer without it and add the question to `CONTEXT.md` §9's list for staff.

- [ ] **Step 3: Write `volunteering.yaml`**

Cover: how to start, the known real roles (class assistant, lead a class, event
helper), corporate/CSR groups, time commitment, whether training is given, and
the HandsOn Hong Kong / Time Auction links.

Per `CONTEXT.md` §6.4, each role answer states the time commitment and what you
would actually do. Where the real list is not confirmed, keep the answer general
and add the gap to §9 rather than inventing specifics.

- [ ] **Step 4: Write `visiting.yaml`**

The "what happens when I walk in" questions — what a first session is like,
what to bring, where the quiet space is, accessibility of the venue. This is the
`local/ideas.md` idea #4 territory; if that page gets built, point `action.href`
at it.

- [ ] **Step 5: Extend `about.yaml` and `donating.yaml`**

Add the remaining common questions: the charity's story (founded 2017, fire in
January 2023, reopened larger in October 2023 — all in `CONTEXT.md` §3, so
`source: research-brief`), tax receipts, FPS/PayMe, one-off vs monthly, and how
to contact staff.

Reminder on two non-negotiables while writing donation copy: never frame a gift
as supporting a named person (#7), and never type a number that is not a
`{{ token }}` (#8).

- [ ] **Step 6: Validate the corpus**

Run: `uv run pytest tests/test_chatbot_corpus.py -v`
Expected: PASS. Fix any entry the validator names.

- [ ] **Step 7: Rebuild the index and recalibrate**

```bash
uv run python -m app.features.chatbot.build_index --scores
```

With ~35 entries the score distribution changes — entries now compete. Check
that each probe's intended entry is top, and adjust the thresholds if the gap
between on-topic and off-topic moved.

- [ ] **Step 8: Run the full suite**

Run: `uv run pytest`
Expected: PASS, including the index staleness test.

- [ ] **Step 9: Spot-check twelve real questions**

Ask twelve questions a judge or a parent might actually ask, in both languages,
through the UI. For each, confirm the answer is correct, the `route` is
sensible, and no invented number appears.

Note any question that lands on the wrong entry and add a trigger phrase for it.

- [ ] **Step 10: Commit**

```bash
uv run ruff check . && uv run ruff format .
git add app/features/chatbot/knowledge/ app/features/chatbot/index.json
git commit -m "content(chatbot): full bilingual corpus across five topic areas"
```

---

## Definition of Done

From `CONTEXT.md` §10, scoped to this feature:

- [ ] Keyboard-only pass: launcher, panel, every button and the input reachable; visible focus throughout; Escape returns focus to the launcher; no trap.
- [ ] Screen reader pass (NVDA or VoiceOver): each answer announced once, not twice.
- [ ] axe DevTools clean on a page with the panel open.
- [ ] Usable at 380px and at 200% text zoom with no horizontal scroll.
- [ ] `prefers-reduced-motion: reduce` produces no motion.
- [ ] Both locales render with no missing keys and no English fallback visible in 繁.
- [ ] Easy Read mode produces sensible answers, never blanks.
- [ ] Every number in an answer traces to `content/impact-stats.yaml`.
- [ ] No member name appears anywhere in the corpus.
- [ ] With Ollama stopped, the assistant still answers every suggested question.
- [ ] `uv run pytest` passes; `npm run build` passes.
