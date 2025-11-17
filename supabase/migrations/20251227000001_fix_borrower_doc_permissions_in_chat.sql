-- =============================================================================
-- Migration: Fix borrower document permissions in chat functions
-- =============================================================================
--
-- This migration fixes the get_common_file_resources_for_thread function to
-- properly check that ALL participants can view documents (including borrower docs).
--
-- The bug was that the function was checking if ANY participant could view,
-- instead of checking that ALL participants can view.
--
-- This affects both project documents and borrower documents, ensuring that
-- documents are only shown in the attachable documents list if every participant
-- has view access to them.

-- Fix get_common_file_resources_for_thread to properly check ALL participants can view
CREATE OR REPLACE FUNCTION public.get_common_file_resources_for_thread(
    p_thread_id UUID
)
RETURNS TABLE(resource_id UUID, name TEXT, scope TEXT) AS $$
WITH participants AS (
  SELECT user_id
  FROM public.chat_thread_participants
  WHERE thread_id = p_thread_id
),
thread_context AS (
  SELECT t.project_id, pr.owner_org_id
  FROM public.chat_threads t
  JOIN public.projects pr ON pr.id = t.project_id
  WHERE t.id = p_thread_id
)
SELECT r.id AS resource_id,
       r.name,
       CASE
         WHEN r.project_id IS NOT NULL THEN 'project'
         ELSE 'org'
       END AS scope
FROM public.resources r
CROSS JOIN thread_context ctx
WHERE r.resource_type = 'FILE'
  AND (
    r.project_id = ctx.project_id
    OR (r.project_id IS NULL AND r.org_id = ctx.owner_org_id)
  )
GROUP BY r.id, r.name, scope
HAVING
  -- Ensure we have at least one participant
  (SELECT COUNT(*) FROM participants) > 0
  -- Ensure ALL participants can view this resource (no participant lacks access)
  AND NOT EXISTS (
    SELECT 1
    FROM participants p
    WHERE NOT public.can_view(p.user_id, r.id)
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.get_common_file_resources_for_thread IS 
'Returns all FILE resources (project-level or org-level, including borrower docs) that EVERY participant in the thread can view. Fixed to properly check all participants have access.';

