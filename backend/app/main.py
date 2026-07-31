from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.security import TokenVerifier
from app.routers import health, me


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    # Built once so the JWKS cache is shared across every request.
    app.state.token_verifier = TokenVerifier(
        jwks_url=settings.jwks_url,
        issuer=settings.jwt_issuer,
        audience=settings.jwt_audience,
        hs256_secret=settings.supabase_jwt_secret,
    )
    yield


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="FastAPI + Supabase Auth",
        description="Stateless API authenticated by Supabase-issued JWTs.",
        version="0.1.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router)
    app.include_router(me.router)

    return app


app = create_app()
