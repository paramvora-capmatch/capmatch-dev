-- Security fix: get_common_file_resources_for_thread did not verify that the
-- caller (auth.uid()) is a participant of the requested thread. Any authenticated
-- user could call it with any thread_id and receive shared file resource metadata
-- for threads they don't belong to.
--
-- Fix: add an upfront participant membership check before returning results.
-- Function is converted from LANGUAGE sql to LANGUAGE plpgsql to allow the
-- imperative guard.

CREATE OR REPLACE FUNCTION public.get_common_file_resources_for_thread(
    p_thread_id UUID
)
RETURNS TABLE(resource_id UUID, name TEXT, scope TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify the caller is a participant of this thread
  IF NOT EXISTS (
    SELECT 1 FROM public.chat_thread_participants
    WHERE thread_id = p_thread_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Access denied: not a participant of this thread';
  END IF;

  RETURN QUERY
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
  HAVING bool_and(
    EXISTS (
      SELECT 1 FROM participants p
      WHERE public.can_view(p.user_id, r.id)
    )
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_common_file_resources_for_thread(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_common_file_resources_for_thread(UUID) TO authenticated;
