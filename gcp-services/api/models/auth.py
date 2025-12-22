"""Pydantic models for authentication endpoints."""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class ValidateInviteRequest(BaseModel):
    """Request model for validate-invite endpoint."""

    token: str = Field(..., description="Invite token to validate")


class ValidateInviteResponse(BaseModel):
    """Response model for validate-invite endpoint."""

    valid: bool = Field(..., description="Whether the invite token is valid")
    orgName: Optional[str] = Field(None, description="Organization name")
    inviterName: Optional[str] = Field(None, description="Name of person who sent invite")
    email: Optional[str] = Field(None, description="Invited email address")


class InviteUserRequest(BaseModel):
    """Request model for invite-user endpoint."""

    email: str = Field(..., description="Email address to invite")
    org_id: str = Field(..., description="Organization ID")
    role: str = Field(default="member", description="Role to assign (owner/member)")
    project_grants: Optional[List[Any]] = Field(None, description="Project-level grants (array of grant objects)")
    org_grants: Optional[dict] = Field(None, description="Organization-level grants")


class InviteUserResponse(BaseModel):
    """Response model for invite-user endpoint."""

    token: str = Field(..., description="Invite token")
    expires_at: str = Field(..., description="Expiration timestamp")
    invite_id: str = Field(..., description="Invite ID")


class RemoveUserRequest(BaseModel):
    """Request model for remove-user endpoint."""

    user_id: str = Field(..., description="User ID to remove")
    org_id: str = Field(..., description="Organization ID")


class RemoveUserResponse(BaseModel):
    """Response model for remove-user endpoint."""

    success: bool = Field(..., description="Whether removal was successful")
    message: str = Field(..., description="Success or error message")


class AcceptInviteRequest(BaseModel):
    """Request model for accept-invite endpoint."""

    token: str = Field(..., description="Invite token")
    password: str = Field(..., description="Password for new user account (min 8 chars)")
    full_name: str = Field(..., description="Full name of the new user")
    accept: bool = Field(default=True, description="Whether to accept the invite (defaults to True)")


class AcceptInviteResponse(BaseModel):
    """Response model for accept-invite endpoint."""

    status: str = Field(..., description="Status of the invite acceptance (accepted or cancelled)")


class OnboardBorrowerRequest(BaseModel):
    """Request model for onboard-borrower endpoint."""

    email: str = Field(..., description="Email address for the user")
    password: Optional[str] = Field(None, description="Password for new user (required if existing_user=False)")
    full_name: str = Field(..., description="Full name of the user")
    existing_user: bool = Field(default=False, description="Whether to use an existing user")
    user_id: Optional[str] = Field(None, description="User ID (required if existing_user=True)")


class OnboardBorrowerResponse(BaseModel):
    """Response model for onboard-borrower endpoint."""

    user: Dict[str, Any] = Field(..., description="Created or existing user object")
