-- =============================================================================
-- Migration: Fix Search Path Security for All SECURITY DEFINER Functions
-- =============================================================================
--
-- Fixes security issue where SECURITY DEFINER functions have mutable search_path.
-- All SECURITY DEFINER functions must explicitly set search_path to prevent
-- search_path injection attacks.
--
-- This migration updates all remaining SECURITY DEFINER functions that were
-- not covered in previous migrations.
--
-- =============================================================================

-- Fix get_current_user_id function
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid();
$$;

-- Fix is_org_owner function
CREATE OR REPLACE FUNCTION public.is_org_owner(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.org_members 
    WHERE org_id = p_org_id AND user_id = p_user_id AND role = 'owner'
  );
END;
$$;

-- Fix get_effective_permission function
CREATE OR REPLACE FUNCTION public.get_effective_permission(p_user_id UUID, p_resource_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    v_permission TEXT;
    v_org_id UUID;
    v_depth INT;
BEGIN
    -- Step 1: Owner "God Mode": If the user is an org owner, they get 'edit' access.
    SELECT org_id INTO v_org_id FROM public.resources WHERE id = p_resource_id;
    IF v_org_id IS NOT NULL AND public.is_org_owner(v_org_id, p_user_id) THEN
        RETURN 'edit';
    END IF;

    -- Step 2: "Most Specific Grant Wins": Recursively check for the closest explicit
    -- permission grant ('edit', 'view', or 'none') on a resource or its ancestors.
    WITH RECURSIVE resource_ancestry AS (
        SELECT id, parent_id, org_id, 0 as depth
        FROM public.resources
        WHERE id = p_resource_id
        
        UNION ALL
        
        SELECT r.id, r.parent_id, r.org_id, ra.depth + 1
        FROM public.resources r
        INNER JOIN resource_ancestry ra ON r.id = ra.parent_id
    )
    SELECT p.permission INTO v_permission
    FROM public.permissions p
    JOIN resource_ancestry ra ON p.resource_id = ra.id
    WHERE p.user_id = p_user_id
    ORDER BY ra.depth ASC
    LIMIT 1;

    -- Step 3: Handle the result of the grant check.
    IF v_permission IS NOT NULL THEN
        IF v_permission = 'none' THEN
            RETURN NULL;
        ELSE
            RETURN v_permission;
        END IF;
    END IF;

    -- Step 4: Default-Deny. If no owner status and no grants were found, deny access.
    RETURN NULL;
END;
$$;

-- Fix can_view function
CREATE OR REPLACE FUNCTION public.can_view(p_user_id UUID, p_resource_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
    RETURN public.get_effective_permission(p_user_id, p_resource_id) IS NOT NULL;
END;
$$;

-- Fix can_edit function
CREATE OR REPLACE FUNCTION public.can_edit(p_user_id UUID, p_resource_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
    RETURN public.get_effective_permission(p_user_id, p_resource_id) = 'edit';
END;
$$;

-- Fix get_permissions_for_resource function
CREATE OR REPLACE FUNCTION public.get_permissions_for_resource(p_resource_id UUID)
RETURNS TABLE(user_id UUID, full_name TEXT, permission TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.can_edit(auth.uid(), p_resource_id) THEN
        RAISE EXCEPTION 'Permission denied';
    END IF;

    RETURN QUERY
    SELECT p.user_id, pr.full_name, p.permission
    FROM public.permissions p
    JOIN public.profiles pr ON p.user_id = pr.id
    WHERE p.resource_id = p_resource_id;
END;
$$;

-- Fix set_permission_for_resource function
CREATE OR REPLACE FUNCTION public.set_permission_for_resource(
    p_resource_id UUID,
    p_user_id UUID,
    p_permission TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org_id UUID;
BEGIN
    SELECT org_id INTO v_org_id FROM public.resources WHERE id = p_resource_id;
    IF NOT public.is_org_owner(v_org_id, auth.uid()) THEN
        RAISE EXCEPTION 'Only owners can manage permissions.';
    END IF;

    INSERT INTO public.permissions (resource_id, user_id, permission, granted_by)
    VALUES (p_resource_id, p_user_id, p_permission, auth.uid())
    ON CONFLICT (resource_id, user_id)
    DO UPDATE SET
        permission = EXCLUDED.permission,
        granted_by = EXCLUDED.granted_by;
END;
$$;

-- Fix get_all_user_permissions_for_project function
CREATE OR REPLACE FUNCTION public.get_all_user_permissions_for_project(p_project_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    v_permissions JSONB;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'resource_id', r.id,
            'permission', public.get_effective_permission(auth.uid(), r.id)
        )
    )
    INTO v_permissions
    FROM public.resources r
    WHERE r.project_id = p_project_id
      AND public.get_effective_permission(auth.uid(), r.id) IS NOT NULL;

    RETURN COALESCE(v_permissions, '[]'::jsonb);
END;
$$;

-- Fix get_resource_by_storage_path function
CREATE OR REPLACE FUNCTION public.get_resource_by_storage_path(p_storage_path TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    v_resource_id UUID;
BEGIN
    SELECT resource_id INTO v_resource_id
    FROM public.document_versions
    WHERE storage_path = p_storage_path;
    RETURN v_resource_id;
END;
$$;

-- Fix can_upload_to_path_for_user function (we'll need to find the latest version)
-- This is a complex function, so we'll need to get the full definition
-- For now, adding placeholder - will need to get full function body
-- Fix delete_folder_and_children function
CREATE OR REPLACE FUNCTION public.delete_folder_and_children(p_folder_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.can_edit(auth.uid(), p_folder_id) THEN
        RAISE EXCEPTION 'Permission denied to delete this folder.';
    END IF;

    WITH RECURSIVE resource_tree AS (
        SELECT id
        FROM public.resources
        WHERE id = p_folder_id
        UNION ALL
        SELECT r.id
        FROM public.resources r
        JOIN resource_tree rt ON r.parent_id = rt.id
    )
    DELETE FROM public.resources WHERE id IN (SELECT id FROM resource_tree);
END;
$$;

-- Fix get_resource_id_from_fk function (latest version)
CREATE OR REPLACE FUNCTION public.get_resource_id_from_fk(p_fk_id UUID, p_resource_type TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT id
  FROM public.resources
  WHERE resource_type = p_resource_type
    AND (
      (p_resource_type IN ('PROJECT_RESUME', 'PROJECT_DOCS_ROOT', 'BORROWER_RESUME', 'BORROWER_DOCS_ROOT')
        AND project_id = p_fk_id)
      OR id = p_fk_id
    )
  ORDER BY created_at DESC
  LIMIT 1;
$$;

-- Fix can_upload_to_path_for_user function (full definition)
CREATE OR REPLACE FUNCTION public.can_upload_to_path_for_user(
    p_user_id UUID,
    p_bucket_id TEXT,
    p_path_tokens TEXT[]
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    v_bucket_uuid UUID;
    v_token_count INT;
    v_first_token TEXT;
    v_second_token TEXT;
    v_project_id UUID;
    v_parent_id UUID;
    v_resource_index INT;
    v_resource_token TEXT;
    v_folder_start_index INT;
    v_target_file_id UUID;
    v_next_parent_id UUID;
    v_current_folder_name TEXT;
    i INT;
BEGIN
    IF p_path_tokens IS NULL THEN
        RETURN FALSE;
    END IF;

    v_token_count := array_length(p_path_tokens, 1);
    IF v_token_count IS NULL OR v_token_count < 2 THEN
        RETURN FALSE;
    END IF;

    v_bucket_uuid := p_bucket_id::UUID;
    v_first_token := p_path_tokens[1];
    v_second_token := CASE WHEN v_token_count >= 2 THEN p_path_tokens[2] ELSE NULL END;

    IF v_first_token IN ('borrower-docs', 'borrower_docs') THEN
        SELECT id
        INTO v_parent_id
        FROM public.resources
        WHERE org_id = v_bucket_uuid
          AND resource_type = 'BORROWER_DOCS_ROOT'
        LIMIT 1;

        v_resource_index := 2;
        v_folder_start_index := 3;
    ELSE
        BEGIN
            v_project_id := v_first_token::UUID;
        EXCEPTION
            WHEN invalid_text_representation THEN
                RETURN FALSE;
        END;

        IF v_second_token IN ('borrower-docs', 'borrower_docs') THEN
            SELECT id
            INTO v_parent_id
            FROM public.resources
            WHERE project_id = v_project_id
              AND resource_type = 'BORROWER_DOCS_ROOT'
            LIMIT 1;

            v_resource_index := 3;
            v_folder_start_index := 4;
        ELSIF v_second_token = 'project-docs' THEN
            SELECT id
            INTO v_parent_id
            FROM public.resources
            WHERE project_id = v_project_id
              AND resource_type = 'PROJECT_DOCS_ROOT'
            LIMIT 1;

            v_resource_index := 3;
            v_folder_start_index := 4;
        ELSE
            SELECT id
            INTO v_parent_id
            FROM public.resources
            WHERE project_id = v_project_id
              AND resource_type = 'PROJECT_DOCS_ROOT'
            LIMIT 1;

            v_resource_index := 2;
            v_folder_start_index := 3;
        END IF;
    END IF;

    IF v_parent_id IS NULL THEN
        RETURN FALSE;
    END IF;

    IF v_resource_index IS NOT NULL AND v_resource_index <= v_token_count THEN
        v_resource_token := p_path_tokens[v_resource_index];

        BEGIN
            SELECT r.id
            INTO v_target_file_id
            FROM public.resources r
            WHERE r.id = v_resource_token::UUID
              AND (
                    r.parent_id = v_parent_id
                 OR (r.id = v_parent_id AND r.resource_type IN ('FILE', 'FOLDER'))
              )
            LIMIT 1;
        EXCEPTION
            WHEN invalid_text_representation THEN
                v_target_file_id := NULL;
        END;

        IF v_target_file_id IS NOT NULL THEN
            RETURN public.can_edit(p_user_id, v_target_file_id)
                OR public.can_edit(p_user_id, v_parent_id);
        END IF;
    END IF;

    IF v_folder_start_index IS NULL THEN
        v_folder_start_index := 2;
    END IF;

    IF v_token_count > v_folder_start_index THEN
        FOR i IN v_folder_start_index..(v_token_count - 1) LOOP
            v_current_folder_name := p_path_tokens[i];

            SELECT id
            INTO v_next_parent_id
            FROM public.resources
            WHERE parent_id = v_parent_id
              AND name = v_current_folder_name
              AND resource_type = 'FOLDER'
            LIMIT 1;

            IF v_next_parent_id IS NULL THEN
                RETURN FALSE;
            END IF;

            v_parent_id := v_next_parent_id;
        END LOOP;
    END IF;

    RETURN public.can_edit(p_user_id, v_parent_id);
END;
$$;

-- Fix can_upload_to_path function
CREATE OR REPLACE FUNCTION public.can_upload_to_path(
    p_bucket_id TEXT,
    p_path_tokens TEXT[]
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
    RETURN public.can_upload_to_path_for_user(auth.uid(), p_bucket_id, p_path_tokens);
END;
$$;

-- Fix has_explicit_none_permission function
CREATE OR REPLACE FUNCTION public.has_explicit_none_permission(
    p_user_id UUID,
    p_resource_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.permissions
    WHERE resource_id = p_resource_id
      AND user_id = p_user_id
      AND permission = 'none'
  );
END;
$$;

-- Fix is_thread_participant function
CREATE OR REPLACE FUNCTION public.is_thread_participant(p_thread_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.chat_thread_participants
    WHERE thread_id = p_thread_id AND user_id = p_user_id
  );
END;
$$;

-- Fix mark_thread_read function
CREATE OR REPLACE FUNCTION public.mark_thread_read(p_thread_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    UPDATE public.chat_thread_participants
    SET last_read_at = now()
    WHERE thread_id = p_thread_id AND user_id = v_user_id;

    UPDATE public.notifications n
    SET read_at = now()
    FROM public.domain_events e
    WHERE n.event_id = e.id
      AND n.user_id = v_user_id
      AND n.read_at IS NULL
      AND e.thread_id = p_thread_id;
END;
$$;

-- Fix grant_project_access function (we'll need the full definition)
-- This is complex, so adding placeholder for now

-- Fix user_has_project_access function
CREATE OR REPLACE FUNCTION public.user_has_project_access(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.project_access_grants
        WHERE project_id = p_project_id
        AND user_id = p_user_id
    );
END;
$$;

-- Fix is_assigned_advisor function
CREATE OR REPLACE FUNCTION public.is_assigned_advisor(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.projects
        WHERE id = p_project_id
        AND assigned_advisor_id = p_user_id
    );
END;
$$;

-- Fix set_project_resume_version_number function
CREATE OR REPLACE FUNCTION public.set_project_resume_version_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  max_version INT;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO max_version
  FROM public.project_resumes
  WHERE project_id = NEW.project_id;

  NEW.version_number = max_version;
  RETURN NEW;
END;
$$;

-- Fix set_borrower_resume_version_number function
CREATE OR REPLACE FUNCTION public.set_borrower_resume_version_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  max_version INT;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO max_version
  FROM public.borrower_resumes
  WHERE project_id = NEW.project_id;

  NEW.version_number = max_version;
  RETURN NEW;
END;
$$;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix grant_project_access function
CREATE OR REPLACE FUNCTION public.grant_project_access(
    p_project_id UUID,
    p_user_id UUID,
    p_granted_by_id UUID,
    p_permissions public.permission_grant[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_grant public.permission_grant;
    v_resource_id UUID;
    v_org_id UUID;
BEGIN
    SELECT owner_org_id INTO v_org_id FROM public.projects WHERE id = p_project_id;
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Project not found or has no owner organization.';
    END IF;
    IF NOT public.is_org_owner(v_org_id, p_granted_by_id) THEN
        RAISE EXCEPTION 'Only organization owners can grant project access.';
    END IF;

    INSERT INTO public.project_access_grants (project_id, user_id, granted_by, org_id)
    VALUES (p_project_id, p_user_id, p_granted_by_id, v_org_id);

    FOREACH v_grant IN ARRAY p_permissions
    LOOP
        SELECT id INTO v_resource_id
        FROM public.resources
        WHERE project_id = p_project_id AND resource_type = v_grant.resource_type;

        IF v_resource_id IS NOT NULL THEN
            INSERT INTO public.permissions (resource_id, user_id, permission, granted_by)
            VALUES (v_resource_id, p_user_id, v_grant.permission, p_granted_by_id)
            ON CONFLICT (resource_id, user_id) DO UPDATE SET
                permission = EXCLUDED.permission,
                granted_by = EXCLUDED.granted_by;
        END IF;
    END LOOP;
END;
$$;

-- Fix get_common_file_resources_for_thread function
CREATE OR REPLACE FUNCTION public.get_common_file_resources_for_thread(
    p_thread_id UUID
)
RETURNS TABLE(resource_id UUID, name TEXT, scope TEXT)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
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
$$;

-- Fix get_common_file_resources_for_member_set function
CREATE OR REPLACE FUNCTION public.get_common_file_resources_for_member_set(
    p_project_id UUID,
    p_user_ids UUID[]
)
RETURNS TABLE(resource_id UUID, name TEXT, scope TEXT)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
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
$$;

-- Fix validate_docs_for_thread function
CREATE OR REPLACE FUNCTION public.validate_docs_for_thread(
    p_thread_id UUID,
    p_resource_ids UUID[]
)
RETURNS TABLE(resource_id UUID, missing_user_ids UUID[])
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
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
$$;

-- Fix get_effective_permissions_for_resource function
CREATE OR REPLACE FUNCTION public.get_effective_permissions_for_resource(
    p_resource_id UUID,
    p_user_ids UUID[]
)
RETURNS TABLE(user_id UUID, effective_permission TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    v_org_id UUID;
BEGIN
    SELECT org_id INTO v_org_id
    FROM public.resources
    WHERE id = p_resource_id;

    IF NOT public.is_org_owner(v_org_id, auth.uid()) THEN
        RAISE EXCEPTION 'Only owners can view effective permissions.';
    END IF;

    RETURN QUERY
    SELECT u_id AS user_id,
           public.get_effective_permission(u_id, p_resource_id) AS effective_permission
    FROM UNNEST(COALESCE(p_user_ids, ARRAY[]::UUID[])) AS u_id;
END;
$$;

-- Fix grant_advisor_project_permissions function
CREATE OR REPLACE FUNCTION public.grant_advisor_project_permissions(
    p_project_id UUID,
    p_advisor_id UUID,
    p_granted_by_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_project RECORD;
    v_project_resume_resource_id UUID;
    v_project_docs_root_resource_id UUID;
    v_borrower_resume_resource_id UUID;
    v_borrower_docs_root_resource_id UUID;
    v_granted_by UUID := COALESCE(p_granted_by_id, p_advisor_id);
BEGIN
    SELECT owner_org_id, assigned_advisor_id
    INTO v_project
    FROM public.projects
    WHERE id = p_project_id;

    IF v_project IS NULL THEN
        RAISE EXCEPTION 'Project not found: %', p_project_id;
    END IF;

    IF v_project.assigned_advisor_id != p_advisor_id THEN
        RAISE EXCEPTION 'Advisor % is not assigned to project %', p_advisor_id, p_project_id;
    END IF;

    INSERT INTO public.project_access_grants (project_id, org_id, user_id, granted_by)
    VALUES (p_project_id, v_project.owner_org_id, p_advisor_id, v_granted_by)
    ON CONFLICT (project_id, user_id) DO NOTHING;

    SELECT id
    INTO v_project_resume_resource_id
    FROM public.resources
    WHERE project_id = p_project_id
      AND resource_type = 'PROJECT_RESUME'
    LIMIT 1;

    IF v_project_resume_resource_id IS NOT NULL THEN
        INSERT INTO public.permissions (resource_id, user_id, permission, granted_by)
        VALUES (v_project_resume_resource_id, p_advisor_id, 'edit', v_granted_by)
        ON CONFLICT (resource_id, user_id)
        DO UPDATE SET permission = 'edit', granted_by = EXCLUDED.granted_by;
    END IF;

    SELECT id
    INTO v_project_docs_root_resource_id
    FROM public.resources
    WHERE project_id = p_project_id
      AND resource_type = 'PROJECT_DOCS_ROOT'
    LIMIT 1;

    IF v_project_docs_root_resource_id IS NOT NULL THEN
        INSERT INTO public.permissions (resource_id, user_id, permission, granted_by)
        VALUES (v_project_docs_root_resource_id, p_advisor_id, 'edit', v_granted_by)
        ON CONFLICT (resource_id, user_id)
        DO UPDATE SET permission = 'edit', granted_by = EXCLUDED.granted_by;
    END IF;

    SELECT borrower_resume_resource_id, borrower_docs_root_resource_id
    INTO v_borrower_resume_resource_id, v_borrower_docs_root_resource_id
    FROM public.ensure_project_borrower_roots(p_project_id);

    IF v_borrower_resume_resource_id IS NOT NULL THEN
        INSERT INTO public.permissions (resource_id, user_id, permission, granted_by)
        VALUES (v_borrower_resume_resource_id, p_advisor_id, 'edit', v_granted_by)
        ON CONFLICT (resource_id, user_id)
        DO UPDATE SET permission = 'edit', granted_by = EXCLUDED.granted_by;
    END IF;

    IF v_borrower_docs_root_resource_id IS NOT NULL THEN
        INSERT INTO public.permissions (resource_id, user_id, permission, granted_by)
        VALUES (v_borrower_docs_root_resource_id, p_advisor_id, 'edit', v_granted_by)
        ON CONFLICT (resource_id, user_id)
        DO UPDATE SET permission = 'edit', granted_by = EXCLUDED.granted_by;
    END IF;
END;
$$;

-- Fix refresh_all_advisor_document_permissions function
CREATE OR REPLACE FUNCTION public.refresh_all_advisor_document_permissions()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.project_access_grants (project_id, org_id, user_id, granted_by)
    SELECT p.id,
           p.owner_org_id,
           p.assigned_advisor_id,
           p.assigned_advisor_id
    FROM public.projects p
    WHERE p.assigned_advisor_id IS NOT NULL
    ON CONFLICT (project_id, user_id) DO NOTHING;

    INSERT INTO public.permissions (resource_id, user_id, permission, granted_by)
    SELECT r.id,
           p.assigned_advisor_id,
           'edit',
           p.assigned_advisor_id
    FROM public.projects p
    JOIN public.resources r
      ON r.project_id = p.id
     AND r.resource_type IN (
         'PROJECT_RESUME',
         'PROJECT_DOCS_ROOT',
         'BORROWER_RESUME',
         'BORROWER_DOCS_ROOT'
     )
    WHERE p.assigned_advisor_id IS NOT NULL
    ON CONFLICT (resource_id, user_id)
    DO UPDATE SET permission = 'edit', granted_by = EXCLUDED.granted_by;
END;
$$;

-- Fix backfill_all_advisor_permissions function
CREATE OR REPLACE FUNCTION public.backfill_all_advisor_permissions()
RETURNS TABLE(
    project_id UUID,
    advisor_id UUID,
    resource_type TEXT,
    resource_id UUID,
    action_taken TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_project RECORD;
    v_resource_id UUID;
    v_existing_permission RECORD;
    v_owner_org_id UUID;
    v_action TEXT;
BEGIN
    FOR v_project IN 
        SELECT 
            p.id as project_id,
            p.assigned_advisor_id,
            p.owner_org_id
        FROM public.projects p
        WHERE p.assigned_advisor_id IS NOT NULL
    LOOP
        BEGIN
            v_owner_org_id := v_project.owner_org_id;
            
            IF NOT EXISTS (
                SELECT 1 FROM public.project_access_grants
                WHERE project_id = v_project.project_id
                  AND user_id = v_project.assigned_advisor_id
            ) THEN
                INSERT INTO public.project_access_grants (project_id, org_id, user_id, granted_by)
                VALUES (
                    v_project.project_id,
                    v_owner_org_id,
                    v_project.assigned_advisor_id,
                    v_project.assigned_advisor_id
                )
                ON CONFLICT (project_id, user_id) DO NOTHING;
            END IF;
            
            SELECT id INTO v_resource_id
            FROM public.resources
            WHERE project_id = v_project.project_id
              AND resource_type = 'PROJECT_DOCS_ROOT'
            LIMIT 1;
            
            IF v_resource_id IS NOT NULL THEN
                SELECT * INTO v_existing_permission
                FROM public.permissions
                WHERE resource_id = v_resource_id
                  AND user_id = v_project.assigned_advisor_id;
                
                IF v_existing_permission IS NULL THEN
                    INSERT INTO public.permissions (resource_id, user_id, permission, granted_by)
                    VALUES (v_resource_id, v_project.assigned_advisor_id, 'edit', v_project.assigned_advisor_id)
                    ON CONFLICT (resource_id, user_id) DO NOTHING;
                    v_action := 'granted';
                ELSIF v_existing_permission.permission != 'edit' THEN
                    UPDATE public.permissions
                    SET permission = 'edit'
                    WHERE resource_id = v_resource_id
                      AND user_id = v_project.assigned_advisor_id;
                    v_action := 'upgraded';
                ELSE
                    v_action := 'already_exists';
                END IF;
                
                project_id := v_project.project_id;
                advisor_id := v_project.assigned_advisor_id;
                resource_type := 'PROJECT_DOCS_ROOT';
                resource_id := v_resource_id;
                action_taken := v_action;
                RETURN NEXT;
            END IF;
            
            SELECT id INTO v_resource_id
            FROM public.resources
            WHERE project_id = v_project.project_id
              AND resource_type = 'PROJECT_RESUME'
            LIMIT 1;
            
            IF v_resource_id IS NOT NULL THEN
                SELECT * INTO v_existing_permission
                FROM public.permissions
                WHERE resource_id = v_resource_id
                  AND user_id = v_project.assigned_advisor_id;
                
                IF v_existing_permission IS NULL THEN
                    INSERT INTO public.permissions (resource_id, user_id, permission, granted_by)
                    VALUES (v_resource_id, v_project.assigned_advisor_id, 'edit', v_project.assigned_advisor_id)
                    ON CONFLICT (resource_id, user_id) DO NOTHING;
                    v_action := 'granted';
                ELSIF v_existing_permission.permission != 'edit' THEN
                    UPDATE public.permissions
                    SET permission = 'edit'
                    WHERE resource_id = v_resource_id
                      AND user_id = v_project.assigned_advisor_id;
                    v_action := 'upgraded';
                ELSE
                    v_action := 'already_exists';
                END IF;
                
                project_id := v_project.project_id;
                advisor_id := v_project.assigned_advisor_id;
                resource_type := 'PROJECT_RESUME';
                resource_id := v_resource_id;
                action_taken := v_action;
                RETURN NEXT;
            END IF;
            
            IF v_owner_org_id IS NOT NULL THEN
                SELECT id INTO v_resource_id
                FROM public.resources
                WHERE org_id = v_owner_org_id
                  AND resource_type = 'BORROWER_RESUME'
                  AND project_id IS NULL
                LIMIT 1;
                
                IF v_resource_id IS NOT NULL THEN
                    SELECT * INTO v_existing_permission
                    FROM public.permissions
                    WHERE resource_id = v_resource_id
                      AND user_id = v_project.assigned_advisor_id;
                    
                    IF v_existing_permission IS NULL THEN
                        INSERT INTO public.permissions (resource_id, user_id, permission, granted_by)
                        VALUES (v_resource_id, v_project.assigned_advisor_id, 'edit', v_project.assigned_advisor_id)
                        ON CONFLICT DO NOTHING;
                        v_action := 'granted';
                    ELSIF v_existing_permission.permission != 'edit' THEN
                        UPDATE public.permissions
                        SET permission = 'edit'
                        WHERE resource_id = v_resource_id
                          AND user_id = v_project.assigned_advisor_id;
                        v_action := 'upgraded';
                    ELSE
                        v_action := 'already_exists';
                    END IF;
                    
                    project_id := v_project.project_id;
                    advisor_id := v_project.assigned_advisor_id;
                    resource_type := 'BORROWER_RESUME';
                    resource_id := v_resource_id;
                    action_taken := v_action;
                    RETURN NEXT;
                END IF;
                
                SELECT id INTO v_resource_id
                FROM public.resources
                WHERE org_id = v_owner_org_id
                  AND resource_type = 'BORROWER_DOCS_ROOT'
                  AND project_id IS NULL
                LIMIT 1;
                
                IF v_resource_id IS NOT NULL THEN
                    SELECT * INTO v_existing_permission
                    FROM public.permissions
                    WHERE resource_id = v_resource_id
                      AND user_id = v_project.assigned_advisor_id;
                    
                    IF v_existing_permission IS NULL THEN
                        INSERT INTO public.permissions (resource_id, user_id, permission, granted_by)
                        VALUES (v_resource_id, v_project.assigned_advisor_id, 'edit', v_project.assigned_advisor_id)
                        ON CONFLICT DO NOTHING;
                        v_action := 'granted';
                    ELSIF v_existing_permission.permission != 'edit' THEN
                        UPDATE public.permissions
                        SET permission = 'edit'
                        WHERE resource_id = v_resource_id
                          AND user_id = v_project.assigned_advisor_id;
                        v_action := 'upgraded';
                    ELSE
                        v_action := 'already_exists';
                    END IF;
                    
                    project_id := v_project.project_id;
                    advisor_id := v_project.assigned_advisor_id;
                    resource_type := 'BORROWER_DOCS_ROOT';
                    resource_id := v_resource_id;
                    action_taken := v_action;
                    RETURN NEXT;
                END IF;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to process project %: %', v_project.project_id, SQLERRM;
        END;
    END LOOP;
    
    RETURN;
END;
$$;

-- Fix on_advisor_assigned function
CREATE OR REPLACE FUNCTION public.on_advisor_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_granted_by UUID;
BEGIN
    IF NEW.assigned_advisor_id IS NOT NULL THEN
        IF TG_OP = 'INSERT' OR 
           (TG_OP = 'UPDATE' AND (OLD.assigned_advisor_id IS NULL OR OLD.assigned_advisor_id != NEW.assigned_advisor_id)) THEN
            v_granted_by := auth.uid();
            
            PERFORM public.grant_advisor_project_permissions(
                NEW.id,
                NEW.assigned_advisor_id,
                COALESCE(v_granted_by, NEW.assigned_advisor_id)
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Fix apply_bucket_storage_policies function
CREATE OR REPLACE FUNCTION public.apply_bucket_storage_policies(p_bucket_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_bucket_id TEXT := p_bucket_id;
    v_up_name TEXT := format('allow_upload_%s', v_bucket_id);
    v_sel_name TEXT := format('allow_select_%s', v_bucket_id);
    v_upd_name TEXT := format('allow_update_%s', v_bucket_id);
    v_del_name TEXT := format('allow_delete_%s', v_bucket_id);
    v_bkt_name TEXT := format('allow_bucket_%s', v_bucket_id);
BEGIN
    EXECUTE format('DROP POLICY IF EXISTS "%s" ON storage.buckets', v_bkt_name);
    EXECUTE format('CREATE POLICY "%s" ON storage.buckets FOR ALL TO public USING (id = %L)', v_bkt_name, v_bucket_id);

    EXECUTE format('DROP POLICY IF EXISTS "%s" ON storage.objects', v_up_name);
    EXECUTE format(
        'CREATE POLICY "%s" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
            bucket_id = %L AND public.can_upload_to_path_for_user(auth.uid(), bucket_id, string_to_array(name,''/''))
        )',
        v_up_name, v_bucket_id
    );

    EXECUTE format('DROP POLICY IF EXISTS "%s" ON storage.objects', v_sel_name);
    EXECUTE format(
        'CREATE POLICY "%s" ON storage.objects FOR SELECT TO authenticated USING (
            bucket_id = %L AND public.can_view(auth.uid(), public.get_resource_by_storage_path(name))
        )',
        v_sel_name, v_bucket_id
    );

    EXECUTE format('DROP POLICY IF EXISTS "%s" ON storage.objects', v_upd_name);
    EXECUTE format(
        'CREATE POLICY "%s" ON storage.objects FOR UPDATE TO authenticated USING (
            bucket_id = %L AND public.can_edit(auth.uid(), public.get_resource_by_storage_path(name))
        )',
        v_upd_name, v_bucket_id
    );

    EXECUTE format('DROP POLICY IF EXISTS "%s" ON storage.objects', v_del_name);
    EXECUTE format(
        'CREATE POLICY "%s" ON storage.objects FOR DELETE TO authenticated USING (
            bucket_id = %L AND public.can_edit(auth.uid(), public.get_resource_by_storage_path(name))
        )',
        v_del_name, v_bucket_id
    );
END;
$$;

-- Fix call_project_completion_reminders function
CREATE OR REPLACE FUNCTION public.call_project_completion_reminders()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_id bigint;
BEGIN
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') 
          || '/functions/v1/project-completion-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := jsonb_build_object('scheduled_at', now())
  ) INTO v_request_id;
  
  RETURN v_request_id;
END;
$$;

-- Fix insert_thread_message function (latest version returning JSONB)
CREATE OR REPLACE FUNCTION public.insert_thread_message(
    p_thread_id UUID,
    p_user_id UUID,
    p_content TEXT,
    p_resource_ids UUID[],
    p_reply_to BIGINT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_message_id BIGINT;
    v_event_id BIGINT;
    v_missing RECORD;
    v_project_id UUID;
    v_mentioned_ids UUID[];
    v_user_mention_regex TEXT := '@\[[^\]]+\]\(user:([0-9a-fA-F-]{36})\)';
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.chat_thread_participants
        WHERE thread_id = p_thread_id AND user_id = p_user_id
    ) THEN
        RAISE EXCEPTION 'User % is not a participant in thread %', p_user_id, p_thread_id;
    END IF;

    IF p_reply_to IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.project_messages
            WHERE id = p_reply_to AND thread_id = p_thread_id
        ) THEN
            RAISE EXCEPTION 'Reply target message % does not exist in thread %', p_reply_to, p_thread_id;
        END IF;
    END IF;

    IF p_resource_ids IS NOT NULL AND array_length(p_resource_ids, 1) > 0 THEN
        FOR v_missing IN
            SELECT * FROM public.validate_docs_for_thread(p_thread_id, p_resource_ids)
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

    INSERT INTO public.project_messages (thread_id, user_id, content, reply_to)
    VALUES (p_thread_id, p_user_id, p_content, p_reply_to)
    RETURNING id INTO v_message_id;

    IF p_resource_ids IS NOT NULL AND array_length(p_resource_ids, 1) > 0 THEN
        INSERT INTO public.message_attachments (message_id, resource_id)
        SELECT DISTINCT v_message_id, r_id
        FROM UNNEST(p_resource_ids) AS r_id;
    END IF;
    
    SELECT project_id INTO v_project_id FROM public.chat_threads WHERE id = p_thread_id;
    
    SELECT ARRAY_AGG(DISTINCT match[1]::UUID)
    INTO v_mentioned_ids
    FROM regexp_matches(p_content, v_user_mention_regex, 'g') AS match;

    INSERT INTO public.domain_events (
        event_type,
        actor_id,
        project_id,
        thread_id,
        payload
    ) VALUES (
        'chat_message_sent',
        p_user_id,
        v_project_id,
        p_thread_id,
        jsonb_build_object(
            'message_id', v_message_id,
            'full_content', p_content,
            'mentioned_user_ids', COALESCE(v_mentioned_ids, ARRAY[]::UUID[])
        )
    )
    RETURNING id INTO v_event_id;

    RETURN jsonb_build_object(
        'message_id', v_message_id,
        'event_id', v_event_id
    );
END;
$$;

-- Fix insert_document_uploaded_event function
CREATE OR REPLACE FUNCTION public.insert_document_uploaded_event(
    p_actor_id UUID,
    p_project_id UUID,
    p_resource_id UUID,
    p_payload JSONB DEFAULT '{}'::jsonb,
    p_thread_id UUID DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_event_id BIGINT;
    v_current_user_id UUID;
BEGIN
    v_current_user_id := auth.uid();
    IF v_current_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    
    IF p_actor_id != v_current_user_id THEN
        RAISE EXCEPTION 'Actor ID must match authenticated user';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM public.resources
        WHERE id = p_resource_id
          AND project_id = p_project_id
          AND resource_type = 'FILE'
    ) THEN
        RAISE EXCEPTION 'Resource does not exist or does not belong to the specified project';
    END IF;
    
    IF NOT public.can_view(v_current_user_id, p_resource_id) THEN
        RAISE EXCEPTION 'User does not have access to this resource';
    END IF;
    
    INSERT INTO public.domain_events (
        event_type,
        actor_id,
        project_id,
        resource_id,
        thread_id,
        payload
    )
    VALUES (
        'document_uploaded',
        p_actor_id,
        p_project_id,
        p_resource_id,
        p_thread_id,
        COALESCE(p_payload, '{}'::jsonb)
    )
    RETURNING id INTO v_event_id;

    RETURN v_event_id;
END;
$$;

-- Fix increment_notification_count function
CREATE OR REPLACE FUNCTION public.increment_notification_count(p_notification_id BIGINT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new_count INTEGER;
    v_current_payload JSONB;
    v_thread_name TEXT;
    v_project_name TEXT;
    v_thread_label TEXT;
BEGIN
    SELECT payload INTO v_current_payload
    FROM public.notifications
    WHERE id = p_notification_id
    FOR UPDATE;

    v_new_count := COALESCE((v_current_payload->>'count')::INTEGER, 1) + 1;
    v_thread_name := COALESCE(v_current_payload->>'thread_name', 'thread');
    v_project_name := COALESCE(v_current_payload->>'project_name', 'project');
    v_thread_label := CASE 
        WHEN v_thread_name LIKE '#%' THEN v_thread_name 
        ELSE '#' || v_thread_name 
    END;

    UPDATE public.notifications
    SET 
        payload = jsonb_set(
            jsonb_set(
                COALESCE(payload, '{}'::jsonb), 
                '{count}', 
                to_jsonb(v_new_count)
            ),
            '{thread_name}',
            to_jsonb(v_thread_name)
        ),
        title = 'New messages in ' || v_project_name,
        body = v_new_count || ' new message' ||
            CASE WHEN v_new_count = 1 THEN '' ELSE 's' END ||
            ' in **' || v_thread_label || '**',
        created_at = now()
    WHERE id = p_notification_id;

    RETURN v_new_count;
END;
$$;

-- Fix update_calendar_connections_updated_at function
CREATE OR REPLACE FUNCTION public.update_calendar_connections_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix update_meetings_updated_at function
CREATE OR REPLACE FUNCTION public.update_meetings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix insert_meeting_invited_event function
CREATE OR REPLACE FUNCTION public.insert_meeting_invited_event(
    p_actor_id UUID,
    p_project_id UUID,
    p_meeting_id UUID,
    p_invited_user_id UUID,
    p_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_event_id BIGINT;
BEGIN
    INSERT INTO public.domain_events (
        event_type,
        actor_id,
        project_id,
        meeting_id,
        payload
    )
    VALUES (
        'meeting_invited',
        p_actor_id,
        p_project_id,
        p_meeting_id,
        COALESCE(p_payload, '{}'::jsonb) || jsonb_build_object(
            'invited_user_id', p_invited_user_id,
            'meeting_id', p_meeting_id
        )
    )
    RETURNING id INTO v_event_id;

    RETURN v_event_id;
END;
$$;

-- Fix on_meeting_participant_inserted function
CREATE OR REPLACE FUNCTION public.on_meeting_participant_inserted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_meeting RECORD;
    v_organizer_id UUID;
BEGIN
    SELECT 
        m.id,
        m.organizer_id,
        m.project_id,
        m.title,
        m.start_time,
        m.end_time,
        m.meeting_link
    INTO v_meeting
    FROM public.meetings m
    WHERE m.id = NEW.meeting_id;

    IF NEW.user_id != v_meeting.organizer_id THEN
        PERFORM public.insert_meeting_invited_event(
            p_actor_id := v_meeting.organizer_id,
            p_project_id := v_meeting.project_id,
            p_meeting_id := NEW.meeting_id,
            p_invited_user_id := NEW.user_id,
            p_payload := jsonb_build_object(
                'meeting_title', v_meeting.title,
                'start_time', v_meeting.start_time,
                'end_time', v_meeting.end_time,
                'meeting_link', v_meeting.meeting_link
            )
        );
    END IF;

    RETURN NEW;
END;
$$;

-- Fix insert_meeting_updated_event function
CREATE OR REPLACE FUNCTION public.insert_meeting_updated_event(
    p_actor_id UUID,
    p_project_id UUID,
    p_meeting_id UUID,
    p_changes JSONB DEFAULT '{}'::jsonb
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_event_id BIGINT;
    v_meeting RECORD;
BEGIN
    SELECT 
        m.id,
        m.title,
        m.start_time,
        m.end_time,
        m.meeting_link
    INTO v_meeting
    FROM public.meetings m
    WHERE m.id = p_meeting_id;

    INSERT INTO public.domain_events (
        event_type,
        actor_id,
        project_id,
        meeting_id,
        payload
    )
    VALUES (
        'meeting_updated',
        p_actor_id,
        p_project_id,
        p_meeting_id,
        jsonb_build_object(
            'meeting_id', p_meeting_id,
            'meeting_title', v_meeting.title,
            'start_time', v_meeting.start_time,
            'end_time', v_meeting.end_time,
            'meeting_link', v_meeting.meeting_link,
            'changes', p_changes
        )
    )
    RETURNING id INTO v_event_id;

    RETURN v_event_id;
END;
$$;

-- Fix insert_meeting_reminder_event function
CREATE OR REPLACE FUNCTION public.insert_meeting_reminder_event(
    p_meeting_id UUID,
    p_user_id UUID,
    p_reminder_minutes INTEGER
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_event_id BIGINT;
    v_meeting RECORD;
BEGIN
    SELECT 
        m.id,
        m.title,
        m.start_time,
        m.end_time,
        m.meeting_link,
        m.project_id,
        m.organizer_id
    INTO v_meeting
    FROM public.meetings m
    WHERE m.id = p_meeting_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Meeting not found: %', p_meeting_id;
    END IF;

    INSERT INTO public.domain_events (
        event_type,
        actor_id,
        project_id,
        meeting_id,
        payload
    )
    VALUES (
        'meeting_reminder',
        p_user_id,
        v_meeting.project_id,
        p_meeting_id,
        jsonb_build_object(
            'meeting_id', p_meeting_id,
            'user_id', p_user_id,
            'meeting_title', v_meeting.title,
            'start_time', v_meeting.start_time,
            'end_time', v_meeting.end_time,
            'meeting_link', v_meeting.meeting_link,
            'reminder_minutes', p_reminder_minutes,
            'organizer_id', v_meeting.organizer_id
        )
    )
    RETURNING id INTO v_event_id;

    RETURN v_event_id;
END;
$$;

-- Fix get_meetings_needing_reminders function
CREATE OR REPLACE FUNCTION public.get_meetings_needing_reminders(
    p_minutes_before INTEGER DEFAULT 30
)
RETURNS TABLE (
    meeting_id UUID,
    participant_id UUID,
    meeting_title TEXT,
    start_time TIMESTAMPTZ,
    meeting_link TEXT,
    project_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id as meeting_id,
        mp.user_id as participant_id,
        m.title as meeting_title,
        m.start_time,
        m.meeting_link,
        m.project_id
    FROM public.meetings m
    INNER JOIN public.meeting_participants mp ON m.id = mp.meeting_id
    WHERE 
        m.status = 'scheduled'
        AND m.start_time > NOW()
        AND m.start_time <= NOW() + (p_minutes_before || ' minutes')::INTERVAL
        AND NOT EXISTS (
            SELECT 1 FROM public.meeting_reminders_sent mrs
            WHERE mrs.meeting_id = m.id
            AND mrs.user_id = mp.user_id
            AND mrs.reminder_type = p_minutes_before || 'min'
        );
END;
$$;

-- Fix call_resume_nudges function
CREATE OR REPLACE FUNCTION public.call_resume_nudges()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_id bigint;
BEGIN
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
          || '/functions/v1/resume-nudges',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := jsonb_build_object('scheduled_at', now())
  ) INTO v_request_id;

  RETURN v_request_id;
END;
$$;

-- Fix call_resume_incomplete_nudges function
CREATE OR REPLACE FUNCTION public.call_resume_incomplete_nudges()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_id bigint;
BEGIN
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') 
          || '/functions/v1/resume-incomplete-nudges',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := jsonb_build_object('scheduled_at', now())
  ) INTO v_request_id;
  
  RETURN v_request_id;
END;
$$;

-- Fix call_unread_thread_nudges function
CREATE OR REPLACE FUNCTION public.call_unread_thread_nudges()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_request_id bigint;
BEGIN
    SELECT net.http_post(
        url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') 
              || '/functions/v1/unread-thread-nudges',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
        ),
        body := jsonb_build_object('scheduled_at', now())
    ) INTO v_request_id;
    
    RETURN v_request_id;
END;
$$;

-- Fix get_pending_notification_events function
CREATE OR REPLACE FUNCTION public.get_pending_notification_events(p_limit INT DEFAULT 500)
RETURNS TABLE (
    id BIGINT,
    event_type TEXT,
    actor_id UUID,
    project_id UUID,
    org_id UUID,
    resource_id UUID,
    thread_id UUID,
    meeting_id UUID,
    occurred_at TIMESTAMPTZ,
    payload JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        de.id,
        de.event_type,
        de.actor_id,
        de.project_id,
        de.org_id,
        de.resource_id,
        de.thread_id,
        de.meeting_id,
        de.occurred_at,
        de.payload
    FROM public.domain_events de
    LEFT JOIN public.notification_processing np ON de.id = np.event_id
    WHERE (np.event_id IS NULL OR np.processing_status = 'failed')
      AND de.occurred_at > NOW() - INTERVAL '24 hours'
    ORDER BY de.occurred_at ASC
    LIMIT p_limit;
END;
$$;

-- Fix touch_project_workspace_activity function
CREATE OR REPLACE FUNCTION public.touch_project_workspace_activity(
  p_project_id UUID,
  p_last_visited_at TIMESTAMPTZ DEFAULT NULL,
  p_last_step_id TEXT DEFAULT NULL,
  p_last_project_resume_edit_at TIMESTAMPTZ DEFAULT NULL,
  p_last_borrower_resume_edit_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.project_workspace_activity (
    user_id,
    project_id,
    last_visited_at,
    last_step_id,
    last_project_resume_edit_at,
    last_borrower_resume_edit_at
  )
  VALUES (
    v_user_id,
    p_project_id,
    p_last_visited_at,
    p_last_step_id,
    p_last_project_resume_edit_at,
    p_last_borrower_resume_edit_at
  )
  ON CONFLICT (user_id, project_id)
  DO UPDATE SET
    last_visited_at = COALESCE(EXCLUDED.last_visited_at, public.project_workspace_activity.last_visited_at),
    last_step_id = COALESCE(EXCLUDED.last_step_id, public.project_workspace_activity.last_step_id),
    last_project_resume_edit_at = COALESCE(
      EXCLUDED.last_project_resume_edit_at,
      public.project_workspace_activity.last_project_resume_edit_at
    ),
    last_borrower_resume_edit_at = COALESCE(
      EXCLUDED.last_borrower_resume_edit_at,
      public.project_workspace_activity.last_borrower_resume_edit_at
    ),
    updated_at = now();
END;
$$;

-- Fix insert_chat_thread_participant_added_event function
CREATE OR REPLACE FUNCTION public.insert_chat_thread_participant_added_event(
    p_actor_id UUID,
    p_project_id UUID,
    p_thread_id UUID,
    p_added_user_id UUID,
    p_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_event_id BIGINT;
BEGIN
    INSERT INTO public.domain_events (
        event_type,
        actor_id,
        project_id,
        thread_id,
        payload
    )
    VALUES (
        'chat_thread_participant_added',
        p_actor_id,
        p_project_id,
        p_thread_id,
        COALESCE(p_payload, '{}'::jsonb) || jsonb_build_object(
            'added_user_id', p_added_user_id,
            'thread_id', p_thread_id
        )
    )
    RETURNING id INTO v_event_id;

    RETURN v_event_id;
END;
$$;

-- Fix ensure_project_borrower_roots function
CREATE OR REPLACE FUNCTION public.ensure_project_borrower_roots(p_project_id UUID)
RETURNS TABLE (borrower_resume_resource_id UUID, borrower_docs_root_resource_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_project RECORD;
BEGIN
    SELECT id, owner_org_id, name
    INTO v_project
    FROM public.projects
    WHERE id = p_project_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Project % not found', p_project_id;
    END IF;

    INSERT INTO public.resources (org_id, project_id, parent_id, resource_type, name)
    VALUES (v_project.owner_org_id, v_project.id, NULL, 'BORROWER_RESUME', v_project.name || ' Borrower Resume')
    ON CONFLICT DO NOTHING;

    INSERT INTO public.resources (org_id, project_id, parent_id, resource_type, name)
    VALUES (v_project.owner_org_id, v_project.id, NULL, 'BORROWER_DOCS_ROOT', v_project.name || ' Borrower Documents')
    ON CONFLICT DO NOTHING;

    RETURN QUERY
    SELECT
        (SELECT id FROM public.resources WHERE project_id = v_project.id AND resource_type = 'BORROWER_RESUME' LIMIT 1),
        (SELECT id FROM public.resources WHERE project_id = v_project.id AND resource_type = 'BORROWER_DOCS_ROOT' LIMIT 1);
END;
$$;

-- Fix rollback_project_resume_version function (latest version)
CREATE OR REPLACE FUNCTION public.rollback_project_resume_version(
  p_resource_id UUID,
  p_resume_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id UUID;
  v_resource_project_id UUID;
BEGIN
  IF NOT public.can_edit(auth.uid(), p_resource_id) THEN
    RAISE EXCEPTION 'User does not have permission to edit this resource.';
  END IF;

  SELECT project_id INTO v_project_id
  FROM public.project_resumes
  WHERE id = p_resume_id;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'The specified resume version does not exist.';
  END IF;

  SELECT project_id INTO v_resource_project_id
  FROM public.resources
  WHERE id = p_resource_id;

  IF v_resource_project_id IS NULL OR v_resource_project_id <> v_project_id THEN
    RAISE EXCEPTION 'Resume version does not belong to the provided resource.';
  END IF;

  UPDATE public.resources
  SET current_version_id = p_resume_id
  WHERE id = p_resource_id;
END;
$$;

-- Fix rollback_borrower_resume_version function (latest version)
CREATE OR REPLACE FUNCTION public.rollback_borrower_resume_version(p_resource_id UUID, p_resume_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id UUID;
  v_target_version INT;
  v_resource_project_id UUID;
BEGIN
  IF NOT public.can_edit(auth.uid(), p_resource_id) THEN
    RAISE EXCEPTION 'User does not have permission to edit this resource.';
  END IF;

  SELECT project_id, version_number INTO v_project_id, v_target_version
  FROM public.borrower_resumes
  WHERE id = p_resume_id;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'The specified resume version does not exist.';
  END IF;

  SELECT project_id INTO v_resource_project_id
  FROM public.resources
  WHERE id = p_resource_id;

  IF v_resource_project_id IS NULL OR v_resource_project_id <> v_project_id THEN
    RAISE EXCEPTION 'Resume version does not belong to the provided resource.';
  END IF;

  UPDATE public.resources
  SET current_version_id = p_resume_id
  WHERE id = p_resource_id;
END;
$$;

