-- Migration: Trigger-based domain event emission for permissions

-- 1. Trigger on permissions table
CREATE OR REPLACE FUNCTION public.emit_permission_change_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_resource_type TEXT;
    v_resource_name TEXT;
    v_project_id UUID;
    v_project_name TEXT;
    v_org_id UUID;
    v_org_name TEXT;
    v_is_docs_root BOOLEAN;
    v_event_type TEXT;
    v_payload JSONB;
BEGIN
    IF (TG_OP = 'INSERT' AND NEW.permission IN ('view', 'edit')) 
    OR (TG_OP = 'UPDATE' AND (
          (OLD.permission = 'none' OR OLD.permission IS NULL) AND NEW.permission IN ('view', 'edit')
       OR (OLD.permission = 'view' AND NEW.permission = 'edit')
    )) THEN
        
        SELECT r.resource_type, r.name, r.project_id, r.org_id
        INTO v_resource_type, v_resource_name, v_project_id, v_org_id
        FROM public.resources r
        WHERE r.id = NEW.resource_id;

        IF v_project_id IS NOT NULL THEN
            SELECT name INTO v_project_name FROM public.projects WHERE id = v_project_id;
        END IF;
        
        IF v_org_id IS NOT NULL THEN
            SELECT name INTO v_org_name FROM public.orgs WHERE id = v_org_id;
        END IF;

        IF v_resource_type = 'PROJECT_RESUME' THEN 
            v_resource_name := 'Project Resume';
            v_event_type := 'resume_permission_granted';
            v_is_docs_root := FALSE;
        ELSIF v_resource_type = 'PROJECT_DOCS_ROOT' THEN
            v_resource_name := 'Project Documents';
            v_event_type := 'document_permission_granted';
            v_is_docs_root := TRUE;
        ELSIF v_resource_type = 'BORROWER_RESUME' THEN
            v_resource_name := 'Borrower Resume';
            v_event_type := 'resume_permission_granted';
            v_is_docs_root := FALSE;
        ELSIF v_resource_type = 'BORROWER_DOCS_ROOT' THEN
            v_resource_name := 'Borrower Documents';
            v_event_type := 'document_permission_granted';
            v_is_docs_root := TRUE;
        ELSIF v_resource_type = 'UNDERWRITING_TEMPLATES_ROOT' THEN
            v_resource_name := 'Underwriting Templates';
            v_event_type := 'document_permission_granted';
            v_is_docs_root := FALSE;
        ELSE
            v_event_type := 'document_permission_granted';
            v_is_docs_root := FALSE;
        END IF;

        v_payload := jsonb_build_object(
            'affected_user_id', NEW.user_id::text,
            'project_id', v_project_id::text,
            'project_name', COALESCE(v_project_name, ''),
            'resource_id', NEW.resource_id::text,
            'resource_name', COALESCE(v_resource_name, ''),
            'new_permission', NEW.permission,
            'changed_by_id', NEW.granted_by::text,
            'org_id', v_org_id::text,
            'org_name', COALESCE(v_org_name, '')
        );

        INSERT INTO public.domain_events(event_type, actor_id, project_id, resource_id, payload)
        VALUES (v_event_type, NEW.granted_by, v_project_id, NEW.resource_id, v_payload);

        IF v_is_docs_root THEN
            INSERT INTO public.domain_events(event_type, actor_id, project_id, resource_id, payload)
            WITH RECURSIVE descendants AS (
                SELECT r.id, r.name, r.resource_type
                FROM public.resources r
                WHERE r.parent_id = NEW.resource_id
                  AND r.resource_type <> 'UNDERWRITING_TEMPLATES_ROOT'
                UNION ALL
                SELECT r.id, r.name, r.resource_type
                FROM public.resources r
                JOIN descendants d ON r.parent_id = d.id
                WHERE r.resource_type <> 'UNDERWRITING_TEMPLATES_ROOT'
            )
            SELECT
                'document_permission_granted',
                NEW.granted_by,
                v_project_id,
                d.id,
                jsonb_build_object(
                    'affected_user_id', NEW.user_id::text,
                    'project_id', v_project_id::text,
                    'project_name', COALESCE(v_project_name, ''),
                    'resource_id', d.id::text,
                    'resource_name', COALESCE(d.name, ''),
                    'new_permission', NEW.permission,
                    'changed_by_id', NEW.granted_by::text,
                    'org_id', v_org_id::text,
                    'org_name', COALESCE(v_org_name, ''),
                    'via_root', true
                )
            FROM descendants d
            WHERE d.resource_type = 'FILE'
              AND NOT EXISTS (
                  SELECT 1 FROM public.permissions p
                  WHERE p.resource_id = d.id AND p.user_id = NEW.user_id
              );
        END IF;

    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_permission_change_event ON public.permissions;
CREATE TRIGGER trg_permission_change_event
AFTER INSERT OR UPDATE ON public.permissions
FOR EACH ROW
EXECUTE FUNCTION public.emit_permission_change_event();


-- 2. Trigger on project_access_grants
CREATE OR REPLACE FUNCTION public.emit_project_access_grant_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_project_name TEXT;
    v_org_name TEXT;
    v_payload JSONB;
    v_new_permission TEXT;
BEGIN
    -- If this is a re-insert (e.g. bulk update), another row for this user+project might 
    -- still exist, but we deleted it right before. We'll simply check the current permissions
    -- attached to this user in this project at the time the transaction commits.
    
    -- Check if a grant actually still exists (to handle delete+reinsert cycles properly with deferred triggers)
    IF NOT EXISTS (
        SELECT 1 FROM public.project_access_grants
        WHERE id = NEW.id
    ) THEN
        RETURN NULL; -- The grant was deleted, skip event
    END IF;

    SELECT name INTO v_project_name FROM public.projects WHERE id = NEW.project_id;
    SELECT name INTO v_org_name FROM public.orgs WHERE id = NEW.org_id;

    SELECT CASE
        WHEN EXISTS (
            SELECT 1 FROM public.permissions p
            JOIN public.resources r ON r.id = p.resource_id
            WHERE p.user_id = NEW.user_id 
              AND r.project_id = NEW.project_id
              AND r.resource_type IN ('PROJECT_RESUME', 'PROJECT_DOCS_ROOT', 'BORROWER_RESUME', 'BORROWER_DOCS_ROOT')
              AND p.permission = 'edit'
        ) THEN 'edit'
        WHEN EXISTS (
            SELECT 1 FROM public.permissions p
            JOIN public.resources r ON r.id = p.resource_id
            WHERE p.user_id = NEW.user_id 
              AND r.project_id = NEW.project_id
        ) THEN 'view'
        ELSE 'view' -- Default to view for project_access_granted if exact nature is unknown
    END INTO v_new_permission;

    v_payload := jsonb_build_object(
        'affected_user_id', NEW.user_id::text,
        'project_id', NEW.project_id::text,
        'project_name', COALESCE(v_project_name, ''),
        'new_permission', v_new_permission,
        'org_id', NEW.org_id::text,
        'org_name', COALESCE(v_org_name, '')
    );

    INSERT INTO public.domain_events(event_type, actor_id, project_id, payload)
    VALUES ('project_access_granted', NEW.granted_by, NEW.project_id, v_payload);

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_access_grant_event ON public.project_access_grants;
CREATE CONSTRAINT TRIGGER trg_project_access_grant_event
AFTER INSERT ON public.project_access_grants
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION public.emit_project_access_grant_event();
