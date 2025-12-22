"""Pydantic models for user management endpoints."""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class FilePermissionOverride(BaseModel):
    """File-level permission override."""

    resource_id: str = Field(..., description="Resource ID")
    permission: str = Field(..., description="Permission level: 'none', 'view', or 'edit'")


class PermissionGrant(BaseModel):
    """Permission grant for a resource type."""

    resource_type: str = Field(..., description="Resource type (e.g., 'PROJECT_RESUME', 'PROJECT_DOCS_ROOT')")
    permission: str = Field(..., description="Permission level: 'view' or 'edit'")


class ProjectGrant(BaseModel):
    """Project-level grant with permissions and file overrides."""

    projectId: str = Field(..., description="Project ID")
    permissions: List[PermissionGrant] = Field(..., description="List of resource type permissions")
    fileOverrides: Optional[List[FilePermissionOverride]] = Field(
        None, description="Per-file permission overrides"
    )
    exclusions: Optional[List[str]] = Field(
        None, description="Legacy: list of resource IDs to exclude (mapped to permission 'none')"
    )


class OrgGrant(BaseModel):
    """Organization-level grant (currently only supports file overrides)."""

    permissions: Optional[List[PermissionGrant]] = Field(
        None, description="Organization-level resource type permissions"
    )
    fileOverrides: Optional[List[FilePermissionOverride]] = Field(
        None, description="Organization-level file permission overrides"
    )


class UpdateMemberPermissionsRequest(BaseModel):
    """Request model for update-member-permissions endpoint."""

    org_id: str = Field(..., description="Organization ID")
    user_id: str = Field(..., description="User ID whose permissions are being updated")
    project_grants: Optional[List[ProjectGrant]] = Field(
        None, description="List of project-level grants"
    )
    org_grants: Optional[OrgGrant] = Field(None, description="Organization-level grants")


class UpdateMemberPermissionsResponse(BaseModel):
    """Response model for update-member-permissions endpoint."""

    success: bool = Field(default=True, description="Success indicator")
    message: str = Field(default="Permissions updated successfully", description="Success message")

