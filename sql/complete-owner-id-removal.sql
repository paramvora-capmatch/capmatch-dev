-- Comprehensive migration to remove owner_id and update RLS policies
-- Run this in Supabase Studio SQL editor

-- 1. First, verify current state
SELECT 
  COUNT(*) as total_projects,
  COUNT(entity_id) as projects_with_entity_id,
  COUNT(owner_id) as projects_with_owner_id
FROM projects;

-- 2. Drop all policies that depend on owner_id
DROP POLICY IF EXISTS "Enable delete for own projects" ON projects;
DROP POLICY IF EXISTS "Enable insert for own projects" ON projects;
DROP POLICY IF EXISTS "Enable read access for own projects" ON projects;
DROP POLICY IF EXISTS "Enable update for own projects" ON projects;
DROP POLICY IF EXISTS "Users can read messages for their projects" ON project_messages;
DROP POLICY IF EXISTS "Users can send messages in their projects" ON project_messages;
DROP POLICY IF EXISTS "Users can read their own borrower profile" ON borrowers;
DROP POLICY IF EXISTS "Users can update their own borrower profile" ON borrowers;

-- 3. Create new entity-based RLS policies for projects
CREATE POLICY "Entity members can read projects" ON projects
  FOR SELECT USING (
    entity_id IN (
      SELECT be.id 
      FROM borrower_entities be
      JOIN borrower_entity_members bem ON be.id = bem.entity_id
      WHERE bem.user_id = auth.uid() AND bem.status = 'active'
    )
  );

CREATE POLICY "Entity owners can insert projects" ON projects
  FOR INSERT WITH CHECK (
    entity_id IN (
      SELECT be.id 
      FROM borrower_entities be
      JOIN borrower_entity_members bem ON be.id = bem.entity_id
      WHERE bem.user_id = auth.uid() AND bem.role = 'owner' AND bem.status = 'active'
    )
  );

CREATE POLICY "Entity owners can update projects" ON projects
  FOR UPDATE USING (
    entity_id IN (
      SELECT be.id 
      FROM borrower_entities be
      JOIN borrower_entity_members bem ON be.id = bem.entity_id
      WHERE bem.user_id = auth.uid() AND bem.role = 'owner' AND bem.status = 'active'
    )
  );

CREATE POLICY "Entity owners can delete projects" ON projects
  FOR DELETE USING (
    entity_id IN (
      SELECT be.id 
      FROM borrower_entities be
      JOIN borrower_entity_members bem ON be.id = bem.entity_id
      WHERE bem.user_id = auth.uid() AND bem.role = 'owner' AND bem.status = 'active'
    )
  );

-- 4. Create new entity-based RLS policies for project_messages
CREATE POLICY "Entity members can read project messages" ON project_messages
  FOR SELECT USING (
    project_id IN (
      SELECT p.id 
      FROM projects p
      JOIN borrower_entities be ON p.entity_id = be.id
      JOIN borrower_entity_members bem ON be.id = bem.entity_id
      WHERE bem.user_id = auth.uid() AND bem.status = 'active'
    )
  );

CREATE POLICY "Entity members can send project messages" ON project_messages
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT p.id 
      FROM projects p
      JOIN borrower_entities be ON p.entity_id = be.id
      JOIN borrower_entity_members bem ON be.id = bem.entity_id
      WHERE bem.user_id = auth.uid() AND bem.status = 'active'
    )
  );

-- 5. Create new entity-based RLS policies for borrowers
CREATE POLICY "Entity members can read borrower profiles" ON borrowers
  FOR SELECT USING (
    entity_id IN (
      SELECT be.id 
      FROM borrower_entities be
      JOIN borrower_entity_members bem ON be.id = bem.entity_id
      WHERE bem.user_id = auth.uid() AND bem.status = 'active'
    )
  );

CREATE POLICY "Entity owners can update borrower profiles" ON borrowers
  FOR UPDATE USING (
    entity_id IN (
      SELECT be.id 
      FROM borrower_entities be
      JOIN borrower_entity_members bem ON be.id = bem.entity_id
      WHERE bem.user_id = auth.uid() AND bem.role = 'owner' AND bem.status = 'active'
    )
  );

-- 6. Now safely drop the owner_id column
ALTER TABLE projects DROP COLUMN IF EXISTS owner_id;

-- 7. Verify the column was removed
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'projects' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 8. Verify the new policies are working
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('projects', 'project_messages', 'borrowers')
ORDER BY tablename, policyname;

-- 9. Test query to verify entity-based access works
SELECT 
  p.id,
  p.project_name,
  p.entity_id,
  be.name as entity_name
FROM projects p
LEFT JOIN borrower_entities be ON p.entity_id = be.id
LIMIT 5;

-- 10. Add comment to explain the change
COMMENT ON TABLE projects IS 'Projects are owned by borrower entities, not individual users. Access controlled via entity membership.';
