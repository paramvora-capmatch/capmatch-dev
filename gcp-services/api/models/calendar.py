"""Pydantic models for calendar operations."""

from pydantic import BaseModel, Field


class UpdateCalendarResponseRequest(BaseModel):
    """Request model for updating calendar response status."""

    meeting_id: str = Field(..., description="Meeting ID")
    user_id: str = Field(..., description="User ID (must match authenticated user)")
    status: str = Field(
        ...,
        description="Response status: 'accepted', 'declined', 'tentative', or 'pending'",
    )


class UpdateCalendarResponseResponse(BaseModel):
    """Response model for calendar response update."""

    message: str = Field(..., description="Success message")

