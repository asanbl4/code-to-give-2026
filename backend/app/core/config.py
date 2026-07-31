from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration, read from environment or backend/.env."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- Supabase ---------------------------------------------------------
    supabase_url: str
    # Safe to expose to browsers; RLS is what protects the data.
    supabase_publishable_key: str
    # Bypasses RLS. Server-side only, never ship this to a client.
    supabase_secret_key: str = ""
    # Only needed for legacy projects still signing JWTs with HS256.
    # Projects created after the asymmetric-key rollout should leave this empty.
    supabase_jwt_secret: str = ""

    # --- App --------------------------------------------------------------
    environment: str = "development"
    jwt_audience: str = "authenticated"
    # Comma-separated. Kept as a string because pydantic-settings expects JSON
    # for list-typed fields, which is a sharp edge in .env files.
    cors_origins: str = "http://localhost:3000"

    @field_validator("supabase_url")
    @classmethod
    def _strip_trailing_slash(cls, value: str) -> str:
        return value.rstrip("/")

    @property
    def jwks_url(self) -> str:
        return f"{self.supabase_url}/auth/v1/.well-known/jwks.json"

    @property
    def jwt_issuer(self) -> str:
        return f"{self.supabase_url}/auth/v1"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]  # values come from env/.env
