-- Check if projects table has entity_id column and if it's populated
-- Run this in Supabase Studio SQL editor

-- Check if entity_id column exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'projects' AND column_name = 'entity_id';

-- Check if projects have entity_id populated
SELECT id, project_name, owner_id, entity_id 
FROM projects 
LIMIT 10;

-- Check if there are any projects without entity_id
SELECT COUNT(*) as projects_without_entity_id
FROM projects 
WHERE entity_id IS NULL;
