-- =============================================================================
-- Migration: Lender Access Support
-- =============================================================================
--
-- This migration adds support for lender users to access projects with
-- read-only resume access and full chat capabilities.
--
-- Key Features:
-- 1. lender_project_access table for manual grant tracking
-- 2. RLS policies for lenders to read resumes and participate in chat
-- 3. Explicit exclusions for lender document access
--
-- =============================================================================

-- =============================================================================
-- 0. Helper function to get user's org IDs (needed before policies)
-- =============================================================================
-- This function uses SECURITY DEFINER to bypass RLS and prevent infinite recursion
-- when org_members policies reference org_members table.

CREATE OR REPLACE FUNCTION public.get_user_org_ids(p_user_id UUID)
RETURNS UUID[] AS $$
BEGIN
    RETURN ARRAY(
        SELECT org_id FROM public.org_members WHERE user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.get_user_org_ids IS 'Returns array of org IDs that a user belongs to. Uses SECURITY DEFINER to bypass RLS and avoid recursion.';

-- =============================================================================
-- 1. Create lender_project_access table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.lender_project_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lender_org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    granted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (lender_org_id, project_id)
);

CREATE INDEX idx_lender_project_access_lender_org ON public.lender_project_access(lender_org_id);
CREATE INDEX idx_lender_project_access_project ON public.lender_project_access(project_id);

COMMENT ON TABLE public.lender_project_access IS 'Tracks which lender orgs have access to which projects. Access is granted manually via admin/backend.';

-- =============================================================================
-- 2. Helper function to check if user is a lender with project access
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_lender_with_project_access(p_user_id UUID, p_project_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_org_id UUID;
    v_has_access BOOLEAN;
BEGIN
    -- Get the user's active org (assumes lenders have active_org_id set)
    SELECT active_org_id INTO v_user_org_id
    FROM public.profiles
    WHERE id = p_user_id AND app_role = 'lender';
    
    IF v_user_org_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if this lender org has access to the project
    SELECT EXISTS(
        SELECT 1 FROM public.lender_project_access
        WHERE lender_org_id = v_user_org_id AND project_id = p_project_id
    ) INTO v_has_access;
    
    RETURN v_has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.is_lender_with_project_access IS 'Checks if a lender user has access to a specific project via lender_project_access grants.';

-- =============================================================================
-- 3. RLS policies for lender access
-- =============================================================================

-- Enable RLS on lender_project_access table
ALTER TABLE public.lender_project_access ENABLE ROW LEVEL SECURITY;

-- Lenders can view their own project access grants
-- Note: Uses helper function defined in section 11 to avoid org_members recursion
DROP POLICY IF EXISTS "Lenders can view their project access" ON public.lender_project_access;
CREATE POLICY "Lenders can view their project access" ON public.lender_project_access
    FOR SELECT
    USING (
        lender_org_id = ANY(public.get_user_org_ids(auth.uid()))
    );

-- Admins/service role can manage lender_project_access (for manual grants)
DROP POLICY IF EXISTS "Service role can manage lender access" ON public.lender_project_access;
CREATE POLICY "Service role can manage lender access" ON public.lender_project_access
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role')
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- =============================================================================
-- 4. Update projects RLS to allow lender read access
-- =============================================================================

-- Add policy for lenders to view projects they have access to
DROP POLICY IF EXISTS "Lenders can view granted projects" ON public.projects;
CREATE POLICY "Lenders can view granted projects" ON public.projects
    FOR SELECT
    USING (
        public.is_lender_with_project_access(auth.uid(), id)
    );

-- =============================================================================
-- 5. Update project_resumes RLS to allow lender read access
-- =============================================================================

-- Add policy for lenders to view project resumes for granted projects
DROP POLICY IF EXISTS "Lenders can view granted project resumes" ON public.project_resumes;
CREATE POLICY "Lenders can view granted project resumes" ON public.project_resumes
    FOR SELECT
    USING (
        public.is_lender_with_project_access(auth.uid(), project_id)
    );

-- =============================================================================
-- 6. Update borrower_resumes RLS to allow lender read access
-- =============================================================================

-- Add policy for lenders to view borrower resumes for granted projects
-- Note: borrower_resumes are now project-scoped (project_id), not org-scoped
DROP POLICY IF EXISTS "Lenders can view borrower resumes for granted projects" ON public.borrower_resumes;
CREATE POLICY "Lenders can view borrower resumes for granted projects" ON public.borrower_resumes
    FOR SELECT
    USING (
        public.is_lender_with_project_access(auth.uid(), borrower_resumes.project_id)
    );

-- =============================================================================
-- 7. Update chat RLS to allow lender participation
-- =============================================================================

-- Lenders can view threads for projects they have access to
DROP POLICY IF EXISTS "Lenders can view chat threads for granted projects" ON public.chat_threads;
CREATE POLICY "Lenders can view chat threads for granted projects" ON public.chat_threads
    FOR SELECT
    USING (
        public.is_lender_with_project_access(auth.uid(), project_id)
    );

-- Lenders can view thread participants for threads they can access
DROP POLICY IF EXISTS "Lenders can view thread participants" ON public.chat_thread_participants;
CREATE POLICY "Lenders can view thread participants" ON public.chat_thread_participants
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_threads ct
            WHERE ct.id = thread_id
            AND public.is_lender_with_project_access(auth.uid(), ct.project_id)
        )
    );

-- Lenders can insert themselves as thread participants (to join chat)
DROP POLICY IF EXISTS "Lenders can join chat threads for granted projects" ON public.chat_thread_participants;
CREATE POLICY "Lenders can join chat threads for granted projects" ON public.chat_thread_participants
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.chat_threads ct
            WHERE ct.id = thread_id
            AND public.is_lender_with_project_access(auth.uid(), ct.project_id)
        )
    );

-- Lenders can view messages in threads for projects they have access to
-- Note: project_messages only has thread_id, need to join through chat_threads
DROP POLICY IF EXISTS "Lenders can view messages for granted projects" ON public.project_messages;
CREATE POLICY "Lenders can view messages for granted projects" ON public.project_messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_threads ct
            WHERE ct.id = project_messages.thread_id
            AND public.is_lender_with_project_access(auth.uid(), ct.project_id)
        )
    );

-- Lenders can send messages in threads for projects they have access to
DROP POLICY IF EXISTS "Lenders can send messages in granted project threads" ON public.project_messages;
CREATE POLICY "Lenders can send messages in granted project threads" ON public.project_messages
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.chat_threads ct
            WHERE ct.id = thread_id
            AND public.is_lender_with_project_access(auth.uid(), ct.project_id)
        )
    );

-- =============================================================================
-- 8. Update notifications RLS to allow lender access
-- =============================================================================

-- Lenders can view their own notifications
-- (This should already be covered by existing user_id policies, but we'll verify)
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT
    USING (user_id = auth.uid());

-- Lenders can mark their own notifications as read
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- =============================================================================
-- 9. Explicit document access exclusion
-- =============================================================================

-- Add a comment to document that lenders should NOT have storage access
-- This will be enforced at the application and storage policy level
COMMENT ON TABLE public.lender_project_access IS 
'Tracks which lender orgs have access to which projects. 
Lenders get READ-ONLY access to borrower_resumes and project_resumes, 
FULL access to chat, but NO access to project documents/storage.';

-- Note: Storage/document RLS policies should already deny lender access by default
-- since they only grant access to org owners/members with explicit permissions.
-- We verify this by checking the storage policies in the next section.

-- =============================================================================
-- 10. Verify storage policies exclude lenders (documentation)
-- =============================================================================

-- Storage policies are defined in supabase/migrations/20251017170000_rls_rebuild_part3_storage.sql
-- They grant access based on:
-- 1. Org ownership (via org_members)
-- 2. Explicit resource permissions (via permissions table)
--
-- Since lenders are NOT members of the borrower org and do NOT have permissions
-- in the permissions table, they will be automatically denied storage access.
-- No additional policies needed.

-- =============================================================================
-- 11. Add lender support to org-related queries
-- =============================================================================

-- Ensure lenders can query their own org members (for team management)
-- Uses helper function (defined in section 0) to avoid infinite recursion

-- Lenders in an org can see other members of their org
DROP POLICY IF EXISTS "Org members can view other members" ON public.org_members;
CREATE POLICY "Org members can view other members" ON public.org_members
    FOR SELECT
    USING (
        org_id = ANY(public.get_user_org_ids(auth.uid()))
    );

-- =============================================================================
-- 12. Function: Grant lender access (for admin/backend use)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.grant_lender_project_access(
    p_lender_org_id UUID,
    p_project_id UUID,
    p_granted_by UUID
)
RETURNS UUID AS $$
DECLARE
    v_access_id UUID;
BEGIN
    -- Verify the lender org exists and is of type 'lender'
    IF NOT EXISTS (
        SELECT 1 FROM public.orgs 
        WHERE id = p_lender_org_id AND entity_type = 'lender'
    ) THEN
        RAISE EXCEPTION 'Invalid lender org ID or org is not of type lender';
    END IF;
    
    -- Verify the project exists
    IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = p_project_id) THEN
        RAISE EXCEPTION 'Project does not exist';
    END IF;
    
    -- Insert or update the access grant
    INSERT INTO public.lender_project_access (lender_org_id, project_id, granted_by)
    VALUES (p_lender_org_id, p_project_id, p_granted_by)
    ON CONFLICT (lender_org_id, project_id) DO UPDATE
        SET granted_by = p_granted_by, created_at = now()
    RETURNING id INTO v_access_id;
    
    RETURN v_access_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.grant_lender_project_access IS 'Grants a lender org access to a project. Used by admin/backend for manual grants.';

-- =============================================================================
-- 13. Function: Revoke lender access
-- =============================================================================

CREATE OR REPLACE FUNCTION public.revoke_lender_project_access(
    p_lender_org_id UUID,
    p_project_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_deleted BOOLEAN;
BEGIN
    DELETE FROM public.lender_project_access
    WHERE lender_org_id = p_lender_org_id AND project_id = p_project_id;
    
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.revoke_lender_project_access IS 'Revokes a lender org''s access to a project.';
