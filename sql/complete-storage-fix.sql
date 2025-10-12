-- Complete fix for storage RBAC system
-- Run this in Supabase Studio SQL editor

-- 1. Drop ALL old triggers and functions
DROP TRIGGER IF EXISTS "on_new_borrower_profile" ON "public"."profiles";
DROP TRIGGER IF EXISTS "on_auth_user_created" ON "auth"."users";
DROP FUNCTION IF EXISTS "public"."handle_new_borrower"();
DROP FUNCTION IF EXISTS "public"."handle_new_user"();

-- 2. Drop ALL old storage policies
DROP POLICY IF EXISTS "Borrower full access to own bucket" ON "storage"."objects";
DROP POLICY IF EXISTS "Admin full access" ON "storage"."objects";
DROP POLICY IF EXISTS "Advisor delete access to assigned resources" ON "storage"."objects";
DROP POLICY IF EXISTS "Advisor insert access to assigned resources" ON "storage"."objects";
DROP POLICY IF EXISTS "Advisor read access to assigned resources" ON "storage"."objects";
DROP POLICY IF EXISTS "Advisor update access to assigned resources" ON "storage"."objects";
DROP POLICY IF EXISTS "Users can create buckets" ON "storage"."buckets";
DROP POLICY IF EXISTS "Users can read buckets" ON "storage"."buckets";
DROP POLICY IF EXISTS "Entity members can access buckets" ON "storage"."buckets";
DROP POLICY IF EXISTS "Entity members can read buckets" ON "storage"."buckets";
DROP POLICY IF EXISTS "Entity owners can create buckets" ON "storage"."buckets";
DROP POLICY IF EXISTS "Entity owners can update buckets" ON "storage"."buckets";
DROP POLICY IF EXISTS "Service role can create buckets" ON "storage"."buckets";

-- 3. Create new function for entity bucket creation
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

-- 4. Create trigger for entity bucket creation
DROP TRIGGER IF EXISTS "on_new_entity_created" ON "public"."borrower_entities";
CREATE TRIGGER "on_new_entity_created" 
  AFTER INSERT ON "public"."borrower_entities" 
  FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_entity"();

-- 5. Drop existing policies first, then create comprehensive RLS policies for storage.objects
DROP POLICY IF EXISTS "Entity members can read objects" ON "storage"."objects";
DROP POLICY IF EXISTS "Entity owners can manage objects" ON "storage"."objects";
DROP POLICY IF EXISTS "Entity members can insert objects" ON "storage"."objects";
DROP POLICY IF EXISTS "Advisors can access assigned project objects" ON "storage"."objects";

CREATE POLICY "Entity members can read objects" ON "storage"."objects"
  FOR SELECT USING (
    bucket_id IN (
      SELECT be.id::text 
      FROM borrower_entities be
      JOIN borrower_entity_members bem ON be.id = bem.entity_id
      WHERE bem.user_id = auth.uid() AND bem.status = 'active'
    )
  );

CREATE POLICY "Entity owners can manage objects" ON "storage"."objects"
  FOR ALL USING (
    bucket_id IN (
      SELECT be.id::text 
      FROM borrower_entities be
      JOIN borrower_entity_members bem ON be.id = bem.entity_id
      WHERE bem.user_id = auth.uid() AND bem.role = 'owner' AND bem.status = 'active'
    )
  );

CREATE POLICY "Entity members can insert objects" ON "storage"."objects"
  FOR INSERT WITH CHECK (
    bucket_id IN (
      SELECT be.id::text 
      FROM borrower_entities be
      JOIN borrower_entity_members bem ON be.id = bem.entity_id
      WHERE bem.user_id = auth.uid() AND bem.status = 'active'
    )
  );

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

-- 6. Drop existing policies first, then create RLS policies for storage.buckets
DROP POLICY IF EXISTS "Entity members can read buckets" ON "storage"."buckets";
DROP POLICY IF EXISTS "Service role can manage buckets" ON "storage"."buckets";

CREATE POLICY "Entity members can read buckets" ON "storage"."buckets"
  FOR SELECT USING (
    id IN (
      SELECT be.id::text 
      FROM borrower_entities be
      JOIN borrower_entity_members bem ON be.id = bem.entity_id
      WHERE bem.user_id = auth.uid() AND bem.status = 'active'
    )
  );

CREATE POLICY "Service role can manage buckets" ON "storage"."buckets"
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 7. Grant permissions
GRANT ALL ON FUNCTION "public"."handle_new_entity"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_entity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_entity"() TO "service_role";
