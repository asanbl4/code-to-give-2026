"""Shapes for the chatbot feature.

`Entry` is the corpus record. Everything else is the API boundary -- keep it in
sync with `frontend/features/chatbot/types.ts`.
"""

from typing import Literal

from pydantic import BaseModel, Field

Locale = Literal["en", "zh-Hant"]
Route = Literal["generated", "refused", "fallback"]


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

    #: client-provided | staff-confirmed | annual-report-2023-24 | fact-checked
    #: (fact-checked: a verifiable external fact -- e.g. the genetics of
    #: trisomy 21 -- rather than anything about Love 21 itself, so it needs
    #: neither client sign-off nor a staff confirmation)
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
    #: Where the answer came from. Empty for a generic refusal. A list rather
    #: than one entry because a generated answer sees the whole corpus -- the
    #: entry named here is the nearest match, a pointer, not a provenance claim.
    sources: list[Source] = Field(default_factory=list)
    action: ResolvedAction | None = None
    followups: list[Followup] = Field(default_factory=list)
    locale: Locale
