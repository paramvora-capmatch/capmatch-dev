# Lender Setup Guide

This guide explains how to set up and test lender functionality in CapMatch.

## Overview

Lenders are a distinct user type that can:
- View borrower resumes and project resumes (read-only)
- Participate in project chat
- Manage their own organization and team members
- Receive notifications

Lenders **cannot**:
- Access project documents
- Invite others to projects
- Edit resumes or project details

## Database Setup

### 1. Run the Migration

The lender access migration should already be applied:

```bash
# Migration file: supabase/migrations/20260115000000_lender_access.sql
```

This creates:
- `lender_project_access` table
- RLS policies for lender access
- Helper functions: `grant_lender_project_access`, `revoke_lender_project_access`, `is_lender_with_project_access`

**Note:** The migration assumes `borrower_resumes` are project-scoped (have `project_id` column, not `org_id`). This matches the schema after migration `20251107090000_project_scoped_borrower_resumes.sql`.

### 2. Add Seed Data

Load sample lender data for testing:

```bash
# From Supabase CLI
supabase db reset  # Runs all migrations
psql $DATABASE_URL -f supabase/lender_seed.sql

# Or from psql
\i supabase/lender_seed.sql
```

This creates:
- Lender user: `lender@example.com` / `password`
- Lender team member: `lender.analyst@example.com` / `password`
- Lender org: "Capital Lending Group"
- Access grant to the demo project

## Granting Lender Access

### Using the Helper Script

```bash
# Grant access
npm run lender:grant grant <lender_org_id> <project_id>

# Example (using seed data IDs):
npm run lender:grant grant aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa d231b8bc-2239-4365-87a1-dc67bd795604

# List all access grants
npm run lender:grant list

# List access for specific lender org
npm run lender:grant list aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa

# Revoke access
npm run lender:grant revoke <lender_org_id> <project_id>
```

### Using SQL Directly

```sql
-- Grant access
SELECT public.grant_lender_project_access(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,  -- lender_org_id
  'd231b8bc-2239-4365-87a1-dc67bd795604'::uuid,  -- project_id
  'f85936ae-02c2-4006-9065-59caf2ad26cb'::uuid   -- granted_by (admin user_id)
);

-- Revoke access
SELECT public.revoke_lender_project_access(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'd231b8bc-2239-4365-87a1-dc67bd795604'::uuid
);

-- List access grants
SELECT * FROM public.lender_project_access;
```

### Using the Backend API (Future)

Once the FastAPI backend endpoints are implemented:

```bash
curl -X POST http://localhost:8000/api/v1/admin/grant-lender-project-access \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "lender_org_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "project_id": "d231b8bc-2239-4365-87a1-dc67bd795604"
  }'
```

## Testing Lender Flows

### 1. Login as Lender

```
Email: lender@example.com
Password: password
```

Expected: Redirect to `/lender/dashboard`

### 2. Lender Dashboard

- Should display list of projects the lender has access to
- Click on a project card to view details

### 3. Project View

Navigate to a project from the dashboard. You should see:
- Three tabs: Project Resume, Borrower Resume, Chat
- Read-only view of resumes (no edit buttons)
- Full chat functionality
- Blue info banner indicating read-only access

### 4. Team Management

Navigate to `/team`:
- Should see lender org members
- Can invite team members to the org (no project-specific permissions)
- Info message explains project-level invites not available

### 5. Verify Access Control

Try to:
- ❌ Access `/documents` - should redirect or 404
- ❌ Access `/project/workspace/:id` - should redirect (borrower-only)
- ❌ Edit resumes - no edit buttons should be visible
- ✅ Send chat messages - should work
- ✅ Receive notifications - should work

### 6. Team Member Testing

Login as lender team member:

```
Email: lender.analyst@example.com
Password: password
```

Should have same access as the owner lender user (can view granted projects).

## Troubleshooting

### Lender can't see projects

Check if access has been granted:

```sql
SELECT * FROM public.lender_project_access 
WHERE lender_org_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
```

### RLS errors

Verify the migration ran successfully:

```sql
-- Check if table exists
\d public.lender_project_access

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'lender_project_access';

-- Check policies
\d+ public.lender_project_access
```

### Access denied errors

Ensure the lender profile has:
- `app_role = 'lender'`
- `active_org_id` set to their lender org
- Membership in `org_members` table

```sql
SELECT * FROM public.profiles WHERE id = '11111111-1111-1111-1111-111111111111';
SELECT * FROM public.org_members WHERE user_id = '11111111-1111-1111-1111-111111111111';
```

## Creating Additional Lenders

### Via Backend API (Recommended, once implemented)

```bash
curl -X POST http://localhost:8000/api/v1/users/onboard-lender \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newlender@example.com",
    "password": "securepassword",
    "full_name": "New Lender LLC",
    "org_name": "New Lender LLC"
  }'
```

### Manually via SQL

```sql
-- 1. Create auth user
INSERT INTO auth.users (/* ... see lender_seed.sql for full schema ... */)
VALUES (/* ... */);

-- 2. Create lender org
INSERT INTO public.orgs (id, name, entity_type)
VALUES (gen_random_uuid(), 'Lender Name', 'lender');

-- 3. Create profile
INSERT INTO public.profiles (id, email, full_name, app_role, active_org_id)
VALUES (/* user_id */, 'email@example.com', 'Full Name', 'lender', /* org_id */);

-- 4. Add to org_members
INSERT INTO public.org_members (org_id, user_id, role)
VALUES (/* org_id */, /* user_id */, 'owner');

-- 5. Grant project access
SELECT grant_lender_project_access(/* lender_org_id */, /* project_id */, /* granted_by */);
```

## Next Steps

- Implement backend endpoints (see `docs/LENDER_BACKEND_SPEC.md`)
- Add lender matching/filtering UI
- Implement lender profile/criteria
- Add borrower-initiated lender invites
