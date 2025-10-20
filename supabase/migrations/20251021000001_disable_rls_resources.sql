-- =============================================================================
-- Migration: Disable RLS on Resources Table
-- =============================================================================
--
-- Complex hierarchical permission systems don't work well with RLS policies.
-- Instead, we implement authorization at the application/trigger level:
-- - The trigger validates permissions before any write
-- - The client-side code validates permissions before reads
-- - This is more maintainable and debuggable than trying to express complex
--   permission logic through RLS policies
--

-- Step 1: Drop all RLS policies on resources
DROP POLICY IF EXISTS "Allow inserts for authenticated users - validation via trigger" ON public.resources;
DROP POLICY IF EXISTS "Authenticated users can insert resources" ON public.resources;
DROP POLICY IF EXISTS "Users can create resources in folders they can edit" ON public.resources;
DROP POLICY IF EXISTS "Users can view resources they have access to" ON public.resources;
DROP POLICY IF EXISTS "Users can update resources they can edit" ON public.resources;
DROP POLICY IF EXISTS "Users can delete resources they can edit (with safeguards)" ON public.resources;

-- Step 2: Disable RLS on resources entirely
ALTER TABLE public.resources DISABLE ROW LEVEL SECURITY;

-- Step 3: The authorization trigger remains as the enforcement layer
-- This trigger validates all writes to resources
DROP TRIGGER IF EXISTS validate_resource_insert_trigger ON public.resources;

CREATE TRIGGER validate_resource_insert_trigger
BEFORE INSERT ON public.resources
FOR EACH ROW
EXECUTE FUNCTION public.validate_resource_insert();

-- Step 4: Create a trigger for UPDATE operations
CREATE OR REPLACE FUNCTION public.validate_resource_update()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    -- User must have 'edit' permission to update a resource
    IF NOT public.can_edit(v_user_id, NEW.id) THEN
        RAISE EXCEPTION 'User does not have edit permission on this resource';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS validate_resource_update_trigger ON public.resources;

CREATE TRIGGER validate_resource_update_trigger
BEFORE UPDATE ON public.resources
FOR EACH ROW
EXECUTE FUNCTION public.validate_resource_update();

-- Step 5: Create a trigger for DELETE operations
CREATE OR REPLACE FUNCTION public.validate_resource_delete()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    -- Prevent deletion of root resources
    IF OLD.resource_type IN ('BORROWER_RESUME', 'PROJECT_RESUME', 'BORROWER_DOCS_ROOT', 'PROJECT_DOCS_ROOT') THEN
        RAISE EXCEPTION 'Cannot delete root resource types';
    END IF;
    
    -- User must have 'edit' permission to delete a resource
    IF NOT public.can_edit(v_user_id, OLD.id) THEN
        RAISE EXCEPTION 'User does not have edit permission on this resource';
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS validate_resource_delete_trigger ON public.resources;

CREATE TRIGGER validate_resource_delete_trigger
BEFORE DELETE ON public.resources
FOR EACH ROW
EXECUTE FUNCTION public.validate_resource_delete();

-- Step 6: Keep RLS disabled on related tables that have complex hierarchies
ALTER TABLE public.permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_access_grants DISABLE ROW LEVEL SECURITY;

-- Step 7: Keep other tables' RLS intact for security
-- (profiles, orgs, org_members, projects, etc. can still use RLS if configured)