-- Fix storage.buckets RLS policies for entity-based buckets
-- Run this in Supabase Studio SQL editor

-- 1. Drop any existing bucket policies
DROP POLICY IF EXISTS "Users can create buckets" ON "storage"."buckets";
DROP POLICY IF EXISTS "Users can read buckets" ON "storage"."buckets";
DROP POLICY IF EXISTS "Entity members can access buckets" ON "storage"."buckets";

-- 2. Create new RLS policies for storage.buckets
-- Allow users to read buckets for entities they belong to
CREATE POLICY "Entity members can read buckets" ON "storage"."buckets"
  FOR SELECT USING (
    id IN (
      SELECT be.id::text 
      FROM borrower_entities be
      JOIN borrower_entity_members bem ON be.id = bem.entity_id
      WHERE bem.user_id = auth.uid() AND bem.status = 'active'
    )
  );

-- Allow entity owners to create buckets (for their entities)
CREATE POLICY "Entity owners can create buckets" ON "storage"."buckets"
  FOR INSERT WITH CHECK (
    id IN (
      SELECT be.id::text 
      FROM borrower_entities be
      JOIN borrower_entity_members bem ON be.id = bem.entity_id
      WHERE bem.user_id = auth.uid() AND bem.role = 'owner' AND bem.status = 'active'
    )
  );

-- Allow entity owners to update buckets
CREATE POLICY "Entity owners can update buckets" ON "storage"."buckets"
  FOR UPDATE USING (
    id IN (
      SELECT be.id::text 
      FROM borrower_entities be
      JOIN borrower_entity_members bem ON be.id = bem.entity_id
      WHERE bem.user_id = auth.uid() AND bem.role = 'owner' AND bem.status = 'active'
    )
  );

-- Allow service role to create buckets (for triggers)
CREATE POLICY "Service role can create buckets" ON "storage"."buckets"
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
