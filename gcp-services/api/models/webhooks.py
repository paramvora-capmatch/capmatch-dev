"""Pydantic models for webhook endpoints."""

from typing import Any, Dict, Optional

from pydantic import BaseModel


class DailyWebhookPayload(BaseModel):
    """Daily.co webhook payload - flexible structure to accept any Daily.co event."""

    type: Optional[str] = None
    event: Optional[str] = None
    payload: Optional[Dict[str, Any]] = None

    class Config:
        extra = "allow"  # Allow extra fields for flexibility


class DailyWebhookResponse(BaseModel):
    """Response model for Daily.co webhook."""

    received: bool = True
    duplicate: bool = False

