-- Fix profile creation for new users
-- Run this in Supabase Studio SQL editor

-- 1. Recreate the handle_new_user function that was accidentally dropped
CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.profiles (id, email, role, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'borrower'),
    new.raw_user_meta_data->>'full_name'
  );
  return new;
end;
$$;

-- 2. Recreate the trigger that calls this function when a new user signs up
CREATE TRIGGER on_auth_user_created 
  AFTER INSERT ON auth.users 
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 3. Grant necessary permissions
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";

-- 4. Also recreate the handle_new_borrower function for borrower-specific setup
CREATE OR REPLACE FUNCTION "public"."handle_new_borrower"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  -- Insert into borrowers table when a borrower profile is created
  insert into public.borrowers (id, entity_id)
  values (
    new.id,
    null -- Will be set later when entity is created
  );
  return new;
end;
$$;

-- 5. Recreate the trigger for borrower profile creation
CREATE OR REPLACE TRIGGER "on_new_borrower_profile" 
  AFTER INSERT ON "public"."profiles" 
  FOR EACH ROW 
  WHEN (NEW.role = 'borrower')
  EXECUTE FUNCTION "public"."handle_new_borrower"();

-- 6. Grant permissions for borrower function
GRANT ALL ON FUNCTION "public"."handle_new_borrower"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_borrower"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_borrower"() TO "service_role";
