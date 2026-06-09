"""Application configuration loaded from environment / .env."""
from __future__ import annotations

from functools import lru_cache

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # App
    app_name: str = "AI Commerce OS"
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"
    cors_origins: str = "http://localhost:3000"

    # Database
    database_url: str = "postgresql+asyncpg://commerce:commerce@localhost:5432/commerce"
    database_url_sync: str = "postgresql+psycopg://commerce:commerce@localhost:5432/commerce"

    # Redis / Celery
    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/1"
    celery_result_backend: str = "redis://localhost:6379/2"
    # When true, Celery tasks run inline in-process (no broker needed). Use for
    # local/no-Docker dev so integration syncs run without Redis/a worker.
    celery_task_always_eager: bool = False

    # Security
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 14
    encryption_key: str = ""

    # First super-admin (seeded on startup)
    superadmin_email: str = "admin@commerceos.ai"
    superadmin_password: str = "change-me-strong-password"
    superadmin_name: str = "Platform Owner"

    # Anthropic
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-opus-4-8"
    ai_max_tokens: int = 1024

    # Sync
    sync_interval_minutes: int = 60
    # Local (no-Celery-beat) auto-sync: a background thread inside the API
    # process polls connected integrations on this interval. Used in local mode
    # as the real-time fallback until Shopify webhooks are reachable (deploy).
    local_scheduler_enabled: bool = True
    local_sync_interval_minutes: int = 10
    # Public base URL where Shopify can reach this server's webhook endpoint,
    # e.g. https://abc123.ngrok.app . Empty locally → webhooks not registered
    # and the scheduler handles refresh instead.
    public_webhook_base_url: str = ""

    # SMTP (optional)
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "no-reply@commerceos.ai"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @model_validator(mode="after")
    def _guard_production_secrets(self) -> "Settings":
        """In production, refuse to boot with default/empty secrets."""
        if self.environment.lower() == "production":
            weak: list[str] = []
            if self.jwt_secret in ("", "change-me-in-production"):
                weak.append("JWT_SECRET")
            if not self.encryption_key:
                weak.append("ENCRYPTION_KEY")
            if self.superadmin_password in ("", "change-me-strong-password"):
                weak.append("SUPERADMIN_PASSWORD")
            if weak:
                raise ValueError(
                    "Refusing to start in production with default/empty secrets: "
                    + ", ".join(weak)
                    + ". Set strong values (see backend/.env.production.example)."
                )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
