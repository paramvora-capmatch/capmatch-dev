"""Environment configuration for meeting-reminders."""

import os


class Config:
    """Configuration for meeting-reminders scheduled job."""

    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    DRY_RUN: bool = os.getenv("DRY_RUN", "false").lower() == "true"

    @classmethod
    def validate(cls):
        """Validate required configuration."""
        if not cls.SUPABASE_URL:
            raise ValueError("SUPABASE_URL is required")
        if not cls.SUPABASE_SERVICE_ROLE_KEY:
            raise ValueError("SUPABASE_SERVICE_ROLE_KEY is required")

    @classmethod
    def log_config(cls):
        """Return configuration summary for logging."""
        return (
            f"Configuration:\n"
            f"  SUPABASE_URL: {cls.SUPABASE_URL}\n"
            f"  LOG_LEVEL: {cls.LOG_LEVEL}\n"
            f"  DRY_RUN: {cls.DRY_RUN}\n"
        )
