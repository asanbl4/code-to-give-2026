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

    # --- Chatbot feature ---------------------------------------------------
    # false hides the launcher and makes /api/chat return 503. The rest of the
    # site is unaffected -- the same "a fresh clone still runs" shape as the
    # blank Supabase variables above.
    chatbot_enabled: bool = True
    # 127.0.0.1 rather than localhost: Node and Python may resolve localhost to
    # ::1, which Ollama does not bind by default.
    ollama_host: str = "http://127.0.0.1:11434"
    chatbot_model: str = "qwen3:4b"
    chatbot_embed_model: str = "bge-m3"
    # Both measured against real bge-m3 scores on 2026-08-01 (6 seed entries,
    # 44 triggers) via `build_index --scores`, not guessed:
    #
    #   on-topic  0.956 / 0.927 / 0.926 / 0.853, and 0.657 for a question the
    #             corpus does not yet cover (volunteering)
    #   off-topic 0.427 ("what is the weather in Tokyo")
    #
    # Cosine score at or above which a curated answer is returned verbatim.
    # Nothing measured falls between 0.75 and 0.853, so this is unforced.
    chatbot_high_confidence: float = 0.75
    # Below this, we refuse rather than guess. 0.55 sits in the middle of the
    # measured 0.427-0.657 gap; the original 0.45 cleared the off-topic probe
    # by only 0.023, and bge-m3 scores run high enough that a different
    # off-topic question would have crossed it. Re-measure once Task 11 fills
    # the corpus out -- ~35 entries compete differently.
    chatbot_low_confidence: float = 0.55
    # A demo must never hang: abandon generation past this and fall back.
    chatbot_timeout_seconds: float = 20.0

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
