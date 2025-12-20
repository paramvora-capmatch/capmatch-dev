"""Environment configuration for renew-calendar-watches."""

import os


class Config:
    """Configuration for renew-calendar-watches scheduled job."""

    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    NEXT_PUBLIC_SITE_URL: str = os.getenv("NEXT_PUBLIC_SITE_URL", "")
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    DRY_RUN: bool = os.getenv("DRY_RUN", "false").lower() == "true"

    @classmethod
    def validate(cls):
        """Validate required configuration."""
        if not cls.SUPABASE_URL:
            raise ValueError("SUPABASE_URL is required")
        if not cls.SUPABASE_SERVICE_ROLE_KEY:
            raise ValueError("SUPABASE_SERVICE_ROLE_KEY is required")
        if not cls.GOOGLE_CLIENT_ID:
            raise ValueError("GOOGLE_CLIENT_ID is required")
        if not cls.GOOGLE_CLIENT_SECRET:
            raise ValueError("GOOGLE_CLIENT_SECRET is required")
        if not cls.NEXT_PUBLIC_SITE_URL:
            raise ValueError("NEXT_PUBLIC_SITE_URL is required")

    @classmethod
    def log_config(cls):
        """Return configuration summary for logging."""
        return (
            f"Configuration:\n"
            f"  SUPABASE_URL: {cls.SUPABASE_URL}\n"
            f"  NEXT_PUBLIC_SITE_URL: {cls.NEXT_PUBLIC_SITE_URL}\n"
            f"  LOG_LEVEL: {cls.LOG_LEVEL}\n"
            f"  DRY_RUN: {cls.DRY_RUN}\n"
        )
