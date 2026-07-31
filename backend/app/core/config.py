"""Application settings, loaded once from the environment / `.env`.

Every feature reads its configuration from the single `settings` object exported
here rather than calling `os.getenv` directly. That keeps all configuration in
one discoverable place as more features are added.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )
    cors_origins: str = "http://localhost:3000"

    # --- Instagram feature ------------------------------------------------
    instagram_access_token: str | None = None
    instagram_user_id: str = "me"
    instagram_graph_host: str = "https://graph.instagram.com"
    instagram_cache_ttl_seconds: int = 300
    instagram_fetch_count: int = 25

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
