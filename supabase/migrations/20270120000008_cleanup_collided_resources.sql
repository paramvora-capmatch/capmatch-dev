-- =============================================================================
-- Migration: Cleanup Corrupted Underwriting Resources
-- Date: 2027-01-20
-- =============================================================================
--
-- This migration deletes potential corrupted "template" resources that were 
-- incorrectly moved from the Documents root to the Templates root by a faulty 
-- seed script. 
-- It targets specific file names used in both Templates and Documents to allow 
-- the fixed seed script to re-create them cleanly in both locations.
-- =============================================================================

DO $$
DECLARE
    v_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Cleaning up corrupted underwriting resources for re-seeding...';
    
    -- Delete resources by name and type that match the duplicated names
    -- This will force the seed script to recreate both the Document and the Template versions correctly.
    WITH deleted AS (
        DELETE FROM public.resources
        WHERE resource_type = 'FILE'
          AND name IN (
              'Sources & Uses Model',
              'T12 Financial Statement',
              'Personal Financial Statement', 
              'Sponsor Bio',
              'Current Rent Roll',
              'Schedule of Real Estate Owned (SREO)'
          )
        RETURNING id
    )
    SELECT count(*) INTO v_count FROM deleted;
    
    RAISE NOTICE 'Deleted % resources (simulating fresh seed for duplicates).', v_count;
    
END;
$$;
