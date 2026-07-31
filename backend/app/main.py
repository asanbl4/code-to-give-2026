"""FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.features.instagram.router import router as instagram_router
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

# Feature routers. Add new features under app/features/<name>/ (or app/routers/)
# and register them here.
app.include_router(instagram_router)
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
