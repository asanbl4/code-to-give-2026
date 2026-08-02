"""Answer in the language the visitor actually wrote in.

Pure and deterministic -- no model call, no I/O.

`ChatRequest.locale` describes the *site*, not the question. The browser reads
it from `<html lang>`, which the accessibility toolbar (CONTEXT 6.1) is meant
to set and which does not exist yet -- so today every request arrives as "en"
and a Cantonese-first family typing Chinese was answered in English. Retrieval
already handles this correctly: bge-m3 is multilingual and matches a Chinese
question to the right entry. Only the rendered language field was wrong.

The correction is deliberately ONE-WAY. A Chinese question overrides a stated
"en", because writing Chinese is strong evidence of what you can read. An
English question never overrides a stated "zh-Hant": someone who set the site
to Chinese and typed "Love 21" is still a Chinese reader, and English words
appear inside Chinese sentences constantly.

This stays useful after the toolbar ships -- a visitor can switch language just
by asking in it, without hunting for a control.
"""

import re

from app.features.chatbot.models import Locale

#: CJK Unified Ideographs plus Extension A. Traditional Chinese lives here;
#: so does the kanji we will never be asked, which costs nothing.
_HAN = re.compile(r"[㐀-䶿一-鿿]")

#: One Han character is likelier a paste or a name than a Chinese question;
#: a real one always carries several.
_MIN_HAN_CHARS = 2


def resolve_locale(question: str, stated: Locale) -> Locale:
    """The locale to answer in, given the question and what the request claimed."""
    if stated != "en":
        return stated
    if len(_HAN.findall(question)) >= _MIN_HAN_CHARS:
        return "zh-Hant"
    return "en"
