# Lender Backend API Specification

This document specifies the FastAPI backend endpoints required for lender functionality.

## Endpoints to Implement

### 1. POST /api/v1/users/onboard-lender

Onboard a new lender user and create their lender organization.

**Request Body:**
```json
{
  "email": "lender@example.com",
  "password": "securepassword",
  "full_name": "John Doe",
  "org_name": "Acme Lending",
  "existing_user": false,
  "user_id": "uuid-if-existing"
}
```

**Response:**
```json
{
  "user": {
    "id": "user-uuid",
    "email": "lender@example.com"
  },
  "org": {
    "id": "org-uuid",
    "name": "Acme Lending"
  }
}
```

**Implementation:**
1. If `existing_user` is true, use `user_id` and skip Supabase auth creation
2. Otherwise, create user in Supabase Auth with email/password
3. Create profile with `app_role = 'lender'`
4. Create org with `entity_type = 'lender'` and name `org_name` (or default to "{full_name}'s Organization")
5. Add user to org_members with `role = 'owner'`
6. Set `active_org_id` in profile to the new org
7. Return user and org data

### 2. POST /api/v1/admin/grant-lender-project-access

Grant a lender org access to a specific project (admin/backend use only).

**Request Body:**
```json
{
  "lender_org_id": "lender-org-uuid",
  "project_id": "project-uuid"
}
```

**Response:**
```json
{
  "access_id": "access-grant-uuid",
  "message": "Lender access granted successfully"
}
```

**Implementation:**
1. Verify the lender_org exists and is of type 'lender'
2. Verify the project exists
3. Call the Supabase RPC function `grant_lender_project_access(lender_org_id, project_id, granted_by_user_id)`
4. Return the access grant ID

**Authentication:**
- Requires service role or admin privileges
- Should NOT be exposed to regular users

### 3. POST /api/v1/admin/revoke-lender-project-access

Revoke a lender org's access to a project (admin/backend use only).

**Request Body:**
```json
{
  "lender_org_id": "lender-org-uuid",
  "project_id": "project-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Lender access revoked successfully"
}
```

**Implementation:**
1. Call the Supabase RPC function `revoke_lender_project_access(lender_org_id, project_id)`
2. Return success status

**Authentication:**
- Requires service role or admin privileges
- Should NOT be exposed to regular users

## Database Functions Available

The following Postgres functions are available (created by migration 20260115000000_lender_access.sql):

### grant_lender_project_access(p_lender_org_id UUID, p_project_id UUID, p_granted_by UUID)
- Inserts or updates lender_project_access record
- Returns access_id
- Raises exception if org is not type 'lender' or project doesn't exist

### revoke_lender_project_access(p_lender_org_id UUID, p_project_id UUID)
- Deletes lender_project_access record
- Returns boolean indicating if row was deleted

### is_lender_with_project_access(p_user_id UUID, p_project_id UUID)
- Checks if a lender user has access to a project
- Used internally by RLS policies

## Alternative: Generalize onboard-borrower

Instead of creating a separate `onboard-lender` endpoint, you could extend the existing `onboard-borrower` endpoint to accept an optional `role` parameter:

```python
@router.post("/onboard-borrower")
async def onboard_user(
    email: str,
    password: str,
    full_name: str,
    role: str = "borrower",  # Can be "borrower", "lender", or "advisor"
    org_name: Optional[str] = None,
    ...
):
    # Validate role is one of: borrower, lender, advisor
    if role not in ["borrower", "lender", "advisor"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    # Create user, profile with app_role=role
    # Create org with entity_type=role
    # ...
```

This approach is cleaner and reduces code duplication.
