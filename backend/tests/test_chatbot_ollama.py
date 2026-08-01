"""The only module that talks to Ollama, tested without Ollama.

httpx.MockTransport lets us assert on the exact request body -- which matters
for the `think` flag, which must NOT be sent. See
test_generate_does_not_send_think_false for the measurement behind that.
"""

import httpx
import pytest

from app.features.chatbot import ollama

# Captured before any test patches it. `ollama` does a plain `import httpx`, so
# monkeypatching `ollama.httpx.AsyncClient` rebinds the attribute on the httpx
# module itself -- a factory that then called `httpx.AsyncClient` would call
# itself forever.
_REAL_ASYNC_CLIENT = httpx.AsyncClient


def _client_factory(handler):
    def factory(**kwargs):
        kwargs.pop("transport", None)
        return _REAL_ASYNC_CLIENT(transport=httpx.MockTransport(handler), **kwargs)

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
async def test_generate_does_not_send_think_false(monkeypatch) -> None:
    """Measured against qwen3:4b on 2026-08-01, `think: false` does the opposite
    of what it reads like. It does not stop the model reasoning; it stops Ollama
    *separating* the reasoning out, and the chain of thought arrives in
    `message.content` -- i.e. straight onto the visitor's screen:

        think: false  -> content: "Hmm, the user is asking if they can bring..."
        omitted       -> thinking: "Hmm, the user is..."  content: "Yes"

    Latency was the same either way (~10s warm), so the flag bought nothing.
    """
    seen: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["body"] = request.read().decode()
        return httpx.Response(200, json={"message": {"content": "an answer"}})

    monkeypatch.setattr(ollama.httpx, "AsyncClient", _client_factory(handler))
    result = await ollama.generate("be helpful", "what is this")

    assert "think" not in seen["body"]
    assert result == "an answer"


@pytest.mark.anyio
async def test_generate_returns_content_not_reasoning(monkeypatch) -> None:
    """The reasoning trace must never be mistaken for the answer."""

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "message": {
                    "thinking": "Hmm, the user is asking whether it is free. Let me check.",
                    "content": "Yes, everything is free to members.",
                }
            },
        )

    monkeypatch.setattr(ollama.httpx, "AsyncClient", _client_factory(handler))
    result = await ollama.generate("be helpful", "is it free")

    assert result == "Yes, everything is free to members."
    assert "Hmm" not in result


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


# Ollama evicts an idle model after 5 minutes by default. Measured on 2026-08-01,
# reloading qwen3:4b costs ~7.3s on top of ~13s of generation, which pushes a
# mid-band answer past the 20s timeout and degrades it to the curated fallback.
# Demo questions arrive minutes apart, so the default guarantees that eviction.


@pytest.mark.anyio
async def test_generate_keeps_the_model_resident(monkeypatch) -> None:
    seen: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["body"] = request.read().decode()
        return httpx.Response(200, json={"message": {"content": "an answer"}})

    monkeypatch.setattr(ollama.httpx, "AsyncClient", _client_factory(handler))
    await ollama.generate("be helpful", "what is this")

    assert "keep_alive" in seen["body"]


@pytest.mark.anyio
async def test_embed_keeps_the_model_resident(monkeypatch) -> None:
    seen: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["body"] = request.read().decode()
        return httpx.Response(200, json={"embeddings": [[0.1]]})

    monkeypatch.setattr(ollama.httpx, "AsyncClient", _client_factory(handler))
    await ollama.embed("hello")

    assert "keep_alive" in seen["body"]
