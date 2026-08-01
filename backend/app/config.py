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
    # 1.7b, not 4b: a 4GB GPU cannot hold qwen3:4b (3.5GB) and bge-m3 (0.66GB)
    # at once, and the two then evict each other on every request. See the
    # feature README. On a bigger GPU, qwen3:4b is a drop-in upgrade.
    chatbot_model: str = "qwen3:1.7b"
    chatbot_embed_model: str = "bge-m3"
    # The ONLY threshold left. A question must score at least this against a
    # refusal entry's triggers to be treated as medical or self-harm and
    # answered by a person's words instead of the model.
    #
    # Measured against real bge-m3 scores on 2026-08-01 via
    # `build_index --scores`, not guessed. It has to sit between:
    #   0.728  "I feel like ending it"      -> must refuse (the 999 handoff)
    #   0.427  "what is the weather in Tokyo" -> must NOT refuse; answering an
    #          off-topic question with crisis text reads as broken and cheapens
    #          the answer for whoever actually needs it.
    # 0.55 sits in that gap with room either side.
    #
    # Lower this if a real distress phrasing is getting through; raise it only
    # with evidence that ordinary questions are being caught.
    chatbot_refusal_confidence: float = 0.55
    # A demo must never hang: abandon generation past this and fall back.
    chatbot_timeout_seconds: float = 20.0
    # How long Ollama keeps a model in memory after a request. Its default of
    # 5m is shorter than the gaps between questions in a demo, and reloading
    # qwen3:4b measured ~7.3s on top of ~13s of generation on 2026-08-01 --
    # enough to cross chatbot_timeout_seconds and degrade the answer.
    chatbot_keep_alive: str = "30m"

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
