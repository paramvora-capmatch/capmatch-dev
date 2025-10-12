-- Add project_permissions column to borrower_entity_members table
-- Run this in Supabase Studio SQL editor

-- Add column to store project permissions for pending invites
ALTER TABLE borrower_entity_members 
ADD COLUMN IF NOT EXISTS project_permissions JSONB DEFAULT '[]'::jsonb;

-- Add comment to explain the column
COMMENT ON COLUMN borrower_entity_members.project_permissions IS 'Array of project IDs that the member will have access to when they accept the invite';
