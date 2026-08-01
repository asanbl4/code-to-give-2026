"""Web addresses for participants, derived from their name.

Staff used to type these by hand, which asked a charity worker to understand
what a URL slug is in order to add a member. They are generated now.

A slug is permanent once issued: it is the public identifier behind
`/stories/<slug>`, so renaming a member must not silently break a link someone
has shared. Nothing here is exposed for editing.
"""

import re
import unicodedata
from collections.abc import Iterator
from uuid import uuid4

#: Mirrors the `participants_slug_check` constraint. Anything this module
#: returns has to satisfy it, because the database is the one that decides.
MAX_LENGTH = 80
MIN_LENGTH = 2

_NON_SLUG = re.compile(r"[^a-z0-9]+")


def _fallback() -> str:
    return f"member-{uuid4().hex[:6]}"


def slugify(*parts: str | None) -> str:
    """A schema-valid slug from name parts, or an opaque one if that fails.

    The fallback is not a nicety. Transliteration only works for names written
    in a script that has an ASCII shadow; a name in Chinese characters folds to
    the empty string, and this charity is in Hong Kong. Rather than reject the
    member, give them `member-a1b2c3` -- ugly, but they exist, and staff never
    see it.
    """
    joined = " ".join(part for part in parts if part)
    # NFKD splits an accented letter into letter + combining mark, so dropping
    # the marks leaves the letter behind: "Köhler" -> "Kohler", not "Khler".
    decomposed = unicodedata.normalize("NFKD", joined)
    ascii_only = "".join(char for char in decomposed if not unicodedata.combining(char))
    slug = _NON_SLUG.sub("-", ascii_only.lower()).strip("-")

    # Truncating can leave a trailing dash mid-word, which the pattern rejects.
    slug = slug[:MAX_LENGTH].strip("-")

    return slug if len(slug) >= MIN_LENGTH else _fallback()


def slug_candidates(base: str) -> Iterator[str]:
    """`base`, then `base-2`, `base-3` ... then something certainly free.

    Suffixes are appended within the length limit, so a name at exactly 80
    characters still yields a valid candidate rather than an 82-character one
    the database refuses.
    """
    yield base

    for suffix in range(2, 21):
        tail = f"-{suffix}"
        yield f"{base[: MAX_LENGTH - len(tail)].strip('-')}{tail}"

    # Twenty people sharing a name is unlikely enough that readability stops
    # being worth another round trip.
    yield _fallback()
