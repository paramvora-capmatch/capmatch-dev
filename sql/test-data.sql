-- Test data setup for RBAC system
-- Run this in Supabase Studio SQL editor

-- 1. Create test users (only if they don't exist)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'owner@test.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222222', 'member@test.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW()),
  ('33333333-3333-3333-3333-333333333333', 'advisor@test.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 2. Create profiles (only if they don't exist)
INSERT INTO profiles (id, email, role, full_name)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'owner@test.com', 'borrower', 'John Owner'),
  ('22222222-2222-2222-2222-222222222222', 'member@test.com', 'borrower', 'Jane Member'),
  ('33333333-3333-3333-3333-333333333333', 'advisor@test.com', 'advisor', 'Advisor Smith')
ON CONFLICT (id) DO NOTHING;

-- 3. Create borrower profiles (only if they don't exist)
-- Using minimal fields that actually exist in the borrowers table
INSERT INTO borrowers (id, full_legal_name, created_at, updated_at)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'John Owner', NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222222', 'Jane Member', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 4. Create test projects (only if they don't exist)
-- Using minimal fields that actually exist in the projects table
INSERT INTO projects (id, owner_id, project_name, created_at, updated_at)
VALUES 
  ('11111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 'Downtown Office Tower', NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', 'Retail Plaza', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 5. Create entities (only if they don't exist)
INSERT INTO borrower_entities (id, name, created_at, updated_at, created_by)
VALUES 
  ('11111111-1111-1111-1111-111111111114', 'Acme Real Estate LLC', NOW(), NOW(), '11111111-1111-1111-1111-111111111111'),
  ('11111111-1111-1111-1111-111111111115', 'Jane Properties Inc', NOW(), NOW(), '22222222-2222-2222-2222-222222222222')
ON CONFLICT (id) DO NOTHING;

-- 6. Create owner memberships (only if they don't exist)
INSERT INTO borrower_entity_members (id, entity_id, user_id, role, invited_by, invited_at, accepted_at, status)
VALUES 
  ('11111111-1111-1111-1111-111111111116', '11111111-1111-1111-1111-111111111114', '11111111-1111-1111-1111-111111111111', 'owner', '11111111-1111-1111-1111-111111111111', NOW(), NOW(), 'active'),
  ('11111111-1111-1111-1111-111111111117', '11111111-1111-1111-1111-111111111115', '22222222-2222-2222-2222-222222222222', 'owner', '22222222-2222-2222-2222-222222222222', NOW(), NOW(), 'active')
ON CONFLICT (id) DO NOTHING;

-- 7. Update borrowers and projects to link to entities (safe updates)
UPDATE borrowers SET entity_id = '11111111-1111-1111-1111-111111111114' WHERE id = '11111111-1111-1111-1111-111111111111' AND entity_id IS NULL;
UPDATE borrowers SET entity_id = '11111111-1111-1111-1111-111111111115' WHERE id = '22222222-2222-2222-2222-222222222222' AND entity_id IS NULL;

UPDATE projects SET entity_id = '11111111-1111-1111-1111-111111111114' WHERE owner_id = '11111111-1111-1111-1111-111111111111' AND entity_id IS NULL;

-- 8. Update profiles to set active entity (safe updates)
UPDATE profiles SET active_entity_id = '11111111-1111-1111-1111-111111111114' WHERE id = '11111111-1111-1111-1111-111111111111' AND active_entity_id IS NULL;
UPDATE profiles SET active_entity_id = '11111111-1111-1111-1111-111111111115' WHERE id = '22222222-2222-2222-2222-222222222222' AND active_entity_id IS NULL;
