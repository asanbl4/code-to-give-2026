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
