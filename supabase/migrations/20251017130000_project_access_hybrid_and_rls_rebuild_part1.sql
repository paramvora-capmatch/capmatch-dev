-- =============================================================================
-- Migration: Project Access Hybrid Model & RLS Rebuild (Part 1)
-- =============================================================================
--
-- This migration implements the "Hybrid Approach" for project access control.
--
-- 1.  It introduces a `project_access_grants` table to explicitly track
--     which users have been granted access to which projects.
--
-- 2.  It creates a `grant_project_access` database function to handle the
--     complex, transactional logic of granting project access and setting up
--     initial permissions.
--
-- 3.  It begins the ground-up rebuild of the Row Level Security (RLS) policies,
--     starting with core tables like `profiles`, `orgs`, `projects`, and the new
--     `project_access_grants` table.

-- =============================================================================
-- 1. Schema for Project Access Grants
-- =============================================================================

CREATE TABLE public.project_access_grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE, -- Denormalized to prevent RLS recursion
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    granted_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(project_id, user_id)
);
COMMENT ON TABLE public.project_access_grants IS 'Tracks which users have been explicitly granted access to a project.';
CREATE INDEX idx_project_access_grants_project_id ON public.project_access_grants(project_id);
CREATE INDEX idx_project_access_grants_user_id ON public.project_access_grants(user_id);
CREATE INDEX idx_project_access_grants_org_id ON public.project_access_grants(org_id);


-- =============================================================================
-- 2. Database Function for Granting Access
-- =============================================================================

-- A custom type to make the function signature cleaner.
CREATE TYPE public.permission_grant AS (
    resource_type TEXT,
    permission TEXT
);

-- The main function to grant a user access to a project and set initial permissions.
CREATE OR REPLACE FUNCTION public.grant_project_access(
    p_project_id UUID,
    p_user_id UUID,
    p_granted_by_id UUID,
    p_permissions public.permission_grant[]
)
RETURNS void AS $$
DECLARE
    v_grant public.permission_grant;
    v_resource_id UUID;
    v_org_id UUID;
BEGIN
    -- First, verify the granter has owner permissions on the project's org.
    SELECT owner_org_id INTO v_org_id FROM public.projects WHERE id = p_project_id;
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Project not found or has no owner organization.';
    END IF;
    IF NOT public.is_org_owner(v_org_id, p_granted_by_id) THEN
        RAISE EXCEPTION 'Only organization owners can grant project access.';
    END IF;

    -- Create the top-level access grant record. This is the "entry ticket".
    INSERT INTO public.project_access_grants (project_id, user_id, granted_by, org_id)
    VALUES (p_project_id, p_user_id, p_granted_by_id, v_org_id);

    -- Loop through the requested granular permissions and create them.
    FOREACH v_grant IN ARRAY p_permissions
    LOOP
        -- Find the corresponding resource_id based on the project and resource type.
        -- This relies on the initial creation of these root resources.
        SELECT id INTO v_resource_id
        FROM public.resources
        WHERE project_id = p_project_id AND resource_type = v_grant.resource_type;

        -- If a resource is found, insert or update the permission.
        IF v_resource_id IS NOT NULL THEN
            INSERT INTO public.permissions (resource_id, user_id, permission, granted_by)
            VALUES (v_resource_id, p_user_id, v_grant.permission, p_granted_by_id)
            -- If the permission already exists (e.g., re-inviting), update it.
            ON CONFLICT (resource_id, user_id) DO UPDATE SET
                permission = EXCLUDED.permission,
                granted_by = EXCLUDED.granted_by;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.grant_project_access IS 'Grants a user access to a project and sets their initial permissions in a single transaction.';


-- =============================================================================
-- 3. RLS Rebuild - Part 1: Core Tables
-- =============================================================================

-- Re-enable RLS for tables where we are adding policies.
-- The temporary migration file that disables RLS on all tables will be
-- overridden for these specific tables.

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view and manage their own profile" ON public.profiles;
CREATE POLICY "Users can view and manage their own profile" ON public.profiles
FOR ALL USING ((select auth.uid()) = id);

-- Orgs
ALTER TABLE public.orgs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view their own orgs" ON public.orgs;
DROP POLICY IF EXISTS "Owners can update their own orgs" ON public.orgs;
CREATE POLICY "Members can view their own orgs" ON public.orgs
FOR SELECT USING (EXISTS (SELECT 1 FROM public.org_members WHERE org_id = id AND user_id = (select auth.uid())));
CREATE POLICY "Owners can update their own orgs" ON public.orgs
FOR UPDATE USING (public.is_org_owner(id, (select auth.uid())));

-- Project Access Grants (New Table)
ALTER TABLE public.project_access_grants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Org owners can manage project access grants" ON public.project_access_grants;
DROP POLICY IF EXISTS "Users can view their own project access grants" ON public.project_access_grants;
CREATE POLICY "Org owners can manage project access grants" ON public.project_access_grants
FOR ALL USING (
    public.is_org_owner(org_id, (select auth.uid()))
);
CREATE POLICY "Users can view their own project access grants" ON public.project_access_grants
FOR SELECT USING (user_id = (select auth.uid()));

-- Projects (New Policies)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
-- Drop the old, ambiguous policies
DROP POLICY IF EXISTS "Project access is controlled by grants and ownership" ON public.projects;
DROP POLICY IF EXISTS "Granted users can view projects" ON public.projects;
DROP POLICY IF EXISTS "Users can access projects based on resource permissions" ON public.projects;

-- A user can see a project if they are an org owner OR if they have an explicit grant.
CREATE POLICY "Users can view projects they have access to" ON public.projects
FOR SELECT USING (
    public.is_org_owner(owner_org_id, (select auth.uid())) OR
    EXISTS (
        SELECT 1 FROM public.project_access_grants
        WHERE project_id = projects.id AND user_id = (select auth.uid())
    )
);

-- Only org owners can create new projects.
CREATE POLICY "Owners can create projects" ON public.projects
FOR INSERT WITH CHECK (
    public.is_org_owner(owner_org_id, (select auth.uid()))
);

-- Only org owners can update projects.
CREATE POLICY "Owners can update projects" ON public.projects
FOR UPDATE USING (
    public.is_org_owner(owner_org_id, (select auth.uid()))
);

-- Only org owners can delete projects.
CREATE POLICY "Owners can delete projects" ON public.projects
FOR DELETE USING (
    public.is_org_owner(owner_org_id, (select auth.uid()))
);

-- Org Members RLS (added)
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own org membership" ON public.org_members;
DROP POLICY IF EXISTS "Owners can view org membership" ON public.org_members;
DROP POLICY IF EXISTS "Owners can manage org membership" ON public.org_members;
CREATE POLICY "Users can view their own org membership" ON public.org_members
FOR SELECT USING (user_id = (select auth.uid()));
CREATE POLICY "Owners can view org membership" ON public.org_members
FOR SELECT USING (public.is_org_owner(org_id, (select auth.uid())));
CREATE POLICY "Owners can manage org membership" ON public.org_members
FOR ALL USING (public.is_org_owner(org_id, (select auth.uid())))
WITH CHECK (public.is_org_owner(org_id, (select auth.uid())));

-- Invites RLS (added)
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners can manage invites" ON public.invites;
CREATE POLICY "Owners can manage invites" ON public.invites
FOR ALL USING (public.is_org_owner(org_id, (select auth.uid())))
WITH CHECK (public.is_org_owner(org_id, (select auth.uid())));
