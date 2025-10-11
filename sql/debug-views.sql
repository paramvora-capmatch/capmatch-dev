-- Debug the views to see if they're working correctly
-- Run this in Supabase Studio SQL editor

-- Check if views exist
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('active_entity_members', 'pending_invites');

-- Test the active_entity_members view
SELECT * FROM active_entity_members LIMIT 5;

-- Test the pending_invites view  
SELECT * FROM pending_invites LIMIT 5;

-- Check if there are any members in borrower_entity_members
SELECT 
  bem.id,
  bem.entity_id,
  bem.user_id,
  bem.role,
  bem.status,
  p.email as user_email,
  p.full_name as user_name
FROM borrower_entity_members bem
LEFT JOIN profiles p ON bem.user_id = p.id
ORDER BY bem.created_at DESC
LIMIT 10;
