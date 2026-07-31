"""Application settings, read once from the environment and cached."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Everything the app reads from the environment.

    Every Supabase field defaults to empty. The app boots without them; only
    the database-backed routes go dark. That is deliberate — a teammate who
    pulls this branch without credentials still gets a working `/health` and
    `/api/hello` rather than a crash on import.
    """

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Comma-separated list of origins allowed to call this API from a browser.
    cors_origins: str = "http://localhost:3000"

    supabase_url: str = ""
    # Safe to expose to browsers. RLS is what protects the data behind it.
    supabase_publishable_key: str = ""
    # Bypasses RLS entirely. Server-side only, never sent to a client.
    supabase_secret_key: str = ""

    # --- Instagram feature -------------------------------------------------
    # Long-lived Instagram Graph API token. When empty, the feature serves
    # bundled sample data instead of calling Instagram (see features/instagram).
    instagram_access_token: str | None = None
    # Whose media to read. "me" resolves to the token's own account.
    instagram_user_id: str = "me"
    instagram_graph_host: str = "https://graph.instagram.com"
    # How long a live fetch is reused before hitting Instagram again (seconds).
    instagram_cache_ttl_seconds: int = 300
    # How many posts to pull per live fetch.
    instagram_fetch_count: int = 25

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def database_configured(self) -> bool:
        return bool(self.supabase_url and self.supabase_publishable_key)

    @property
    def admin_database_configured(self) -> bool:
        return bool(self.supabase_url and self.supabase_secret_key)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
