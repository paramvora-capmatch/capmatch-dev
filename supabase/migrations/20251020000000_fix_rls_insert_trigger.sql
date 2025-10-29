-- =============================================================================
-- Migration: Fix RLS INSERT Policy with Trigger-Based Validation
-- =============================================================================
--
-- The previous RLS policy for INSERT on resources was causing circular
-- dependency issues. This migration replaces it with a trigger-based approach
-- that validates permissions at insert time without the RLS circular reference.

-- Step 1: Drop the problematic INSERT policy
DROP POLICY IF EXISTS "Users can create resources in folders they can edit" ON public.resources;

-- Step 2: Create a simpler INSERT policy that allows inserts from authenticated users
-- The actual permission check will be done by a trigger
CREATE POLICY "Authenticated users can insert resources" ON public.resources
FOR INSERT TO public
WITH CHECK (true);

-- Step 3: Create a trigger function to validate permissions on resource creation
CREATE OR REPLACE FUNCTION public.validate_resource_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_can_edit BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    
    -- If parent_id is null, this is a root resource - only allow for root types
    IF NEW.parent_id IS NULL THEN
        IF NEW.resource_type NOT IN ('BORROWER_RESUME', 'BORROWER_DOCS_ROOT', 'PROJECT_RESUME', 'PROJECT_DOCS_ROOT') THEN
            RAISE EXCEPTION 'Only root resource types (BORROWER_RESUME, BORROWER_DOCS_ROOT, PROJECT_RESUME, PROJECT_DOCS_ROOT) can have null parent_id';
        END IF;
        RETURN NEW;
    END IF;

    -- For non-root resources, check if user has 'edit' permission on the parent
    IF NOT public.can_edit(v_user_id, NEW.parent_id) THEN
        RAISE EXCEPTION 'User does not have edit permission on the parent resource';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Drop the old trigger if it exists
DROP TRIGGER IF EXISTS validate_resource_insert_trigger ON public.resources;

-- Step 5: Create the trigger
CREATE TRIGGER validate_resource_insert_trigger
BEFORE INSERT ON public.resources
FOR EACH ROW
EXECUTE FUNCTION public.validate_resource_insert();

-- Step 6: Update the SELECT policy to use the hierarchical permissions
DROP POLICY IF EXISTS "Users can view resources they have access to" ON public.resources;
CREATE POLICY "Users can view resources they have access to" ON public.resources
FOR SELECT USING (
    public.can_view(auth.uid(), id)
    OR public.can_edit(auth.uid(), parent_id)
);

-- Step 7: Update the UPDATE policy
DROP POLICY IF EXISTS "Users can update resources they can edit" ON public.resources;
CREATE POLICY "Users can update resources they can edit" ON public.resources
FOR UPDATE USING (public.can_edit(auth.uid(), id))
WITH CHECK (public.can_edit(auth.uid(), id));

-- Step 8: Update the DELETE policy (keep safeguards against deleting root resources)
DROP POLICY IF EXISTS "Users can delete resources they can edit (with safeguards)" ON public.resources;
CREATE POLICY "Users can delete resources they can edit (with safeguards)" ON public.resources
FOR DELETE USING (
    public.can_edit(auth.uid(), id) AND
    resource_type NOT IN ('BORROWER_RESUME', 'PROJECT_RESUME', 'BORROWER_DOCS_ROOT', 'PROJECT_DOCS_ROOT')
);