-- Insert AI Underwriter system user so chat_thread_participants FK is satisfied.
-- The backend adds user_id = 00000000-0000-0000-0000-000000000000 as a participant
-- when creating threads and when sending messages (AI reply). profiles(id) references
-- auth.users(id), so we need both rows.

-- 1. Insert into auth.users (id = AI_USER_ID) if not present.
--    Use existing instance_id when available (hosted); fallback for local/fresh DB.
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token_new,
  email_change,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  phone_change_sent_at,
  email_change_token_current,
  email_change_confirm_status,
  banned_until,
  reauthentication_token,
  reauthentication_sent_at,
  is_sso_user,
  deleted_at,
  is_anonymous
)
SELECT
  COALESCE((SELECT instance_id FROM auth.users LIMIT 1), '00000000-0000-0000-0000-000000000000'::uuid),
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  'ai-underwriter@capmatch.system',
  '',
  now(),
  NULL,
  '',
  NULL,
  '',
  NULL,
  '',
  '',
  NULL,
  NULL,
  '{"provider": "system", "providers": ["system"]}'::jsonb,
  '{"full_name": "AI Underwriter"}'::jsonb,
  false,
  now(),
  now(),
  NULL,
  NULL,
  '',
  '',
  NULL,
  '',
  0,
  NULL,
  '',
  NULL,
  false,
  NULL,
  false
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000000'::uuid);

-- 2. Insert into public.profiles so chat_thread_participants.user_id FK is satisfied.
INSERT INTO public.profiles (id, full_name, email, app_role)
VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  'AI Underwriter',
  'ai-underwriter@capmatch.system',
  'advisor'
)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  updated_at = now();
