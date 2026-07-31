"""FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import participants

settings = get_settings()

app = FastAPI(title="Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(participants.router)


@app.get("/health")
def health() -> dict[str, str | bool]:
    # `database` reports configuration, not reachability -- it never touches the
    # network, so /health stays a cheap liveness probe.
    return {"status": "ok", "database": settings.database_configured}


@app.get("/api/hello")
def hello() -> dict[str, str]:
    """Proves the frontend can reach the backend."""
    return {"message": "Hello from FastAPI"}
