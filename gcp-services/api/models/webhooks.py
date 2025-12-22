"""Pydantic models for webhook endpoints."""

from typing import Any, Dict

from pydantic import BaseModel


class DailyWebhookPayload(BaseModel):
    """Daily.co webhook payload - flexible structure to accept any Daily.co event."""

    type: str
    event: str
    payload: Dict[str, Any]

    class Config:
        extra = "allow"  # Allow extra fields for flexibility


class DailyWebhookResponse(BaseModel):
    """Response model for Daily.co webhook."""

    received: bool = True
    duplicate: bool = False

