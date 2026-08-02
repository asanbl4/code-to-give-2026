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
    "and make sure Ollama is running -- see the Chatbot section of AGENTS.md."
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
