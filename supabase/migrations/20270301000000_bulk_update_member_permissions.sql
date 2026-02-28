-- Migration: Introduce bulk_update_member_permissions() RPC
--
-- Replaces the FastAPI /api/v1/users/update-member-permissions endpoint with a
-- single SECURITY DEFINER Postgres function that:
--   1. Authenticates via auth.uid() and requires the caller to be an org owner.
--   2. Atomically wipes + re-creates project_access_grants and permissions rows
--      for the target user on all of the org's projects (wipe-and-replace inside
--      a single transaction – no races).
--   3. Diffs old-vs-new state before the wipe to emit exactly 6 event types:
--        project_access_granted   / project_access_changed
--        document_permission_granted / document_permission_changed
--        resume_permission_granted   / resume_permission_changed
--   4. Cascades per-file events to all FILE descendants of PROJECT_DOCS_ROOT /
--      BORROWER_DOCS_ROOT roots that had a permission change, skipping files
--      that have an explicit fileOverride in the payload (custom mode).
--
-- p_project_grants shape (JSONB array):
--   [
--     {
--       "projectId": "<uuid>",
--       "permissions": [                      -- root resource-type permissions
--         { "resource_type": "PROJECT_RESUME", "permission": "view" },
--         { "resource_type": "PROJECT_DOCS_ROOT", "permission": "edit" },
--         ...
--       ],
--       "fileOverrides": [                    -- optional per-file overrides
--         { "resource_id": "<uuid>", "permission": "view" },
--         ...
--       ]
--     },
--     ...
--   ]

CREATE OR REPLACE FUNCTION public.bulk_update_member_permissions(
    p_org_id        UUID,
    p_user_id       UUID,
    p_project_grants JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    -- Auth / ownership
    v_actor_id          UUID;

    -- Org projects
    v_org_project_ids   UUID[];

    -- Old-state snapshots (captured before wipe)
    v_old_grant_pids    UUID[];                  -- projects user previously had access to
    v_old_res_perms     JSONB;                   -- {resource_id::text -> permission}
    v_old_proj_levels   JSONB;                   -- {project_id::text -> 'view'|'edit'|'custom'}
    v_old_custom_roots  UUID[];                  -- docs roots that were in custom mode before

    -- Loop / temp variables
    _grant_rec          RECORD;
    _perm_rec           RECORD;
    _fo_rec             RECORD;
    v_grant             JSONB;
    v_perm_entry        JSONB;
    v_fo_entry          JSONB;

    v_project_id        UUID;
    v_project_name      TEXT;
    v_resource_id       UUID;
    v_resource_type     TEXT;
    v_resource_name     TEXT;
    v_resource_pid      UUID;
    v_permission        TEXT;
    v_old_permission    TEXT;
    v_display_name      TEXT;
    v_event_type        TEXT;
    v_old_proj_level    TEXT;
    v_new_proj_level    TEXT;
    v_is_custom_root    BOOLEAN;

    -- Cascade tracking (parallel arrays: one element per docs-root that changed)
    v_cascade_roots     UUID[];
    v_cascade_old       TEXT[];
    v_cascade_new       TEXT[];
    v_cascade_pids      UUID[];

    -- All file-override IDs across all grants (for cascade exclusion)
    v_all_fo_ids        UUID[];

    i                   INT;
BEGIN
    -- ------------------------------------------------------------------ --
    -- 1. Authentication & authorisation
    -- ------------------------------------------------------------------ --
    v_actor_id := auth.uid();
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF NOT public.is_org_owner(p_org_id, v_actor_id) THEN
        RAISE EXCEPTION 'Only org owners can manage member permissions';
    END IF;

    -- ------------------------------------------------------------------ --
    -- 2. Validate target user belongs to the org
    -- ------------------------------------------------------------------ --
    IF NOT EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_id = p_org_id AND user_id = p_user_id
    ) THEN
        RAISE EXCEPTION 'Target user is not a member of this organization';
    END IF;

    -- ------------------------------------------------------------------ --
    -- 3. Resolve all project IDs that belong to this org
    -- ------------------------------------------------------------------ --
    SELECT array_agg(id)
    INTO v_org_project_ids
    FROM public.projects
    WHERE owner_org_id = p_org_id;

    IF v_org_project_ids IS NULL THEN
        v_org_project_ids := ARRAY[]::UUID[];
    END IF;

    -- ------------------------------------------------------------------ --
    -- 4. Snapshot old state (BEFORE any mutations so we can diff later)
    -- ------------------------------------------------------------------ --
    IF array_length(v_org_project_ids, 1) > 0 THEN

        -- 4a. Which projects the user currently has a grant for
        SELECT array_agg(project_id)
        INTO v_old_grant_pids
        FROM public.project_access_grants
        WHERE user_id = p_user_id
          AND project_id = ANY(v_org_project_ids);

        -- 4b. Per-resource permission map
        SELECT jsonb_object_agg(p.resource_id::text, p.permission)
        INTO v_old_res_perms
        FROM public.permissions p
        JOIN public.resources r ON r.id = p.resource_id
        WHERE p.user_id = p_user_id
          AND r.project_id = ANY(v_org_project_ids);

        -- 4c. Detect which docs roots were in "custom" mode in old state.
        --     A docs root was custom if any FILE descendant had an explicit
        --     permission row for this user (non-custom roots rely on implicit
        --     cascade from root, so only FILE perms exist when custom).
        SELECT array_agg(DISTINCT dr.id)
        INTO v_old_custom_roots
        FROM public.resources dr
        WHERE dr.project_id = ANY(v_org_project_ids)
          AND dr.resource_type IN ('PROJECT_DOCS_ROOT', 'BORROWER_DOCS_ROOT')
          AND EXISTS (
              WITH RECURSIVE desc_r AS (
                  SELECT r.id FROM public.resources r WHERE r.parent_id = dr.id
                  UNION ALL
                  SELECT r.id FROM public.resources r JOIN desc_r d ON r.parent_id = d.id
              )
              SELECT 1
              FROM desc_r d
              JOIN public.resources fr ON fr.id = d.id AND fr.resource_type = 'FILE'
              JOIN public.permissions fp ON fp.resource_id = d.id AND fp.user_id = p_user_id
          );

        -- 4d. Per-project effective permission level
        --     Mirrors the new-state logic: 'custom' if any docs root was custom,
        --     or if resource permissions are mixed across the 4 expected root
        --     types, or if fewer than all 4 roots had permissions; otherwise
        --     the common value.
        SELECT jsonb_object_agg(project_id::text, eff_level)
        INTO v_old_proj_levels
        FROM (
            SELECT r.project_id,
                   CASE
                       -- If any docs root in this project was custom → project is custom
                       WHEN v_old_custom_roots IS NOT NULL
                            AND EXISTS (
                                SELECT 1 FROM unnest(v_old_custom_roots) cr(id)
                                JOIN public.resources cr_r ON cr_r.id = cr.id
                                WHERE cr_r.project_id = r.project_id
                            )
                           THEN 'custom'
                       -- If not all 4 root resource types have permissions → custom
                       -- (some resources have perms, others don't → mixed/partial)
                       WHEN count(DISTINCT r.resource_type) < 4 THEN 'custom'
                       -- All 4 root resource types present and all same permission
                       WHEN count(DISTINCT p.permission) = 1 THEN min(p.permission)
                       -- Mixed → custom
                       ELSE 'custom'
                   END AS eff_level
            FROM public.permissions p
            JOIN public.resources r ON r.id = p.resource_id
            WHERE p.user_id = p_user_id
              AND r.project_id = ANY(v_org_project_ids)
              AND r.resource_type IN ('PROJECT_RESUME', 'BORROWER_RESUME',
                                     'PROJECT_DOCS_ROOT', 'BORROWER_DOCS_ROOT')
            GROUP BY r.project_id
        ) t;

    END IF;

    -- Default NULLs to empty objects/arrays so lookups below don't fail
    IF v_old_grant_pids  IS NULL THEN v_old_grant_pids  := ARRAY[]::UUID[];    END IF;
    IF v_old_res_perms   IS NULL THEN v_old_res_perms   := '{}'::JSONB;        END IF;
    IF v_old_proj_levels IS NULL THEN v_old_proj_levels := '{}'::JSONB;        END IF;
    IF v_old_custom_roots IS NULL THEN v_old_custom_roots := ARRAY[]::UUID[];  END IF;

    -- ------------------------------------------------------------------ --
    -- 5. Wipe existing grants and permissions for this user on org projects
    -- ------------------------------------------------------------------ --
    IF array_length(v_org_project_ids, 1) > 0 THEN
        DELETE FROM public.project_access_grants
        WHERE user_id = p_user_id
          AND project_id = ANY(v_org_project_ids);

        DELETE FROM public.permissions
        WHERE user_id = p_user_id
          AND resource_id IN (
              SELECT id FROM public.resources
              WHERE project_id = ANY(v_org_project_ids)
          );
    END IF;

    -- ------------------------------------------------------------------ --
    -- 6. Pre-compute all file-override IDs across all grants
    --    (used to exclude explicitly overridden files from root cascade)
    -- ------------------------------------------------------------------ --
    IF p_project_grants IS NOT NULL AND jsonb_typeof(p_project_grants) = 'array' THEN
        SELECT array_agg((fo->>'resource_id')::UUID)
        INTO v_all_fo_ids
        FROM jsonb_array_elements(p_project_grants) AS g
        CROSS JOIN jsonb_array_elements(
            COALESCE(g->'fileOverrides', '[]'::JSONB)
        ) AS fo
        WHERE fo->>'resource_id' IS NOT NULL;
    END IF;
    IF v_all_fo_ids IS NULL THEN v_all_fo_ids := ARRAY[]::UUID[]; END IF;

    -- Init cascade tracking arrays
    v_cascade_roots := ARRAY[]::UUID[];
    v_cascade_old   := ARRAY[]::TEXT[];
    v_cascade_new   := ARRAY[]::TEXT[];
    v_cascade_pids  := ARRAY[]::UUID[];

    -- ------------------------------------------------------------------ --
    -- 7. Process each project grant from the payload
    -- ------------------------------------------------------------------ --
    IF p_project_grants IS NOT NULL AND jsonb_typeof(p_project_grants) = 'array' THEN

        FOR _grant_rec IN
            SELECT value AS obj FROM jsonb_array_elements(p_project_grants)
        LOOP
            v_grant := _grant_rec.obj;
            v_project_id := (v_grant->>'projectId')::UUID;

            -- Skip projects that don't belong to this org
            IF NOT (v_project_id = ANY(v_org_project_ids)) THEN
                CONTINUE;
            END IF;

            SELECT name INTO v_project_name
            FROM public.projects WHERE id = v_project_id;

            -- 7a. Insert project access grant
            INSERT INTO public.project_access_grants
                (project_id, org_id, user_id, granted_by)
            VALUES
                (v_project_id, p_org_id, p_user_id, v_actor_id);

            -- 7b. Determine new project-level permission
            --   - If fileOverrides exist → 'custom' (fine-grained per-file control)
            --   - If all resource permissions identical → that value ('view'/'edit')
            --   - If resource permissions are mixed → 'custom'
            --   - If no permissions → 'none'
            v_new_proj_level := 'none';
            IF v_grant->'permissions' IS NOT NULL
               AND jsonb_typeof(v_grant->'permissions') = 'array'
               AND jsonb_array_length(v_grant->'permissions') > 0
            THEN
                -- Presence of any fileOverrides means at least one docs root is custom
                IF v_grant->'fileOverrides' IS NOT NULL
                   AND jsonb_typeof(v_grant->'fileOverrides') = 'array'
                   AND jsonb_array_length(v_grant->'fileOverrides') > 0
                THEN
                    v_new_proj_level := 'custom';
                ELSE
                    SELECT CASE
                        WHEN count(DISTINCT pe->>'permission') = 1 THEN min(pe->>'permission')
                        ELSE 'custom'
                    END
                    INTO v_new_proj_level
                    FROM jsonb_array_elements(v_grant->'permissions') AS pe;
                END IF;
            END IF;

            -- 7c. Emit project-level domain event
            --     Normalise v_old_proj_level: if the project had an access_grant
            --     but NO resource-level permissions, the key won't exist in
            --     v_old_proj_levels – treat it as 'none'.
            v_old_proj_level := COALESCE(
                v_old_proj_levels->>v_project_id::text,
                'none'
            );

            IF NOT (v_project_id = ANY(v_old_grant_pids))
               OR v_old_proj_level = 'none'
            THEN
                -- Brand new grant  (no prior access-grant row, **or** grant row
                -- existed but no resource-level permissions were set – effectively
                -- a fresh/first-time grant).
                IF v_new_proj_level <> 'none' THEN
                    INSERT INTO public.domain_events
                        (event_type, actor_id, project_id, payload)
                    VALUES (
                        'project_access_granted',
                        v_actor_id,
                        v_project_id,
                        jsonb_build_object(
                            'affected_user_id', p_user_id::text,
                            'project_id',       v_project_id::text,
                            'project_name',     COALESCE(v_project_name, ''),
                            'new_permission',   v_new_proj_level
                        )
                    );
                END IF;
            ELSIF v_old_proj_level IS DISTINCT FROM v_new_proj_level THEN
                -- Access existed with real permissions but effective level changed
                INSERT INTO public.domain_events
                    (event_type, actor_id, project_id, payload)
                VALUES (
                    'project_access_changed',
                    v_actor_id,
                    v_project_id,
                    jsonb_build_object(
                        'affected_user_id', p_user_id::text,
                        'project_id',       v_project_id::text,
                        'project_name',     COALESCE(v_project_name, ''),
                        'old_permission',   v_old_proj_level,
                        'new_permission',   v_new_proj_level
                    )
                );
            END IF;

            -- 7d. Process per-resource-type permissions
            IF v_grant->'permissions' IS NOT NULL
               AND jsonb_typeof(v_grant->'permissions') = 'array'
            THEN
                FOR _perm_rec IN
                    SELECT value AS pe FROM jsonb_array_elements(v_grant->'permissions')
                LOOP
                    v_perm_entry  := _perm_rec.pe;
                    v_resource_type := v_perm_entry->>'resource_type';
                    v_permission    := v_perm_entry->>'permission';

                    IF v_permission NOT IN ('view', 'edit') THEN CONTINUE; END IF;

                    -- Look up the concrete resource row for this type in this project
                    SELECT id, name, resource_type
                    INTO v_resource_id, v_resource_name, v_resource_type
                    FROM public.resources
                    WHERE project_id = v_project_id
                      AND resource_type = v_resource_type
                    LIMIT 1;

                    IF NOT FOUND THEN CONTINUE; END IF;

                    -- Insert the permission row
                    INSERT INTO public.permissions
                        (resource_id, user_id, permission, granted_by)
                    VALUES
                        (v_resource_id, p_user_id, v_permission, v_actor_id);

                    -- Resolve a human-readable display name
                    v_display_name := CASE v_resource_type
                        WHEN 'PROJECT_RESUME'             THEN 'Project Resume'
                        WHEN 'PROJECT_DOCS_ROOT'          THEN 'Project Documents'
                        WHEN 'BORROWER_RESUME'            THEN 'Borrower Resume'
                        WHEN 'BORROWER_DOCS_ROOT'         THEN 'Borrower Documents'
                        WHEN 'UNDERWRITING_TEMPLATES_ROOT' THEN 'Underwriting Templates'
                        ELSE COALESCE(v_resource_name, '')
                    END;

                    -- --------------------------------------------------------
                    -- Detect "custom" mode for docs roots:
                    -- A docs root is "custom" when there are fileOverrides
                    -- that are descendants of this root.
                    -- --------------------------------------------------------
                    v_is_custom_root := FALSE;
                    IF v_resource_type IN ('PROJECT_DOCS_ROOT', 'BORROWER_DOCS_ROOT')
                       AND v_grant->'fileOverrides' IS NOT NULL
                       AND jsonb_typeof(v_grant->'fileOverrides') = 'array'
                       AND jsonb_array_length(v_grant->'fileOverrides') > 0
                    THEN
                        -- Check if any fileOverride resource_id is a descendant of this root
                        IF EXISTS (
                            WITH RECURSIVE descendants AS (
                                SELECT r.id FROM public.resources r WHERE r.parent_id = v_resource_id
                                UNION ALL
                                SELECT r.id FROM public.resources r JOIN descendants d ON r.parent_id = d.id
                            )
                            SELECT 1
                            FROM jsonb_array_elements(v_grant->'fileOverrides') AS fo
                            JOIN descendants d ON d.id = (fo->>'resource_id')::UUID
                            LIMIT 1
                        ) THEN
                            v_is_custom_root := TRUE;
                        END IF;
                    END IF;

                    -- Look up old permission from pre-wipe snapshot
                    v_old_permission := v_old_res_perms->>v_resource_id::text;

                    -- Determine effective old permission for this resource.
                    -- If the root was previously in custom mode, its effective old
                    -- permission is 'custom' (not the raw DB value).
                    IF v_resource_type IN ('PROJECT_DOCS_ROOT', 'BORROWER_DOCS_ROOT')
                       AND v_resource_id = ANY(v_old_custom_roots)
                    THEN
                        v_old_permission := 'custom';
                    END IF;

                    -- Determine effective new permission for comparison
                    -- If this root is now custom, new effective = 'custom'
                    -- Otherwise it's the raw v_permission (view/edit)
                    IF v_is_custom_root THEN
                        -- New is 'custom'. Skip if old was also 'custom'.
                        IF v_old_permission = 'custom' THEN
                            CONTINUE;
                        END IF;
                    ELSE
                        -- New is the raw permission. Skip if unchanged.
                        IF v_old_permission IS NOT DISTINCT FROM v_permission THEN
                            CONTINUE;
                        END IF;
                    END IF;

                    -- Determine event type: resume vs document categories
                    IF v_resource_type IN ('PROJECT_RESUME', 'BORROWER_RESUME') THEN
                        -- ---- Resume events ----
                        v_event_type := CASE
                            WHEN v_old_permission IS NULL OR v_old_permission = 'none'
                                THEN 'resume_permission_granted'
                            ELSE 'resume_permission_changed'
                        END;

                        INSERT INTO public.domain_events
                            (event_type, actor_id, project_id, resource_id, payload)
                        VALUES (
                            v_event_type,
                            v_actor_id,
                            v_project_id,
                            v_resource_id,
                            CASE v_event_type
                                WHEN 'resume_permission_granted' THEN
                                    jsonb_build_object(
                                        'affected_user_id', p_user_id::text,
                                        'resource_name',    v_display_name,
                                        'new_permission',   v_permission
                                    )
                                ELSE
                                    jsonb_build_object(
                                        'affected_user_id', p_user_id::text,
                                        'resource_name',    v_display_name,
                                        'old_permission',   v_old_permission,
                                        'new_permission',   v_permission
                                    )
                            END
                        );

                    ELSE
                        -- ---- Document events (docs roots, underwriting, OM, etc.) ----
                        v_event_type := CASE
                            WHEN v_old_permission IS NULL OR v_old_permission = 'none'
                                THEN 'document_permission_granted'
                            ELSE 'document_permission_changed'
                        END;

                        INSERT INTO public.domain_events
                            (event_type, actor_id, project_id, resource_id, payload)
                        VALUES (
                            v_event_type,
                            v_actor_id,
                            v_project_id,
                            v_resource_id,
                            CASE v_event_type
                                WHEN 'document_permission_granted' THEN
                                    jsonb_build_object(
                                        'affected_user_id', p_user_id::text,
                                        'resource_name',    v_display_name,
                                        'new_permission',   CASE WHEN v_is_custom_root THEN 'custom' ELSE v_permission END
                                    )
                                ELSE
                                    jsonb_build_object(
                                        'affected_user_id', p_user_id::text,
                                        'resource_name',    v_display_name,
                                        'old_permission',   COALESCE(v_old_permission, 'none'),
                                        'new_permission',   CASE WHEN v_is_custom_root THEN 'custom' ELSE v_permission END
                                    )
                            END
                        );

                        -- Track docs roots for per-file cascade
                        -- Skip cascade when root is 'custom' — overridden files already
                        -- get their own events from section 7e, and non-overridden files
                        -- don't need individual events when the root says 'custom'.
                        IF v_resource_type IN ('PROJECT_DOCS_ROOT', 'BORROWER_DOCS_ROOT')
                           AND v_permission IN ('view', 'edit')
                           AND NOT v_is_custom_root
                        THEN
                            v_cascade_roots := v_cascade_roots || v_resource_id;
                            v_cascade_old   := v_cascade_old   || COALESCE(v_old_permission, 'none');
                            v_cascade_new   := v_cascade_new   || v_permission;
                            v_cascade_pids  := v_cascade_pids  || v_project_id;
                        END IF;

                    END IF;
                END LOOP; -- permissions
            END IF;

            -- 7e. Process file-level overrides
            IF v_grant->'fileOverrides' IS NOT NULL
               AND jsonb_typeof(v_grant->'fileOverrides') = 'array'
            THEN
                FOR _fo_rec IN
                    SELECT value AS fo FROM jsonb_array_elements(v_grant->'fileOverrides')
                LOOP
                    v_fo_entry   := _fo_rec.fo;
                    v_resource_id := (v_fo_entry->>'resource_id')::UUID;
                    v_permission  := v_fo_entry->>'permission';

                    IF v_permission NOT IN ('view', 'edit', 'none') THEN CONTINUE; END IF;
                    IF v_resource_id IS NULL THEN CONTINUE; END IF;

                    -- Validate: must be a FILE in this project
                    SELECT r.id, r.name, r.project_id
                    INTO v_resource_id, v_resource_name, v_resource_pid
                    FROM public.resources r
                    WHERE r.id = v_resource_id
                      AND r.resource_type = 'FILE'
                      AND r.project_id = v_project_id;

                    IF NOT FOUND THEN CONTINUE; END IF;

                    -- Skip files under UNDERWRITING_TEMPLATES_ROOT
                    IF EXISTS (
                        WITH RECURSIVE anc AS (
                            SELECT parent_id, resource_type
                            FROM public.resources
                            WHERE id = v_resource_id
                            UNION ALL
                            SELECT r.parent_id, r.resource_type
                            FROM public.resources r
                            JOIN anc ON r.id = anc.parent_id
                            WHERE anc.parent_id IS NOT NULL
                        )
                        SELECT 1 FROM anc WHERE resource_type = 'UNDERWRITING_TEMPLATES_ROOT'
                    ) THEN
                        CONTINUE;
                    END IF;

                    -- Insert the permission row
                    INSERT INTO public.permissions
                        (resource_id, user_id, permission, granted_by)
                    VALUES
                        (v_resource_id, p_user_id, v_permission, v_actor_id);

                    -- Emit document event for view/edit overrides if permission changed
                    IF v_permission IN ('view', 'edit') THEN
                        v_old_permission := v_old_res_perms->>v_resource_id::text;

                        IF v_old_permission IS DISTINCT FROM v_permission THEN
                            v_event_type := CASE
                                WHEN v_old_permission IS NULL OR v_old_permission = 'none'
                                    THEN 'document_permission_granted'
                                ELSE 'document_permission_changed'
                            END;

                            INSERT INTO public.domain_events
                                (event_type, actor_id, project_id, resource_id, payload)
                            VALUES (
                                v_event_type,
                                v_actor_id,
                                v_project_id,
                                v_resource_id,
                                CASE v_event_type
                                    WHEN 'document_permission_granted' THEN
                                        jsonb_build_object(
                                            'affected_user_id', p_user_id::text,
                                            'resource_name',    COALESCE(v_resource_name, ''),
                                            'new_permission',   v_permission
                                        )
                                    ELSE
                                        jsonb_build_object(
                                            'affected_user_id', p_user_id::text,
                                            'resource_name',    COALESCE(v_resource_name, ''),
                                            'old_permission',   v_old_permission,
                                            'new_permission',   v_permission
                                        )
                                END
                            );
                        END IF;
                    END IF;

                END LOOP; -- fileOverrides
            END IF;

        END LOOP; -- project grants
    END IF;

    -- ------------------------------------------------------------------ --
    -- 8. Cascade per-file events for changed docs roots
    --    (emit one event per FILE descendant, excluding explicit overrides)
    -- ------------------------------------------------------------------ --
    IF array_length(v_cascade_roots, 1) > 0 THEN
        FOR i IN 1..array_length(v_cascade_roots, 1) LOOP

            INSERT INTO public.domain_events
                (event_type, actor_id, project_id, resource_id, payload)
            WITH RECURSIVE descendants AS (
                SELECT r.id, r.name
                FROM public.resources r
                WHERE r.parent_id = v_cascade_roots[i]
                UNION ALL
                SELECT r.id, r.name
                FROM public.resources r
                JOIN descendants d ON r.parent_id = d.id
            )
            SELECT
                CASE
                    WHEN v_cascade_old[i] = 'none'
                        THEN 'document_permission_granted'
                    ELSE 'document_permission_changed'
                END,
                v_actor_id,
                v_cascade_pids[i],
                d.id,
                CASE
                    WHEN v_cascade_old[i] = 'none' THEN
                        jsonb_build_object(
                            'affected_user_id', p_user_id::text,
                            'resource_name',    COALESCE(d.name, ''),
                            'new_permission',   v_cascade_new[i],
                            'via_root',         true
                        )
                    ELSE
                        jsonb_build_object(
                            'affected_user_id', p_user_id::text,
                            'resource_name',    COALESCE(d.name, ''),
                            'old_permission',   v_cascade_old[i],
                            'new_permission',   v_cascade_new[i],
                            'via_root',         true
                        )
                END
            FROM descendants d
            JOIN public.resources r ON r.id = d.id
            WHERE r.resource_type = 'FILE'
              -- Exclude files that have an explicit fileOverride in the payload
              AND d.id <> ALL(v_all_fo_ids);

        END LOOP;
    END IF;

END;
$$;

-- Grant execution rights to the authenticated role only
-- (SECURITY DEFINER ensures it runs with owner privileges regardless)
REVOKE ALL ON FUNCTION public.bulk_update_member_permissions(UUID, UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bulk_update_member_permissions(UUID, UUID, JSONB) TO authenticated;
