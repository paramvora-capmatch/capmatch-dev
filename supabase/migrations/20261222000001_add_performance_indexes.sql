-- Migration: Add performance indexes for frequently queried columns
-- Created: 2025-02-30 (timestamp maintained from original backend migration)
-- Description: Adds indexes to improve query performance for common access patterns
-- Note: This migration was moved from backend repo to frontend repo as all tables exist in the platform database

-- Projects table indexes
CREATE INDEX IF NOT EXISTS idx_projects_owner_org_id ON projects(owner_org_id);
CREATE INDEX IF NOT EXISTS idx_projects_assigned_advisor_id ON projects(assigned_advisor_id) WHERE assigned_advisor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

-- Project resumes table indexes
CREATE INDEX IF NOT EXISTS idx_project_resumes_project_id ON project_resumes(project_id);
CREATE INDEX IF NOT EXISTS idx_project_resumes_created_at ON project_resumes(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_resumes_created_by ON project_resumes(created_by) WHERE created_by IS NOT NULL;

-- Borrower resumes table indexes
CREATE INDEX IF NOT EXISTS idx_borrower_resumes_project_id ON borrower_resumes(project_id);
CREATE INDEX IF NOT EXISTS idx_borrower_resumes_created_at ON borrower_resumes(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_borrower_resumes_created_by ON borrower_resumes(created_by) WHERE created_by IS NOT NULL;

-- Resources table indexes (composite for common query patterns)
CREATE INDEX IF NOT EXISTS idx_resources_project_type ON resources(project_id, resource_type);
CREATE INDEX IF NOT EXISTS idx_resources_org_project ON resources(org_id, project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_resources_current_version ON resources(current_version_id) WHERE current_version_id IS NOT NULL;

-- Extraction cache table indexes
-- Note: extraction_cache uses source_identifier instead of resource_id
CREATE INDEX IF NOT EXISTS idx_extraction_cache_project_source ON extraction_cache(project_id, source_type);
CREATE INDEX IF NOT EXISTS idx_extraction_cache_source_version ON extraction_cache(source_identifier, version_number) WHERE source_identifier IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_extraction_cache_created_at ON extraction_cache(created_at DESC);

-- Organization members table indexes
CREATE INDEX IF NOT EXISTS idx_org_members_org_role ON org_members(org_id, role);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_user ON org_members(org_id, user_id);

-- Project access grants table indexes
CREATE INDEX IF NOT EXISTS idx_project_access_grants_project_user ON project_access_grants(project_id, user_id);
CREATE INDEX IF NOT EXISTS idx_project_access_grants_user_id ON project_access_grants(user_id);
CREATE INDEX IF NOT EXISTS idx_project_access_grants_org_id ON project_access_grants(org_id);

-- Invites table indexes
CREATE INDEX IF NOT EXISTS idx_invites_token ON invites(token) WHERE token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invites_status ON invites(status);
CREATE INDEX IF NOT EXISTS idx_invites_org_id ON invites(org_id);
CREATE INDEX IF NOT EXISTS idx_invites_invited_email ON invites(invited_email);

-- Chat threads table indexes
CREATE INDEX IF NOT EXISTS idx_chat_threads_project_id ON chat_threads(project_id);
CREATE INDEX IF NOT EXISTS idx_chat_threads_created_at ON chat_threads(created_at DESC);

-- Chat thread participants table indexes
CREATE INDEX IF NOT EXISTS idx_chat_thread_participants_thread_user ON chat_thread_participants(thread_id, user_id);
CREATE INDEX IF NOT EXISTS idx_chat_thread_participants_user_id ON chat_thread_participants(user_id);

-- Calendar connections table indexes
CREATE INDEX IF NOT EXISTS idx_calendar_connections_user_provider ON calendar_connections(user_id, provider);
CREATE INDEX IF NOT EXISTS idx_calendar_connections_user_id ON calendar_connections(user_id);

-- Meetings table indexes
CREATE INDEX IF NOT EXISTS idx_meetings_project_id ON meetings(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_meetings_room_name ON meetings(room_name) WHERE room_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_meetings_created_at ON meetings(created_at DESC);

-- Profiles table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Organizations table indexes
CREATE INDEX IF NOT EXISTS idx_orgs_entity_type ON orgs(entity_type);
CREATE INDEX IF NOT EXISTS idx_orgs_name ON orgs(name);

-- Notes: 
-- 1. Partial indexes (WHERE clause) are used for columns that may have NULL values
--    to reduce index size and improve performance
-- 2. Composite indexes are created for common query patterns (e.g., project_id + resource_type)
-- 3. DESC indexes are used for created_at columns to optimize ORDER BY created_at DESC queries
-- 4. All indexes use IF NOT EXISTS to allow safe re-running of the migration
-- 5. Fixed extraction_cache indexes to use source_identifier instead of resource_id (column doesn't exist)
