-- =============================================================================
-- Lender Seed Data
-- =============================================================================
-- This file adds sample lender data for testing purposes.
-- Run this AFTER the main seed.sql or after running the application normally.
--
-- Test credentials: lender@example.com / password
-- =============================================================================

-- Create lender user in auth.users
INSERT INTO "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") VALUES
	('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'lender@example.com', '$2a$10$Jc1wtO.NBUGN6Q3r2G7b../dNHiC2J.GCF54NNHbfkPkcRUDkQdCu', NOW(), NULL, '', NULL, '', NULL, '', '', NULL, NOW(), '{"provider": "email", "providers": ["email"]}', '{"full_name": "Capital Lending Group", "email_verified": true}', NULL, NOW(), NOW(), NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false)
ON CONFLICT (id) DO NOTHING;

-- Create identity for lender user
INSERT INTO "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") VALUES
	('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '{"sub": "11111111-1111-1111-1111-111111111111", "email": "lender@example.com", "email_verified": false, "phone_verified": false}', 'email', NOW(), NOW(), NOW(), 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
ON CONFLICT (id) DO NOTHING;

-- Create lender organization
INSERT INTO "public"."orgs" ("id", "created_at", "updated_at", "name", "entity_type") VALUES
	('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NOW(), NOW(), 'Capital Lending Group', 'lender')
ON CONFLICT (id) DO NOTHING;

-- Create lender profile
INSERT INTO "public"."profiles" ("id", "created_at", "updated_at", "full_name", "email", "app_role", "active_org_id") VALUES
	('11111111-1111-1111-1111-111111111111', NOW(), NOW(), 'Capital Lending Group', 'lender@example.com', 'lender', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
ON CONFLICT (id) DO NOTHING;

-- Add lender as owner of their org
INSERT INTO "public"."org_members" ("org_id", "user_id", "role", "created_at") VALUES
	('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'owner', NOW())
ON CONFLICT (org_id, user_id) DO NOTHING;

-- Grant lender access to the demo project (My First Project)
-- This assumes the project ID from seed.sql is 'd231b8bc-2239-4365-87a1-dc67bd795604'
INSERT INTO "public"."lender_project_access" ("id", "lender_org_id", "project_id", "granted_by", "created_at") VALUES
	('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'd231b8bc-2239-4365-87a1-dc67bd795604', 'f85936ae-02c2-4006-9065-59caf2ad26cb', NOW())
ON CONFLICT (lender_org_id, project_id) DO NOTHING;

-- Optional: Add lender team member
INSERT INTO "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") VALUES
	('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'lender.analyst@example.com', '$2a$10$Jc1wtO.NBUGN6Q3r2G7b../dNHiC2J.GCF54NNHbfkPkcRUDkQdCu', NOW(), NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"full_name": "Sarah Analyst", "email_verified": true}', NULL, NOW(), NOW(), NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") VALUES
	('22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '{"sub": "22222222-2222-2222-2222-222222222222", "email": "lender.analyst@example.com", "email_verified": false, "phone_verified": false}', 'email', NOW(), NOW(), NOW(), 'dddddddd-dddd-dddd-dddd-dddddddddddd')
ON CONFLICT (id) DO NOTHING;

INSERT INTO "public"."profiles" ("id", "created_at", "updated_at", "full_name", "email", "app_role", "active_org_id") VALUES
	('22222222-2222-2222-2222-222222222222', NOW(), NOW(), 'Sarah Analyst', 'lender.analyst@example.com', 'lender', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
ON CONFLICT (id) DO NOTHING;

INSERT INTO "public"."org_members" ("org_id", "user_id", "role", "created_at") VALUES
	('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'member', NOW())
ON CONFLICT (org_id, user_id) DO NOTHING;

-- Summary
SELECT 'Lender seed data inserted successfully!' AS status;
SELECT 'Test lender account: lender@example.com / password' AS credentials;
SELECT 'Test lender team member: lender.analyst@example.com / password' AS team_credentials;
