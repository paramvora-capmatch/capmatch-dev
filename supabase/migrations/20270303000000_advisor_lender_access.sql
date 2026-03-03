-- =============================================================================
-- Advisor lender access + lender underwriting view + advisor view lender orgs
--    + lender OM select + lender storage view (project images)
-- =============================================================================
-- 1. Advisor can grant/revoke lender access to their assigned projects (RPCs +
--    SELECT/DELETE on lender_project_access).
-- 2. Lenders get read-only underwriting doc access via get_effective_permission.
-- 3. Assigned advisors can view lender org names for their projects (orgs SELECT).
-- 4. Assigned advisor can DELETE lender_project_access for their project (revoke).
-- 5. Lenders can view OM for projects they have access to (om SELECT).
-- 6. Lenders can view project images in storage (site-images, architectural-diagrams).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Advisor grant/revoke lender access
-- -----------------------------------------------------------------------------

-- RPC: Grant lender access (callable by assigned advisor)
CREATE OR REPLACE FUNCTION public.grant_lender_project_access_by_advisor(
    p_project_id UUID,
    p_lender_org_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_access_id UUID;
BEGIN
    -- Only the assigned advisor for this project can grant
    IF NOT EXISTS (
        SELECT 1 FROM public.projects
        WHERE id = p_project_id AND assigned_advisor_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Only the assigned advisor can grant lender access to this project';
    END IF;

    -- Delegate to existing function (same validations: lender org type, project exists)
    SELECT public.grant_lender_project_access(
        p_lender_org_id,
        p_project_id,
        auth.uid()
    ) INTO v_access_id;

    RETURN v_access_id;
END;
$$;

COMMENT ON FUNCTION public.grant_lender_project_access_by_advisor(UUID, UUID) IS
'Allows the assigned advisor to grant a lender org access to the project.';

-- RPC: Revoke lender access (callable by assigned advisor)
CREATE OR REPLACE FUNCTION public.revoke_lender_project_access_by_advisor(
    p_project_id UUID,
    p_lender_org_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_deleted BOOLEAN;
BEGIN
    -- Only the assigned advisor for this project can revoke
    IF NOT EXISTS (
        SELECT 1 FROM public.projects
        WHERE id = p_project_id AND assigned_advisor_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Only the assigned advisor can revoke lender access to this project';
    END IF;

    DELETE FROM public.lender_project_access
    WHERE project_id = p_project_id AND lender_org_id = p_lender_org_id;

    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted > 0;
END;
$$;

COMMENT ON FUNCTION public.revoke_lender_project_access_by_advisor(UUID, UUID) IS
'Allows the assigned advisor to revoke a lender org''s access to the project.';

-- Allow authenticated users to call these (RLS and function body enforce advisor check)
GRANT EXECUTE ON FUNCTION public.grant_lender_project_access_by_advisor(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_lender_project_access_by_advisor(UUID, UUID) TO authenticated;

-- Assigned advisor can view lender access rows for their project (so they can list "who has access")
DROP POLICY IF EXISTS "Assigned advisor can view lender access for their project" ON public.lender_project_access;
CREATE POLICY "Assigned advisor can view lender access for their project"
ON public.lender_project_access
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.projects
        WHERE id = lender_project_access.project_id
        AND assigned_advisor_id = public.get_current_user_id()
    )
);

COMMENT ON POLICY "Assigned advisor can view lender access for their project" ON public.lender_project_access IS
'Assigned advisor can see which lender orgs have been granted access to their project.';

-- Assigned advisor can DELETE lender_project_access for their project (so revoke works)
CREATE POLICY "Assigned advisor can delete lender access for their project"
ON public.lender_project_access
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = lender_project_access.project_id
    AND p.assigned_advisor_id = public.get_current_user_id()
  )
);

COMMENT ON POLICY "Assigned advisor can delete lender access for their project" ON public.lender_project_access IS
'Allows the assigned advisor to revoke a lender org''s access via revoke_lender_project_access_by_advisor.';

-- -----------------------------------------------------------------------------
-- 2. Lenders can view (read-only) underwriting resources for projects they have access to
-- -----------------------------------------------------------------------------

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
    v_project_id UUID;
    v_is_lender BOOLEAN;
    v_underwriting_root_in_ancestry BOOLEAN;
BEGIN
    -- Step 1: Owner "God Mode": If the user is an org owner, they get 'edit' access.
    SELECT org_id, project_id INTO v_org_id, v_project_id
    FROM public.resources WHERE id = p_resource_id;
    IF v_org_id IS NOT NULL AND public.is_org_owner(v_org_id, p_user_id) THEN
        RETURN 'edit';
    END IF;

    -- Step 1.5: Lender view for underwriting docs. If the user is a lender and has project
    -- access, and this resource is UNDERWRITING_DOCS_ROOT or a descendant of it, grant 'view'.
    SELECT (SELECT app_role FROM public.profiles WHERE id = p_user_id) = 'lender' INTO v_is_lender;
    IF v_is_lender AND v_project_id IS NOT NULL THEN
        -- Check if this resource is UNDERWRITING_DOCS_ROOT or a descendant of it (walk ancestors)
        WITH RECURSIVE anc AS (
            SELECT id, parent_id, resource_type
            FROM public.resources WHERE id = p_resource_id
            UNION ALL
            SELECT p.id, p.parent_id, p.resource_type
            FROM public.resources p
            JOIN anc ON p.id = anc.parent_id
        )
        SELECT EXISTS (SELECT 1 FROM anc WHERE resource_type = 'UNDERWRITING_DOCS_ROOT')
        INTO v_underwriting_root_in_ancestry;
        IF v_underwriting_root_in_ancestry AND public.is_lender_with_project_access(p_user_id, v_project_id) THEN
            RETURN 'view';
        END IF;
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

    -- Step 4: Default-Deny.
    RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.get_effective_permission(UUID, UUID) IS
'Returns effective permission (edit/view) or NULL. Includes lender read-only access for underwriting docs on granted projects.';

-- -----------------------------------------------------------------------------
-- 3. Assigned advisors can view lender org names for their projects
-- -----------------------------------------------------------------------------

CREATE POLICY "Assigned advisors can view lender orgs for their projects"
ON public.orgs
FOR SELECT
USING (
  entity_type = 'lender'
  AND id IN (
    SELECT lpa.lender_org_id
    FROM public.lender_project_access lpa
    JOIN public.projects p ON p.id = lpa.project_id
    WHERE p.assigned_advisor_id = public.get_current_user_id()
  )
);

COMMENT ON POLICY "Assigned advisors can view lender orgs for their projects" ON public.orgs IS
'Allows assigned advisors to read lender org name/id for orgs they have added to their project via lender_project_access, so the UI can display the lender name.';

-- -----------------------------------------------------------------------------
-- 5. Lenders can view OM for projects they have access to
-- -----------------------------------------------------------------------------

CREATE POLICY "Lenders can view OM for projects they have access to"
ON public.om
FOR SELECT
USING (
  public.is_lender_with_project_access(public.get_current_user_id(), om.project_id)
);

COMMENT ON POLICY "Lenders can view OM for projects they have access to" ON public.om IS
'Allows lenders with lender_project_access to read OM data when viewing the Offering Memorandum.';

-- -----------------------------------------------------------------------------
-- 6. Lenders can view project images (site-images, architectural-diagrams) in OM
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view files they have access to" ON storage.objects;

CREATE POLICY "Users can view files they have access to" ON storage.objects
FOR SELECT TO authenticated
USING (
  public.can_view(public.get_current_user_id(), public.get_resource_by_storage_path(name))
  OR (
    public.get_resource_by_storage_path(name) IS NULL
    AND EXISTS (
      SELECT 1 FROM public.project_access_grants pag
      WHERE pag.user_id = public.get_current_user_id()
        AND pag.project_id = (
          CASE WHEN (string_to_array(name, '/'))[1] ~ '^[0-9a-fA-F-]{36}$'
               THEN ((string_to_array(name, '/'))[1])::uuid
               ELSE NULL
          END
        )
    )
  )
  OR (
    public.get_resource_by_storage_path(name) IS NULL
    AND (string_to_array(name, '/'))[1] ~ '^[0-9a-fA-F-]{36}$'
    AND public.is_lender_with_project_access(
      public.get_current_user_id(),
      ((string_to_array(name, '/'))[1])::uuid
    )
  )
);
