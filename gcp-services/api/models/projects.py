"""Pydantic models for project operations."""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# ============================================================================
# Create Project Models
# ============================================================================

class CreateProjectRequest(BaseModel):
    """Request model for creating a new project."""

    name: str = Field(..., description="Project name")
    owner_org_id: str = Field(..., description="Organization ID that owns the project")
    assigned_advisor_id: Optional[str] = Field(
        default=None,
        description="Advisor user ID to assign to the project"
    )
    address: Optional[str] = Field(
        default=None,
        description="Property address (street)"
    )


class CreateProjectResponse(BaseModel):
    """Response model for project creation."""

    project: Dict[str, Any] = Field(..., description="Created project record")
    borrowerResumeContent: Dict[str, Any] = Field(
        default={},
        description="Initial borrower resume content (copied from most complete resume)"
    )
    borrowerResumeSourceProjectId: Optional[str] = Field(
        default=None,
        description="Source project ID from which borrower resume was copied"
    )


# ============================================================================
# Update Project Models
# ============================================================================

class CoreUpdates(BaseModel):
    """Core project field updates."""

    name: Optional[str] = Field(default=None, description="Updated project name")
    assigned_advisor_id: Optional[str] = Field(
        default=None,
        description="Updated advisor user ID"
    )


class UpdateProjectRequest(BaseModel):
    """Request model for updating a project."""

    project_id: str = Field(..., description="Project ID to update")
    core_updates: Optional[CoreUpdates] = Field(
        default=None,
        description="Updates to core project fields (name, advisor)"
    )
    resume_updates: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Updates to project resume JSONB content (partial merge)"
    )


class UpdateProjectResponse(BaseModel):
    """Response model for project update."""

    ok: bool = Field(default=True, description="Success indicator")


# ============================================================================
# Copy Borrower Profile Models
# ============================================================================

class CopyBorrowerProfileRequest(BaseModel):
    """Request model for copying borrower profile between projects."""

    source_project_id: str = Field(..., description="Source project ID to copy from")
    target_project_id: str = Field(..., description="Target project ID to copy to")


class CopyBorrowerProfileResponse(BaseModel):
    """Response model for copying borrower profile."""

    success: bool = Field(default=True, description="Success indicator")
    borrowerResumeContent: Dict[str, Any] = Field(
        default={},
        description="Copied borrower resume content"
    )
    sourceProjectId: str = Field(..., description="Source project ID")
