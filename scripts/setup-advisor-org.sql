-- scripts/setup-advisor-org-v3.sql
-- Run with: psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f scripts/setup-advisor-org-v3.sql

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create advisor user, profile, org, and membership
DO $$
DECLARE
  v_advisor_user_id UUID;
  v_advisor_email TEXT := 'cody@capmatch.com';
  v_advisor_password TEXT := 'password123';
  v_advisor_name TEXT := 'Cody Field';
  v_org_name TEXT := 'CapMatch Advisors';
  v_advisor_org_id UUID;
  v_user_exists BOOLEAN;
BEGIN
  RAISE NOTICE '🚀 Starting advisor setup...';
  
  -- Check if user already exists
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE email = v_advisor_email
  ) INTO v_user_exists;

  IF v_user_exists THEN
    RAISE NOTICE '⚠️  User already exists, fetching ID...';
    SELECT id INTO v_advisor_user_id FROM auth.users WHERE email = v_advisor_email;
  ELSE
    -- Step 1: Create auth user (minimal columns for compatibility)
    RAISE NOTICE '1️⃣ Creating auth user...';
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      role
    )
    VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      v_advisor_email,
      crypt(v_advisor_password, gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      format('{"full_name": "%s"}', v_advisor_name)::jsonb,
      FALSE,
      'authenticated'
    )
    RETURNING id INTO v_advisor_user_id;

    RAISE NOTICE '✅ Created user with ID: %', v_advisor_user_id;

    -- Create identity record for email/password login
    -- provider_id should be the user_id as a string for email provider
    INSERT INTO auth.identities (
      id,
      user_id,
      provider_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      v_advisor_user_id,
      v_advisor_user_id::text,
      format('{"sub": "%s", "email": "%s", "email_verified": true, "phone_verified": false}', v_advisor_user_id, v_advisor_email)::jsonb,
      'email',
      NOW(),
      NOW(),
      NOW()
    );
    
    RAISE NOTICE '✅ Created identity record';
  END IF;

  -- Step 2: Create/update profile
  RAISE NOTICE '2️⃣ Creating profile...';
  INSERT INTO public.profiles (id, email, full_name, app_role, created_at, updated_at)
  VALUES (v_advisor_user_id, v_advisor_email, v_advisor_name, 'advisor', NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, app_role = EXCLUDED.app_role;
  RAISE NOTICE '✅ Profile created';

  -- Step 3: Create advisor org
  RAISE NOTICE '3️⃣ Creating advisor organization...';
  INSERT INTO public.orgs (name, entity_type, created_at, updated_at)
  VALUES (v_org_name, 'advisor', NOW(), NOW())
  ON CONFLICT DO NOTHING;
  
  SELECT id INTO v_advisor_org_id FROM public.orgs WHERE entity_type = 'advisor' AND name = v_org_name;
  RAISE NOTICE '✅ Advisor org ID: %', v_advisor_org_id;

  -- Step 4: Add advisor to org
  RAISE NOTICE '4️⃣ Adding org membership...';
  INSERT INTO public.org_members (org_id, user_id, role, created_at)
  VALUES (v_advisor_org_id, v_advisor_user_id, 'owner', NOW())
  ON CONFLICT (org_id, user_id) DO NOTHING;
  RAISE NOTICE '✅ Org membership created';

  -- Summary
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Setup complete!';
  RAISE NOTICE '📧 Login credentials:';
  RAISE NOTICE '   Email: %', v_advisor_email;
  RAISE NOTICE '   Password: %', v_advisor_password;
  RAISE NOTICE '   User ID: %', v_advisor_user_id;
  RAISE NOTICE '   Org ID: %', v_advisor_org_id;
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