"""Configuration for notify-fan-out service."""

from __future__ import annotations

import os


class Config:
    """Environment-driven configuration."""

    # Supabase
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    # Job Configuration
    BATCH_SIZE: int = int(os.getenv("NOTIFY_FANOUT_BATCH_SIZE", "500"))
    DRY_RUN: bool = os.getenv("NOTIFY_FANOUT_DRY_RUN", "true").lower() == "true"
    MAX_EVENT_AGE_HOURS: int = int(os.getenv("NOTIFY_FANOUT_MAX_EVENT_AGE_HOURS", "24"))

    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

    @classmethod
    def validate(cls) -> None:
        """Validate required configuration values."""
        if not cls.SUPABASE_URL:
            raise ValueError("SUPABASE_URL environment variable is required")
        if not cls.SUPABASE_SERVICE_ROLE_KEY:
            raise ValueError("SUPABASE_SERVICE_ROLE_KEY environment variable is required")

    @classmethod
    def log_config(cls) -> str:
        """Return a string representation of configuration (safe for logging)."""
        return (
            f"Config: BATCH_SIZE={cls.BATCH_SIZE}, "
            f"DRY_RUN={cls.DRY_RUN}, "
            f"MAX_EVENT_AGE_HOURS={cls.MAX_EVENT_AGE_HOURS}, "
            f"LOG_LEVEL={cls.LOG_LEVEL}, "
            f"SUPABASE_URL={cls.SUPABASE_URL[:30]}..." if cls.SUPABASE_URL else "SUPABASE_URL=not set"
        )

