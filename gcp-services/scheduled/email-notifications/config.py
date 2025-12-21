"""Configuration for email-notifications service."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Optional


# In the container, WORKDIR is /app and this file lives at /app/config.py.
APP_ROOT = Path(__file__).resolve().parent
DEFAULT_DIGEST_TEMPLATE_PATH = (
    APP_ROOT.parent.parent / "packages" / "email-templates" / "dist" / "digest-template.html"
)


class Config:
    """Environment-driven configuration."""

    # Supabase
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    # Email / Resend
    RESEND_API_KEY: Optional[str] = os.getenv("RESEND_API_KEY")
    EMAIL_FROM: str = os.getenv("EMAIL_FROM", "notifications@capmatch.com")
    RESEND_TEST_MODE: bool = os.getenv("RESEND_TEST_MODE", "true").lower() == "true"
    RESEND_TEST_RECIPIENT: Optional[str] = os.getenv("RESEND_TEST_RECIPIENT")
    RESEND_FORCE_TO_EMAIL: Optional[str] = os.getenv("RESEND_FORCE_TO_EMAIL")

    # Behaviour
    DRY_RUN: bool = os.getenv("EMAIL_NOTIFICATIONS_DRY_RUN", "true").lower() == "true"

    # Template configuration
    DIGEST_TEMPLATE_PATH: str = os.getenv(
        "DIGEST_TEMPLATE_PATH",
        str(DEFAULT_DIGEST_TEMPLATE_PATH),
    )

    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

    @classmethod
    def validate(cls) -> None:
        if not cls.SUPABASE_URL:
            raise ValueError("SUPABASE_URL environment variable is required")
        if not cls.SUPABASE_SERVICE_ROLE_KEY:
            raise ValueError("SUPABASE_SERVICE_ROLE_KEY environment variable is required")