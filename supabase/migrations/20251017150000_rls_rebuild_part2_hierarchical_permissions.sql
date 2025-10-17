-- =============================================================================
-- Migration: RLS Rebuild (Part 2) - Hierarchical Permissions & Core Logic
-- =============================================================================
--
-- This is the definitive migration for the core hierarchical permissions system.
-- It builds on the foundations from Part 1 and implements the robust,
-- refined logic discussed.
--
-- Key Features Implemented:
--
-- 1.  Schema Change for Explicit Denials:
--     - The `permissions` table is altered to allow a `'none'` value, enabling
--       explicit revocation of inherited permissions ("hole-punching").
--
-- 2.  The "Brain" - get_effective_permission Function (New Version):
--     - Implements a strict order of precedence for calculating permissions:
--       a. Owner "God Mode": If the user is an org owner, they get 'edit' access.
--       b. "Most Specific Grant Wins": Recursively checks for the closest explicit
--          permission grant ('edit', 'view', or 'none') on a resource or its
--          ancestors.
--       c. Default-Deny: If no grant is found, access is denied (returns NULL).
--
-- 3.  The "Gatekeepers" - RLS Policies for Core Tables:
--     - Applies explicit, action-specific RLS policies to `resources`,
--       `permissions`, and the resume tables.
--     - Protects critical system resources (e.g., `PROJECT_DOCS_ROOT`) from deletion.
--     - Implements the secure "Two-Lock" policy for managing permissions,
--       requiring both 'edit' rights and 'owner' status.
--
-- =============================================================================
-- 1. Schema Change: Allow 'none' in permissions
-- =============================================================================

-- Drop the old constraint
ALTER TABLE public.permissions DROP CONSTRAINT IF EXISTS permissions_permission_check;

-- Add the new constraint including 'none'
ALTER TABLE public.permissions ADD CONSTRAINT permissions_permission_check
CHECK (permission IN ('view', 'edit', 'none'));

COMMENT ON COLUMN public.permissions.permission IS 'The permission level granted. Can be view, edit, or none (for explicit denial).';


-- =============================================================================
-- 2. Core Logic: The `get_effective_permission` Function
-- =============================================================================

-- This is the "brain" of the permissions system.
CREATE OR REPLACE FUNCTION public.get_effective_permission(p_user_id UUID, p_resource_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_permission TEXT;
    v_org_id UUID;
BEGIN
    -- If resource_id is null, there are no permissions.
    IF p_resource_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Step 1: The "God Mode" Check for Owners. This has the highest precedence.
    SELECT org_id INTO v_org_id FROM public.resources WHERE id = p_resource_id;
    IF public.is_org_owner(v_org_id, p_user_id) THEN
        RETURN 'edit';
    END IF;

    -- Step 2: "Most Specific Grant Wins".
    -- Recursively find the closest permission in the resource hierarchy.
    WITH RECURSIVE resource_ancestry AS (
        -- Start with the resource itself (depth 0)
        SELECT id, parent_id, 0 AS depth
        FROM public.resources
        WHERE id = p_resource_id

        UNION ALL

        -- Recurse up to find parents, incrementing depth
        SELECT r.id, r.parent_id, ra.depth + 1
        FROM public.resources r
        JOIN resource_ancestry ra ON r.id = ra.parent_id
    )
    SELECT p.permission INTO v_permission
    FROM public.permissions p
    JOIN resource_ancestry ra ON p.resource_id = ra.id
    WHERE p.user_id = p_user_id
    ORDER BY ra.depth ASC -- The lowest depth is the most specific, so it wins
    LIMIT 1;

    -- Step 3: Handle the result of the grant check.
    IF v_permission IS NOT NULL THEN
        IF v_permission = 'none' THEN
            -- An explicit 'none' grant means no access.
            RETURN NULL;
        ELSE
            -- A 'view' or 'edit' grant is returned directly.
            RETURN v_permission;
        END IF;
    END IF;

    -- Step 4: Default-Deny. If no owner status and no grants were found, deny access.
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.get_effective_permission IS 'Calculates the effective permission for a user on a resource, implementing owner god-mode and most-specific-grant-wins logic.';


-- =============================================================================
-- 3. Core Logic: Helper Functions
-- =============================================================================

-- Update helper functions to use the new core logic.

CREATE OR REPLACE FUNCTION public.can_view(p_user_id UUID, p_resource_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- A user can view if their permission is 'view' OR 'edit'.
    RETURN public.get_effective_permission(p_user_id, p_resource_id) IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.can_edit(p_user_id UUID, p_resource_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- A user can edit only if their permission is exactly 'edit'.
    RETURN public.get_effective_permission(p_user_id, p_resource_id) = 'edit';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- =============================================================================
-- 4. RLS Rebuild - Part 2: Resources, Permissions, and Resumes
-- =============================================================================

-- A helper function is needed for the resume policies below.
-- It was removed from an older migration during cleanup, so we re-create it here
-- to make this migration self-contained.
CREATE OR REPLACE FUNCTION public.get_resource_id_from_fk(p_fk_id UUID, p_resource_type TEXT)
RETURNS UUID AS $$
  SELECT id FROM public.resources WHERE (CASE WHEN p_resource_type = 'PROJECT_RESUME' THEN project_id ELSE org_id END) = p_fk_id AND resource_type = p_resource_type LIMIT 1;
$$ LANGUAGE sql STABLE;

-- Enable RLS for all relevant tables
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrower_resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_resumes ENABLE ROW LEVEL SECURITY;

-- Drop any old policies from the original migration to ensure a clean slate
DROP POLICY IF EXISTS "Users can manage resources they have access to" ON public.resources;
DROP POLICY IF EXISTS "Users can manage permissions for resources they can edit" ON public.permissions;
DROP POLICY IF EXISTS "Users can access borrower resumes based on resource permissions" ON public.borrower_resumes;
DROP POLICY IF EXISTS "Users can access project resumes based on resource permissions" ON public.project_resumes;

-- RLS Policies for `public.resources`
CREATE POLICY "Users can view resources they have access to" ON public.resources
FOR SELECT USING (public.can_view(auth.uid(), id));

CREATE POLICY "Users can create resources in folders they can edit" ON public.resources
FOR INSERT WITH CHECK (public.can_edit(auth.uid(), parent_id));

CREATE POLICY "Users can update resources they can edit" ON public.resources
FOR UPDATE USING (public.can_edit(auth.uid(), id));

CREATE POLICY "Users can delete resources they can edit (with safeguards)" ON public.resources
FOR DELETE USING (
    public.can_edit(auth.uid(), id) AND
    resource_type NOT IN ('BORROWER_RESUME', 'PROJECT_RESUME', 'BORROWER_DOCS_ROOT', 'PROJECT_DOCS_ROOT')
);

-- RLS Policies for `public.permissions` (The "Two-Lock" Policy)
CREATE POLICY "Owners can manage permissions on resources they can edit" ON public.permissions
FOR ALL USING (
    -- Lock 1: User must have 'edit' rights on the resource.
    public.can_edit(auth.uid(), resource_id)
    AND
    -- Lock 2: User must be a fundamental 'owner' of the resource's org.
    public.is_org_owner(
        (SELECT org_id FROM public.resources WHERE id = resource_id),
        auth.uid()
    )
);

-- RLS Policies for Resume Tables
CREATE POLICY "Users can access borrower resumes based on resource permissions" ON public.borrower_resumes
FOR ALL USING (
    public.can_view(auth.uid(), public.get_resource_id_from_fk(org_id, 'BORROWER_RESUME'))
) WITH CHECK (
    public.can_edit(auth.uid(), public.get_resource_id_from_fk(org_id, 'BORROWER_RESUME'))
);

CREATE POLICY "Users can access project resumes based on resource permissions" ON public.project_resumes
FOR ALL USING (
    public.can_view(auth.uid(), public.get_resource_id_from_fk(project_id, 'PROJECT_RESUME'))
) WITH CHECK (
    public.can_edit(auth.uid(), public.get_resource_id_from_fk(project_id, 'PROJECT_RESUME'))
);
