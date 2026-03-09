"""Centralised settings — loaded once and cached."""
from __future__ import annotations
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Supabase
    supabase_url: str = ""
    supabase_service_role_key: str = ""

    # Resend
    resend_api_key: str = ""
    email_from: str = ""
    email_from_name: str = "VaccineTrack"

    # Green API - WhatsApp
    green_api_instance_id: str = ""
    green_api_token: str = ""
    # Base URL format: https://api.green-api.com/waInstance{id}/{method}/{token}
    green_api_base_url: str = "https://api.green-api.com"


    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    cors_origins: str = "http://localhost:5173"

    # Reminders
    reminder_days_ahead: int = 7
    scheduler_secret: str = "change-me"

    # Chatbot
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"

    # ── Computed props ────────────────────────────────────────
    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def resend_configured(self) -> bool:
        return bool(self.resend_api_key)

    @property
    def green_api_configured(self) -> bool:
        return bool(self.green_api_instance_id and self.green_api_token)

    @property
    def gemini_configured(self) -> bool:
        return bool(self.gemini_api_key)

@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
