-- =============================================================================
-- Migration: Set Final RLS Policies for Resources Table
-- =============================================================================
--
-- This migration sets the final RLS policies for the resources table.
-- Validation of permissions happens via triggers defined in 20251021000001.
--
-- Step 1: Ensure RLS is enabled and set final policies
DROP POLICY IF EXISTS "Authenticated users can insert resources" ON public.resources;
DROP POLICY IF EXISTS "Users can create resources in folders they can edit" ON public.resources;
DROP POLICY IF EXISTS "Users can view resources they have access to" ON public.resources;
DROP POLICY IF EXISTS "Users can update resources they can edit" ON public.resources;
DROP POLICY IF EXISTS "Users can delete resources they can edit (with safeguards)" ON public.resources;
DROP POLICY IF EXISTS "Allow inserts for authenticated users - validation via trigger" ON public.resources;

-- Step 2: Ensure RLS is enabled
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- Step 3: Create a VERY PERMISSIVE INSERT policy
-- This bypasses RLS for INSERT - the real validation happens in the trigger
CREATE POLICY "Allow inserts for authenticated users - validation via trigger" ON public.resources
FOR INSERT TO public
WITH CHECK (true);

-- Step 4: Keep SELECT restricted to resources the user can view
CREATE POLICY "Users can view resources they have access to" ON public.resources
FOR SELECT USING (
  public.can_view(auth.uid(), id)
  OR public.can_edit(auth.uid(), parent_id)
);

-- Step 5: Keep UPDATE restricted
CREATE POLICY "Users can update resources they can edit" ON public.resources
FOR UPDATE USING (public.can_edit(auth.uid(), id))
WITH CHECK (public.can_edit(auth.uid(), id));

-- Step 6: Keep DELETE restricted
CREATE POLICY "Users can delete resources they can edit (with safeguards)" ON public.resources
FOR DELETE USING (
    public.can_edit(auth.uid(), id) AND
    resource_type NOT IN ('BORROWER_RESUME', 'PROJECT_RESUME', 'BORROWER_DOCS_ROOT', 'PROJECT_DOCS_ROOT')
);

-- Step 7: Note - The validate_resource_insert trigger is created in migration 20251021000001
-- No need to recreate it here as migration 20251021000001 runs before this one