# RBAC Simplification and Migration Cleanup Plan

This document outlines the step-by-step process to refactor the existing RBAC (Role-Based Access Control) system to a simpler, two-role model (`owner` and `member`) and to clean up conflicting and redundant database migrations.

### Current State Analysis

The current Supabase schema is suffering from several conflicting migration files. Specifically, a hierarchical, resource-based permission model is clashing with a separate, entity-based model. This conflict is the likely root cause of permission-related bugs, such as the inability for organization owners to upload documents.

**The Goal:** Simplify the RBAC system to two roles, fix the underlying migration conflicts, and consolidate all permission logic into a single, understandable source of truth.

---

### Implementation Steps

We will proceed with the following steps. Each step is designed to be a logical, verifiable unit of work.

#### Step 1: Delete Conflicting and Redundant Migrations

The first and most critical step is to remove the files that are causing conflicts or are no longer needed after consolidation.

**Action:**
Delete the following files from the `supabase/migrations/` directory:
- `20251014010300_rls_policies.sql` (Introduces a conflicting `entities` model)
- `20251014010400_chat_security_functions.sql` (Logic will be consolidated)
- `20251014010500_enhanced_chat_policies.sql` (Empty and unnecessary)
- `20251014010600_project_access_permissions.sql` (Storage policies will be consolidated)

**Verification:**
After deleting these files, the Supabase migration history will be invalid. We will need to run `supabase db reset` to apply the cleaned-up migrations from scratch. This ensures we are working with a clean slate.

---

#### Step 2: Simplify Roles in the Initial Schema

Next, we will modify the base schema to remove the `project_manager` role, enforcing the new two-role system at the database level.

**Action:**
Modify `supabase/migrations/20251014010000_initial_schema.sql`:
1.  In the `org_members` table definition, change the `role` column's `CHECK` constraint from `('owner', 'project_manager', 'member')` to `('owner', 'member')`.
2.  In the `invites` table definition, change the `role` column's `CHECK` constraint to also be `('owner', 'member')`.

**Verification:**
After applying this change and resetting the database, attempting to create an `org_member` or an `invite` with the role `project_manager` should fail with a check constraint violation.

---

#### Step 3: Implement New RBAC Logic in `get_effective_permission`

This is the core of the refactor. We will rewrite the main permission-checking function to implement the new, simplified default permissions for Owners and Members.

**Action:**
Modify `supabase/migrations/20251014010200_permissions_and_chat.sql`:
1.  Replace the existing `get_effective_permission` function with the new version.
2.  The new function will first check for an explicit ACL override in the `permissions` table.
3.  If no override exists, it will apply the new default rules:
    -   **Owners**: Get `'edit'` permission on everything.
    -   **Members**: Get `'view'` permission on all resources *except* for those under `BORROWER_DOCS_ROOT`, for which they get `NULL` (no access).

**Verification:**
This can be tested by creating a new `owner` and `member` in a test organization, and then calling `SELECT public.get_effective_permission('<user_id>', '<resource_id>')` for various resources (Borrower Resume, a file in Borrower Docs, Project Resume, etc.) to ensure the correct permission (`edit`, `view`, or `NULL`) is returned.

---

#### Step 4: Consolidate RLS and Storage Security Policies

Finally, we will move all RLS policies and storage security rules into a single migration file, making it the canonical source for all security rules.

**Action:**
Add to the end of `supabase/migrations/20251014010200_permissions_and_chat.sql`:
1.  Add `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` statements for all relevant tables (`orgs`, `projects`, `resources`, etc.).
2.  Add all the RLS policies for these tables. The policies will rely on the newly implemented `can_view` and `can_edit` helper functions, which in turn use our new `get_effective_permission` function.
3.  Add the storage security functions (`get_resource_by_storage_path`) and the final RLS policy for `storage.objects`. This policy will also use `get_effective_permission` to grant or deny access.

**Verification:**
After resetting the database, these policies should be active.
- **As an Owner**: You should be able to view all orgs/projects and upload/download all files.
- **As a Member**: You should only be able to view projects and download files from permitted resources (i.e., not from Borrower Docs). Attempting to upload a file should be blocked by the storage policy's `WITH CHECK` clause.
- **Testing in App**: The ultimate verification is to run the application and test the user workflows for both an Owner and a Member account.

This structured plan will allow us to methodically update the system and verify each component along the way.
