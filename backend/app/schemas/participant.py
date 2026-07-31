"""Shapes for the `participants` table."""

from datetime import date
from uuid import UUID

from pydantic import BaseModel, computed_field


class Participant(BaseModel):
    """A featured member as the public /stories page sees them.

    Consent and publication flags are deliberately absent: RLS has already
    filtered out anything unpublished or unconsented before a row gets here, so
    repeating those fields would only invite a client to re-implement the check
    badly.
    """

    id: UUID
    slug: str

    first_name: str
    last_name: str | None = None
    #: Set when someone consents to a shortened name -- "Maria K." rather than
    #: their full one. Takes precedence over first + last.
    display_name: str | None = None

    avatar_url: str | None = None

    #: One line, shown in the click-on-face popup.
    headline: str | None = None
    #: Their progress, shown under the headline in that popup.
    progress_summary: str | None = None
    #: Full text behind "SHOW MORE".
    story: str | None = None

    joined_on: date | None = None
    sort_order: int = 0

    @computed_field  # type: ignore[prop-decorator]
    @property
    def name(self) -> str:
        """What to render. Composed here so every client agrees on the rule."""
        if self.display_name:
            return self.display_name
        return " ".join(part for part in (self.first_name, self.last_name) if part)
