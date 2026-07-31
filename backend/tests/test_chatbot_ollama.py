"""The only module that talks to Ollama, tested without Ollama.

httpx.MockTransport lets us assert on the exact request body -- which matters
for `think: false`, without which qwen3 adds 10-20s of reasoning to every answer.
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
