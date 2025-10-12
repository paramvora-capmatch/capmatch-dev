-- Fixed RLS policies for RBAC system
-- Run this in Supabase Studio SQL editor

-- First, drop all existing policies
DROP POLICY IF EXISTS "Users can read their entities" ON borrower_entities;
DROP POLICY IF EXISTS "Owners can update entities" ON borrower_entities;
DROP POLICY IF EXISTS "Users can create entities" ON borrower_entities;

DROP POLICY IF EXISTS "Members can read entity members" ON borrower_entity_members;
DROP POLICY IF EXISTS "Owners can manage members" ON borrower_entity_members;
DROP POLICY IF EXISTS "Users can accept their own invites" ON borrower_entity_members;

DROP POLICY IF EXISTS "Users can read their permissions" ON document_permissions;
DROP POLICY IF EXISTS "Owners can manage permissions" ON document_permissions;

-- Recreate borrower_entities policies
CREATE POLICY "Users can read their entities" ON borrower_entities
  FOR SELECT USING (
    id IN (
      SELECT entity_id FROM borrower_entity_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Owners can update entities" ON borrower_entities
  FOR UPDATE USING (
    id IN (
      SELECT entity_id FROM borrower_entity_members 
      WHERE user_id = auth.uid() AND role = 'owner' AND status = 'active'
    )
  );

CREATE POLICY "Users can create entities" ON borrower_entities
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- Recreate borrower_entity_members policies
CREATE POLICY "Members can read entity members" ON borrower_entity_members
  FOR SELECT USING (
    entity_id IN (
      SELECT entity_id FROM borrower_entity_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Owners can manage members" ON borrower_entity_members
  FOR ALL USING (
    entity_id IN (
      SELECT entity_id FROM borrower_entity_members 
      WHERE user_id = auth.uid() AND role = 'owner' AND status = 'active'
    )
  );

CREATE POLICY "Users can accept their own invites" ON borrower_entity_members
  FOR UPDATE USING (
    user_id = auth.uid() AND status = 'pending'
  );

-- Recreate document_permissions policies
CREATE POLICY "Users can read their permissions" ON document_permissions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Owners can manage permissions" ON document_permissions
  FOR ALL USING (
    entity_id IN (
      SELECT entity_id FROM borrower_entity_members 
      WHERE user_id = auth.uid() AND role = 'owner' AND status = 'active'
    )
  );

-- Test the policies work
SELECT 'Testing policies...' as status;

-- Test 1: Check if we can query with auth context
SELECT auth.uid() as current_user_id;

-- Test 2: Try to query borrower_entities (should work if user is authenticated)
SELECT COUNT(*) as entity_count FROM borrower_entities;
