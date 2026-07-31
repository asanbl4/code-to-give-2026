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

from app.features.chatbot import index
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
        # Imported here, not at module scope: rebuilding the index must not
        # depend on the retrieval module, so `build_index` keeps working even
        # while retrieval is being changed.
        from app.features.chatbot import retrieval

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
