-- Migration: Redefine bulk_update_member_permissions to use UPSERTs and prevent duplicate events
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
    v_actor_id          UUID;
    v_org_project_ids   UUID[];
    _grant_rec          RECORD;
    _perm_rec           RECORD;
    _fo_rec             RECORD;
    v_grant             JSONB;
    v_project_id        UUID;
    v_resource_id       UUID;
    v_resource_type     TEXT;
    v_permission        TEXT;
    
    v_granted_project_ids UUID[] := ARRAY[]::UUID[];
    v_granted_resource_ids UUID[] := ARRAY[]::UUID[];
BEGIN
    -- 1. Authentication & authorization
    v_actor_id := auth.uid();
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF NOT public.is_org_owner(p_org_id, v_actor_id) THEN
        RAISE EXCEPTION 'Only org owners can manage member permissions';
    END IF;

    -- 2. Validate target user belongs to the org
    IF NOT EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_id = p_org_id AND user_id = p_user_id
    ) THEN
        RAISE EXCEPTION 'Target user is not a member of this organization';
    END IF;

    -- 3. Resolve all project IDs that belong to this org
    SELECT array_agg(id)
    INTO v_org_project_ids
    FROM public.projects
    WHERE owner_org_id = p_org_id;

    IF v_org_project_ids IS NULL THEN
        v_org_project_ids := ARRAY[]::UUID[];
    END IF;

    -- 4. Process each project grant from the payload
    -- UPSERT instead of DELETE + INSERT to allow triggers to fire precisely.
    IF p_project_grants IS NOT NULL AND jsonb_typeof(p_project_grants) = 'array' THEN
        FOR _grant_rec IN
            SELECT value AS obj FROM jsonb_array_elements(p_project_grants)
        LOOP
            v_grant := _grant_rec.obj;
            v_project_id := (v_grant->>'projectId')::UUID;

            IF NOT (v_project_id = ANY(v_org_project_ids)) THEN
                CONTINUE;
            END IF;

            v_granted_project_ids := v_granted_project_ids || v_project_id;

            -- Upsert project access grant
            INSERT INTO public.project_access_grants
                (project_id, org_id, user_id, granted_by)
            VALUES
                (v_project_id, p_org_id, p_user_id, v_actor_id)
            ON CONFLICT (project_id, user_id) 
            DO UPDATE SET granted_by = EXCLUDED.granted_by;

            -- IMPORTANT: Upsert file-level overrides BEFORE root permissions.
            -- This ensures that when the root permission fires a cascade UPDATE trigger,
            -- the explicit overrides exist in the table and can be successfully excluded 
            -- via the "NOT EXISTS" check, preventing duplicate events.
            IF v_grant->'fileOverrides' IS NOT NULL
               AND jsonb_typeof(v_grant->'fileOverrides') = 'array'
            THEN
                FOR _fo_rec IN
                    SELECT value AS fo FROM jsonb_array_elements(v_grant->'fileOverrides')
                LOOP
                    v_resource_id := (_fo_rec.fo->>'resource_id')::UUID;
                    v_permission  := _fo_rec.fo->>'permission';

                    IF v_permission NOT IN ('view', 'edit', 'none') THEN CONTINUE; END IF;
                    IF v_resource_id IS NULL THEN CONTINUE; END IF;

                    -- Validate: must be a FILE in this project
                    IF NOT EXISTS (
                        SELECT 1 FROM public.resources r
                        WHERE r.id = v_resource_id
                          AND r.resource_type = 'FILE'
                          AND r.project_id = v_project_id
                    ) THEN 
                        CONTINUE; 
                    END IF;

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

                    v_granted_resource_ids := v_granted_resource_ids || v_resource_id;

                    INSERT INTO public.permissions
                        (resource_id, user_id, permission, granted_by)
                    VALUES
                        (v_resource_id, p_user_id, v_permission, v_actor_id)
                    ON CONFLICT (resource_id, user_id) 
                    DO UPDATE SET permission = EXCLUDED.permission, granted_by = EXCLUDED.granted_by;

                END LOOP;
            END IF;

            -- Upsert per-resource-type permissions (Roots)
            IF v_grant->'permissions' IS NOT NULL
               AND jsonb_typeof(v_grant->'permissions') = 'array'
            THEN
                FOR _perm_rec IN
                    SELECT value AS pe FROM jsonb_array_elements(v_grant->'permissions')
                LOOP
                    v_resource_type := _perm_rec.pe->>'resource_type';
                    v_permission    := _perm_rec.pe->>'permission';

                    IF v_permission NOT IN ('view', 'edit') THEN CONTINUE; END IF;

                    SELECT id
                    INTO v_resource_id
                    FROM public.resources
                    WHERE project_id = v_project_id
                      AND resource_type = v_resource_type
                    LIMIT 1;

                    IF NOT FOUND THEN CONTINUE; END IF;

                    v_granted_resource_ids := v_granted_resource_ids || v_resource_id;

                    INSERT INTO public.permissions
                        (resource_id, user_id, permission, granted_by)
                    VALUES
                        (v_resource_id, p_user_id, v_permission, v_actor_id)
                    ON CONFLICT (resource_id, user_id) 
                    DO UPDATE SET permission = EXCLUDED.permission, granted_by = EXCLUDED.granted_by;
                END LOOP;
            END IF;

        END LOOP;
    END IF;
    
    -- Cleanup step: Delete any old permissions or grants in these core org projects 
    -- that were NOT included in the payload (i.e. access revoked)
    IF array_length(v_org_project_ids, 1) > 0 THEN
        -- 1. Delete permissions for org projects that we didn't just upsert
        IF array_length(v_granted_resource_ids, 1) > 0 THEN
            DELETE FROM public.permissions
            WHERE user_id = p_user_id
              AND resource_id IN (
                  SELECT id FROM public.resources r
                  WHERE r.project_id = ANY(v_org_project_ids)
              )
              AND NOT (resource_id = ANY(v_granted_resource_ids));
        ELSE
            DELETE FROM public.permissions
            WHERE user_id = p_user_id
              AND resource_id IN (
                  SELECT id FROM public.resources r
                  WHERE r.project_id = ANY(v_org_project_ids)
              );
        END IF;

        -- 2. Delete project_access_grants for org projects that we didn't just upsert
        IF array_length(v_granted_project_ids, 1) > 0 THEN
            DELETE FROM public.project_access_grants
            WHERE user_id = p_user_id
              AND project_id = ANY(v_org_project_ids)
              AND NOT (project_id = ANY(v_granted_project_ids));
        ELSE
            DELETE FROM public.project_access_grants
            WHERE user_id = p_user_id
              AND project_id = ANY(v_org_project_ids);
        END IF;
    END IF;

END;
$$;
