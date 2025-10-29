-- =============================================================================
-- Migration: Disable RLS INSERT on Resources - Use Trigger for Validation
-- =============================================================================
--
-- The RLS policy evaluation happens BEFORE the trigger fires, which creates
-- a catch-22. The solution is to:
-- 1. Remove ALL policies from resources table
-- 2. Re-enable RLS
-- 3. Create a single permissive INSERT policy that delegates to the trigger
-- 4. Keep restrictive policies for SELECT, UPDATE, DELETE

-- Step 1: Drop ALL existing policies on resources
DROP POLICY IF EXISTS "Authenticated users can insert resources" ON public.resources;
DROP POLICY IF EXISTS "Users can create resources in folders they can edit" ON public.resources;
DROP POLICY IF EXISTS "Users can view resources they have access to" ON public.resources;
DROP POLICY IF EXISTS "Users can update resources they can edit" ON public.resources;
DROP POLICY IF EXISTS "Users can delete resources they can edit (with safeguards)" ON public.resources;

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

-- Step 7: Verify the trigger still exists (it should from the previous migration)
-- If it doesn't, recreate it here:
DROP TRIGGER IF EXISTS validate_resource_insert_trigger ON public.resources;

CREATE TRIGGER validate_resource_insert_trigger
BEFORE INSERT ON public.resources
FOR EACH ROW
EXECUTE FUNCTION public.validate_resource_insert();