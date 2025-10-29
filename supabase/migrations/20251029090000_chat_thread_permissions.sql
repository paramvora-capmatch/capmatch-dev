-- =============================================================================
-- Chat Thread Permission Utilities & Policies
-- =============================================================================

-- Function: get_common_file_resources_for_thread
-- Returns all FILE resources (project-level or org-level) that every participant
-- in the given thread can view.
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
HAVING bool_and(
  EXISTS (
    SELECT 1 FROM participants p
    WHERE public.can_view(p.user_id, r.id)
  )
);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Function: get_common_file_resources_for_member_set
-- Computes the intersection of documents for an arbitrary set of users within a
-- project (including both project-level and org-level documents).
CREATE OR REPLACE FUNCTION public.get_common_file_resources_for_member_set(
    p_project_id UUID,
    p_user_ids UUID[]
)
RETURNS TABLE(resource_id UUID, name TEXT, scope TEXT) AS $$
WITH cleaned_users AS (
  SELECT DISTINCT UNNEST(COALESCE(p_user_ids, ARRAY[]::UUID[])) AS user_id
),
project_context AS (
  SELECT id, owner_org_id
  FROM public.projects
  WHERE id = p_project_id
)
SELECT r.id AS resource_id,
       r.name,
       CASE
         WHEN r.project_id IS NOT NULL THEN 'project'
         ELSE 'org'
       END AS scope
FROM public.resources r
CROSS JOIN project_context ctx
WHERE r.resource_type = 'FILE'
  AND (
    r.project_id = ctx.id
    OR (r.project_id IS NULL AND r.org_id = ctx.owner_org_id)
  )
GROUP BY r.id, r.name, scope
HAVING
  (SELECT COUNT(*) FROM cleaned_users) > 0
  AND NOT EXISTS (
    SELECT 1
    FROM cleaned_users u
    WHERE NOT public.can_view(u.user_id, r.id)
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- Function: validate_docs_for_thread
-- Validates a list of resource IDs against all participants in the thread.
-- Returns each resource with the list of participant IDs lacking view access.
CREATE OR REPLACE FUNCTION public.validate_docs_for_thread(
    p_thread_id UUID,
    p_resource_ids UUID[]
)
RETURNS TABLE(resource_id UUID, missing_user_ids UUID[]) AS $$
WITH participants AS (
  SELECT user_id
  FROM public.chat_thread_participants
  WHERE thread_id = p_thread_id
)
SELECT r_id AS resource_id,
       COALESCE(missing_ids, ARRAY[]::UUID[]) AS missing_user_ids
FROM (
  SELECT UNNEST(p_resource_ids) AS r_id
) resources
LEFT JOIN LATERAL (
  SELECT ARRAY(
           SELECT p.user_id
           FROM participants p
           WHERE NOT public.can_view(p.user_id, resources.r_id)
         ) AS missing_ids
) miss ON TRUE;
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- Function: insert_thread_message
-- Creates a message with optional attachments after validating permissions.
CREATE OR REPLACE FUNCTION public.insert_thread_message(
    p_thread_id UUID,
    p_user_id UUID,
    p_content TEXT,
    p_resource_ids UUID[]
)
RETURNS BIGINT AS $$
DECLARE
  v_message_id BIGINT;
  v_missing RECORD;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.chat_thread_participants
    WHERE thread_id = p_thread_id
      AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'User % is not a participant in thread %', p_user_id, p_thread_id;
  END IF;

  IF p_resource_ids IS NOT NULL AND array_length(p_resource_ids, 1) > 0 THEN
    FOR v_missing IN
      SELECT *
      FROM public.validate_docs_for_thread(p_thread_id, p_resource_ids)
    LOOP
      IF v_missing.missing_user_ids IS NOT NULL AND array_length(v_missing.missing_user_ids, 1) > 0 THEN
        RAISE EXCEPTION 'DOC_ACCESS_DENIED'
          USING ERRCODE = 'P0001',
                DETAIL = jsonb_build_object(
                  'resource_id', v_missing.resource_id,
                  'missing_user_ids', v_missing.missing_user_ids
                )::TEXT;
      END IF;
    END LOOP;
  END IF;

  INSERT INTO public.project_messages (thread_id, user_id, content)
  VALUES (p_thread_id, p_user_id, p_content)
  RETURNING id INTO v_message_id;

  IF p_resource_ids IS NOT NULL AND array_length(p_resource_ids, 1) > 0 THEN
    INSERT INTO public.message_attachments (message_id, resource_id)
    SELECT DISTINCT v_message_id, r_id
    FROM UNNEST(p_resource_ids) AS r_id;
  END IF;

  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- RLS Policy: allow thread participants to insert attachments they can view.
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can create attachments" ON public.message_attachments;
CREATE POLICY "Participants can create attachments" ON public.message_attachments
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.project_messages m
    JOIN public.chat_thread_participants p ON p.thread_id = m.thread_id
    WHERE m.id = message_id
      AND p.user_id = auth.uid()
  )
  AND public.can_view(auth.uid(), resource_id)
);

