"""FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth import CurrentUser, UserRoles
from app.config import get_settings
from app.features.chatbot.router import router as chatbot_router
from app.features.instagram.router import router as instagram_router
from app.routers import admin, participants, photos, volunteers

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
app.include_router(photos.router)
app.include_router(admin.router)
app.include_router(volunteers.router)
app.include_router(volunteers.admin_router)
app.include_router(chatbot_router)


@app.get("/health")
def health() -> dict[str, str | bool]:
    # `database` reports configuration, not reachability -- it never touches the
    # network, so /health stays a cheap liveness probe.
    return {"status": "ok", "database": settings.database_configured}


@app.get("/api/hello")
def hello() -> dict[str, str]:
    """Proves the frontend can reach the backend."""
    return {"message": "Hello from FastAPI"}


@app.get("/api/me")
def me(user: CurrentUser, roles: UserRoles) -> dict[str, object]:
    """Who am I, and what may I do.

    The frontend calls this after a magic link resolves, to decide whether to
    show the staff tool. `roles` comes from `public.user_roles` via the caller's
    own RLS-scoped client -- not from a claim in the token.
    """
    return {
        "id": user.id,
        "email": user.email,
        "roles": sorted(roles),
        "is_staff": bool(roles & {"admin", "editor"}),
    }
