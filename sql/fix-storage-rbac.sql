-- Fix storage RLS policies and triggers for RBAC system
-- Run this in Supabase Studio SQL editor

-- 1. Drop the old trigger that creates user-based buckets
DROP TRIGGER IF EXISTS "on_new_borrower_profile" ON "public"."profiles";
DROP FUNCTION IF EXISTS "public"."handle_new_borrower"();

-- 2. Drop old storage RLS policies
DROP POLICY IF EXISTS "Borrower full access to own bucket" ON "storage"."objects";
DROP POLICY IF EXISTS "Admin full access" ON "storage"."objects";
DROP POLICY IF EXISTS "Advisor delete access to assigned resources" ON "storage"."objects";
DROP POLICY IF EXISTS "Advisor insert access to assigned resources" ON "storage"."objects";
DROP POLICY IF EXISTS "Advisor read access to assigned resources" ON "storage"."objects";
DROP POLICY IF EXISTS "Advisor update access to assigned resources" ON "storage"."objects";

-- 3. Create new RLS policies for entity-based storage
-- Allow users to access objects in buckets for entities they belong to
CREATE POLICY "Entity members can read objects" ON "storage"."objects"
  FOR SELECT USING (
    bucket_id IN (
      SELECT be.id::text 
      FROM borrower_entities be
      JOIN borrower_entity_members bem ON be.id = bem.entity_id
      WHERE bem.user_id = auth.uid() AND bem.status = 'active'
    )
  );

-- Allow entity owners to insert/update/delete objects
CREATE POLICY "Entity owners can manage objects" ON "storage"."objects"
  FOR ALL USING (
    bucket_id IN (
      SELECT be.id::text 
      FROM borrower_entities be
      JOIN borrower_entity_members bem ON be.id = bem.entity_id
      WHERE bem.user_id = auth.uid() AND bem.role = 'owner' AND bem.status = 'active'
    )
  );

-- Allow entity members to insert objects (for uploads)
CREATE POLICY "Entity members can insert objects" ON "storage"."objects"
  FOR INSERT WITH CHECK (
    bucket_id IN (
      SELECT be.id::text 
      FROM borrower_entities be
      JOIN borrower_entity_members bem ON be.id = bem.entity_id
      WHERE bem.user_id = auth.uid() AND bem.status = 'active'
    )
  );

-- Allow advisors to access objects for projects they're assigned to
CREATE POLICY "Advisors can access assigned project objects" ON "storage"."objects"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN borrower_entities be ON p.entity_id = be.id
      WHERE p.assigned_advisor_user_id = auth.uid()
      AND (
        (p.id::text = objects.path_tokens[1] AND be.id::text = objects.bucket_id)
        OR (objects.path_tokens[1] = 'borrower_docs' AND be.id::text = objects.bucket_id)
      )
    )
  );

-- 4. Create new function to handle entity bucket creation
CREATE OR REPLACE FUNCTION "public"."handle_new_entity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Create a private storage bucket for the new entity
    INSERT INTO storage.buckets (id, name, public, owner)
    VALUES (NEW.id::text, NEW.id::text, false, NEW.created_by);

    -- Create a default 'borrower_docs' folder within the new bucket
    INSERT INTO storage.objects (bucket_id, name, owner, metadata)
    VALUES (NEW.id::text, 'borrower_docs/.keep', NEW.created_by, '{"mimetype": "text/plain"}');

    RETURN NEW;
END;
$$;

-- 5. Create trigger for entity bucket creation
CREATE TRIGGER "on_new_entity_created" 
  AFTER INSERT ON "public"."borrower_entities" 
  FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_entity"();

-- 6. Grant permissions
GRANT ALL ON FUNCTION "public"."handle_new_entity"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_entity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_entity"() TO "service_role";
