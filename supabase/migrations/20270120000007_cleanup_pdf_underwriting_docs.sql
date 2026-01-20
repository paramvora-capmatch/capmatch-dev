-- =============================================================================
-- Migration: Cleanup Unwanted PDF Underwriting Docs
-- Date: 2027-01-20
-- =============================================================================
--
-- The user requested to remove PDF versions of underwriting documents specific
-- to the "Report" types, as they only want Excel/Word versions.
-- This migration deletes the following resources if they exist:
-- 1. "Sources & Uses Report"
-- 2. "T12 Summary Report"
--
-- =============================================================================

DO $$
DECLARE
    v_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Cleaning up unwanted PDF underwriting documents...';
    
    -- Delete resources by name and type
    WITH deleted AS (
        DELETE FROM public.resources
        WHERE resource_type = 'FILE'
          AND name IN ('Sources & Uses Report', 'T12 Summary Report')
        RETURNING id
    )
    SELECT count(*) INTO v_count FROM deleted;
    
    RAISE NOTICE 'Deleted % PDF resources.', v_count;
    
END;
$$;
