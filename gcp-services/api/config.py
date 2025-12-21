"""Environment configuration for CapMatch API."""

from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # App config
    ENVIRONMENT: str = Field(default="development", description="Environment name")
    VERSION: str = Field(default="1.0.0", description="API version")
    LOG_LEVEL: str = Field(default="INFO", description="Logging level")

    # Server config
    HOST: str = Field(default="0.0.0.0", description="Server host")
    PORT: int = Field(default=8080, description="Server port")

    # Supabase config
    SUPABASE_URL: str = Field(description="Supabase project URL")
    SUPABASE_SERVICE_ROLE_KEY: str = Field(description="Supabase service role key (secret)")
    SUPABASE_ANON_KEY: str = Field(description="Supabase anon key")

    # Google config
    GOOGLE_CLIENT_ID: str = Field(default="", description="Google OAuth client ID")
    GOOGLE_CLIENT_SECRET: str = Field(default="", description="Google OAuth client secret")

    # Gemini config
    GEMINI_API_KEY: str = Field(default="", description="Google Gemini API key")

    # Daily.co config
    DAILY_WEBHOOK_SECRET: str = Field(default="", description="Daily.co webhook secret")

    # CORS config
    CORS_ORIGINS: str = Field(
        default="http://localhost:3000",
        description="Comma-separated list of allowed CORS origins",
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS_ORIGINS string into list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    def validate(self) -> None:
        """Validate required settings."""
        if not self.SUPABASE_URL:
            raise ValueError("SUPABASE_URL is required")
        if not self.SUPABASE_SERVICE_ROLE_KEY:
            raise ValueError("SUPABASE_SERVICE_ROLE_KEY is required")
        if not self.SUPABASE_ANON_KEY:
            raise ValueError("SUPABASE_ANON_KEY is required")


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    settings = Settings()
    settings.validate()
    return settings


# Global settings instance
settings = get_settings()
