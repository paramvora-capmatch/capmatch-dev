-- =============================================================================
-- Migration: Rollback Cleanup Strategy
-- =============================================================================
--
-- This migration implements a "soft delete" strategy for versions created after
-- a rollback. When rolling back from version N to version M (where M < N),
-- versions M+1 through N are marked as "superseded" rather than permanently deleted.
-- This preserves the audit trail while preventing them from being the "current" version.
--
-- Storage files from superseded versions are left in place (cheap storage) but
-- should be cleaned up by an edge function or scheduled job if needed.

-- Step 1: Add a status column to document_versions
-- Status can be: 'active' (current version) or 'superseded' (replaced by rollback)
ALTER TABLE public.document_versions
ADD COLUMN status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'superseded'));

COMMENT ON COLUMN public.document_versions.status IS 'Tracks version status: active (current) or superseded (replaced by rollback)';
CREATE INDEX idx_document_versions_status ON public.document_versions(status);

-- Step 2: Create an updated rollback function that marks superseded versions
CREATE OR REPLACE FUNCTION public.rollback_document_version(p_resource_id UUID, p_version_id UUID)
RETURNS void AS $$
DECLARE
    v_is_valid_version BOOLEAN;
    v_current_version_number INT;
    v_rollback_version_number INT;
BEGIN
    -- First, check if the user has edit permissions on the resource.
    IF NOT public.can_edit(auth.uid(), p_resource_id) THEN
        RAISE EXCEPTION 'User does not have permission to edit this resource.';
    END IF;

    -- Verify that the provided version_id actually belongs to the resource_id.
    SELECT EXISTS (
        SELECT 1 FROM public.document_versions
        WHERE id = p_version_id AND resource_id = p_resource_id
    ) INTO v_is_valid_version;

    IF NOT v_is_valid_version THEN
        RAISE EXCEPTION 'The specified version does not belong to the given resource.';
    END IF;

    -- Get the version number we're rolling back to
    SELECT version_number INTO v_rollback_version_number
    FROM public.document_versions
    WHERE id = p_version_id;

    -- Get the current version number
    SELECT dv.version_number INTO v_current_version_number
    FROM public.document_versions dv
    JOIN public.resources r ON r.current_version_id = dv.id
    WHERE r.id = p_resource_id;

    -- Mark all versions after the rollback version as "superseded"
    -- This preserves them in the audit trail but prevents them from being current
    UPDATE public.document_versions
    SET status = 'superseded'
    WHERE resource_id = p_resource_id
    AND version_number > v_rollback_version_number;

    -- Set the rollback version back to 'active'
    UPDATE public.document_versions
    SET status = 'active'
    WHERE id = p_version_id;

    -- Update the resource's current_version_id to the specified version
    UPDATE public.resources
    SET current_version_id = p_version_id
    WHERE id = p_resource_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
COMMENT ON FUNCTION public.rollback_document_version IS 'Rolls back to a previous version, marking newer versions as superseded in the audit trail.';