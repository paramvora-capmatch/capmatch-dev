-- Remove owner_id field from projects table
-- Projects should be owned by entities, not individual users
-- Run this in Supabase Studio SQL editor

-- 1. First, verify that all projects have entity_id set
SELECT 
  id,
  project_name,
  owner_id,
  entity_id,
  CASE 
    WHEN entity_id IS NULL THEN 'MISSING ENTITY_ID'
    ELSE 'HAS ENTITY_ID'
  END as status
FROM projects
ORDER BY created_at DESC
LIMIT 10;

-- 2. If any projects are missing entity_id, update them
-- (This should not be needed if the migration was run properly)
UPDATE projects 
SET entity_id = (
  SELECT be.id 
  FROM borrower_entities be
  JOIN borrower_entity_members bem ON be.id = bem.entity_id
  WHERE bem.user_id = projects.owner_id 
  AND bem.role = 'owner'
  LIMIT 1
)
WHERE entity_id IS NULL;

-- 3. Verify all projects now have entity_id
SELECT 
  COUNT(*) as total_projects,
  COUNT(entity_id) as projects_with_entity_id,
  COUNT(*) - COUNT(entity_id) as projects_missing_entity_id
FROM projects;

-- 4. Drop the owner_id column
ALTER TABLE projects DROP COLUMN IF EXISTS owner_id;

-- 5. Verify the column was removed
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'projects' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 6. Add comment to explain the change
COMMENT ON TABLE projects IS 'Projects are owned by borrower entities, not individual users';

-- 7. Verify final state
SELECT 
  p.id,
  p.project_name,
  p.entity_id,
  be.name as entity_name
FROM projects p
LEFT JOIN borrower_entities be ON p.entity_id = be.id
LIMIT 5;
