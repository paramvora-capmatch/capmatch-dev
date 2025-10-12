-- Update projects table to belong to entities instead of individual users
-- Run this in Supabase Studio SQL editor

-- Add entity_id column to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES borrower_entities(id) ON DELETE CASCADE;

-- Update existing projects to belong to the entity of their owner
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

-- Make entity_id NOT NULL after updating existing data
ALTER TABLE projects 
ALTER COLUMN entity_id SET NOT NULL;

-- Add comment to explain the change
COMMENT ON COLUMN projects.entity_id IS 'The borrower entity that owns this project';

-- Verify the changes
SELECT 
  p.id,
  p.project_name,
  p.owner_id,
  p.entity_id,
  be.name as entity_name
FROM projects p
LEFT JOIN borrower_entities be ON p.entity_id = be.id
LIMIT 5;
