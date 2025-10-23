-- scripts/setup-advisor-org-manual-user.sql
-- Run AFTER creating the user via Supabase Dashboard
-- Run with: psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f scripts/setup-advisor-org-manual-user.sql

DO $$
DECLARE
  v_user_id UUID;
  v_email TEXT := 'cody@capmatch.com';
  v_name TEXT := 'Cody Field';
  v_org_name TEXT := 'CapMatch Advisors';
  v_org_id UUID;
BEGIN
  RAISE NOTICE '🚀 Starting advisor org setup...';
  
  -- Step 1: Get the user ID from auth.users (user must already exist)
  RAISE NOTICE '1️⃣ Finding user...';
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = v_email;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found. Please create the user first via Supabase Dashboard.', v_email;
  END IF;

  RAISE NOTICE '✅ Found user with ID: %', v_user_id;

  -- Step 2: Create/update profile
  RAISE NOTICE '2️⃣ Creating profile...';
  INSERT INTO public.profiles (id, email, full_name, app_role, created_at, updated_at)
  VALUES (v_user_id, v_email, v_name, 'advisor', NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    app_role = EXCLUDED.app_role,
    updated_at = NOW();
  
  RAISE NOTICE '✅ Profile created';

  -- Step 3: Create advisor org
  RAISE NOTICE '3️⃣ Creating advisor organization...';
  INSERT INTO public.orgs (name, entity_type, created_at, updated_at)
  VALUES (v_org_name, 'advisor', NOW(), NOW())
  ON CONFLICT DO NOTHING;
  
  SELECT id INTO v_org_id FROM public.orgs WHERE entity_type = 'advisor' AND name = v_org_name LIMIT 1;
  RAISE NOTICE '✅ Advisor org ID: %', v_org_id;

  -- Step 4: Add advisor to org
  RAISE NOTICE '4️⃣ Adding org membership...';
  INSERT INTO public.org_members (org_id, user_id, role, created_at)
  VALUES (v_org_id, v_user_id, 'owner', NOW())
  ON CONFLICT (org_id, user_id) DO NOTHING;
  RAISE NOTICE '✅ Org membership created';

  -- Step 5: Set active_org_id for the advisor
  RAISE NOTICE '5️⃣ Setting active organization...';
  UPDATE public.profiles
  SET active_org_id = v_org_id
  WHERE id = v_user_id;
  RAISE NOTICE '✅ Active org set'

  -- Summary
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Setup complete!';
  RAISE NOTICE '   User ID: %', v_user_id;
  RAISE NOTICE '   Org ID: %', v_org_id;
  RAISE NOTICE '';
  RAISE NOTICE '✨ This advisor will be auto-assigned to all new projects.';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '';
    RAISE NOTICE '❌ Setup failed!';
    RAISE NOTICE 'Error: %', SQLERRM;
    RAISE NOTICE 'Detail: %', SQLSTATE;
    RAISE;
END $$;