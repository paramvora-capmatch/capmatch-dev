"""Pydantic models for chat thread operations."""

from typing import List, Optional

from pydantic import BaseModel, Field


class ManageChatThreadRequest(BaseModel):
    """Request model for managing chat threads."""

    action: str = Field(
        ..., description="Action to perform: 'create', 'add_participant', 'remove_participant', 'get_thread'"
    )
    thread_id: Optional[str] = Field(None, description="Thread ID (required for add_participant, remove_participant)")
    project_id: Optional[str] = Field(None, description="Project ID (required for create, get_thread)")
    topic: Optional[str] = Field(None, description="Thread topic (optional for create)")
    participant_ids: Optional[List[str]] = Field(None, description="List of participant user IDs")


class ManageChatThreadResponse(BaseModel):
    """Response model for chat thread operations."""

    thread_id: Optional[str] = Field(None, description="Thread ID (for create action)")
    thread: Optional[dict] = Field(None, description="Thread data (for get_thread action)")
    message: str = Field(..., description="Success message")

