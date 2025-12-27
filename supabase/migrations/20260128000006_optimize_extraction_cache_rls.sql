-- =============================================================================
-- Migration: Optimize extraction_cache RLS Policy for Performance
-- =============================================================================
--
-- Fixes performance issue where auth.uid() was being re-evaluated for each row.
-- Wraps auth.uid() in a subquery so it's evaluated once per query instead.

-- Drop and recreate the policy with optimized auth.uid() calls
DROP POLICY IF EXISTS "Users can manage extraction cache for their projects" ON extraction_cache;

CREATE POLICY "Users can manage extraction cache for their projects"
    ON extraction_cache
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = extraction_cache.project_id
            AND (
                public.is_org_owner(p.owner_org_id, (select auth.uid()))
                OR EXISTS (
                    SELECT 1 FROM public.project_access_grants pag
                    WHERE pag.project_id = p.id
                    AND pag.user_id = (select auth.uid())
                )
            )
        )
    );

COMMENT ON POLICY "Users can manage extraction cache for their projects" ON extraction_cache IS 
    'Optimized RLS policy: auth.uid() is wrapped in subquery to avoid per-row evaluation';

