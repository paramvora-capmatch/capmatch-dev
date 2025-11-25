"""Configuration and environment variables for email digest worker."""

import os
from typing import Optional


class Config:
    """Application configuration loaded from environment variables."""
    
    # Supabase configuration
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    
    # Email configuration (for future use)
    RESEND_API_KEY: Optional[str] = os.getenv("RESEND_API_KEY")
    EMAIL_FROM: str = os.getenv("EMAIL_FROM", "notifications@capmatch.com")
    
    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    # Job configuration
    MAX_RETRIES: int = int(os.getenv("MAX_RETRIES", "3"))
    
    @classmethod
    def validate(cls) -> None:
        """Validate that required configuration is present."""
        if not cls.SUPABASE_URL:
            raise ValueError("SUPABASE_URL environment variable is required")
        if not cls.SUPABASE_SERVICE_ROLE_KEY:
            raise ValueError("SUPABASE_SERVICE_ROLE_KEY environment variable is required")
    
    @classmethod
    def get_digest_date(cls) -> str:
        """Get yesterday's date in YYYY-MM-DD format (UTC)."""
        from datetime import datetime, timedelta
        yesterday = datetime.utcnow() - timedelta(days=1)
        return yesterday.strftime("%Y-%m-%d")

