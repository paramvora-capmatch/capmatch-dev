-- Add invited_email column to borrower_entity_members table
-- Run this in Supabase Studio SQL editor

-- Add column to store the email that was invited
ALTER TABLE borrower_entity_members 
ADD COLUMN IF NOT EXISTS invited_email TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN borrower_entity_members.invited_email IS 'Email address that was invited (for pending invites before user accepts)';

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'borrower_entity_members' 
AND column_name = 'invited_email';