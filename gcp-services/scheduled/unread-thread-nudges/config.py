"""Environment configuration for unread-thread-nudges."""

import os
from typing import Optional


class Config:
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    DRY_RUN: bool = os.getenv("DRY_RUN", "false").lower() == "true"
    THRESHOLD_MINUTES: int = int(os.getenv("THRESHOLD_MINUTES", "180"))  # Default: 3 hours

    @classmethod
    def validate(cls):
        if not cls.SUPABASE_URL:
            raise ValueError("SUPABASE_URL is required")
        if not cls.SUPABASE_SERVICE_ROLE_KEY:
            raise ValueError("SUPABASE_SERVICE_ROLE_KEY is required")

    @classmethod
    def log_config(cls):
        return (
            f"Configuration:\n"
            f"  SUPABASE_URL: {cls.SUPABASE_URL}\n"
            f"  LOG_LEVEL: {cls.LOG_LEVEL}\n"
            f"  DRY_RUN: {cls.DRY_RUN}\n"
            f"  THRESHOLD_MINUTES: {cls.THRESHOLD_MINUTES}\n"
        )
