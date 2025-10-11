-- Enhanced RBAC System Database Schema
-- This file contains all SQL statements needed to set up the new RBAC system

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create borrower_entities table
CREATE TABLE IF NOT EXISTS borrower_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 2. Create borrower_entity_members table
CREATE TABLE IF NOT EXISTS borrower_entity_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES borrower_entities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  invite_token TEXT UNIQUE,
  invite_expires_at TIMESTAMP WITH TIME ZONE,
  accepted_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'removed')),
  UNIQUE(entity_id, user_id)
);

-- 3. Create document_permissions table
CREATE TABLE IF NOT EXISTS document_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES borrower_entities(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  document_path TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  permission_type TEXT NOT NULL CHECK (permission_type IN ('file', 'folder')),
  UNIQUE(entity_id, project_id, document_path, user_id)
);

-- 4. Modify borrowers table (add new columns)
ALTER TABLE borrowers 
ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES borrower_entities(id),
ADD COLUMN IF NOT EXISTS master_profile_id UUID REFERENCES borrowers(id),
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '[]'::jsonb;

-- 5. Modify projects table (add entity_id column)
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES borrower_entities(id);

-- 6. Modify profiles table (add active_entity_id column)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS active_entity_id UUID REFERENCES borrower_entities(id);

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_borrower_entity_members_entity_id ON borrower_entity_members(entity_id);
CREATE INDEX IF NOT EXISTS idx_borrower_entity_members_user_id ON borrower_entity_members(user_id);
CREATE INDEX IF NOT EXISTS idx_borrower_entity_members_status ON borrower_entity_members(status);
CREATE INDEX IF NOT EXISTS idx_borrower_entity_members_invite_token ON borrower_entity_members(invite_token);

CREATE INDEX IF NOT EXISTS idx_document_permissions_entity_id ON document_permissions(entity_id);
CREATE INDEX IF NOT EXISTS idx_document_permissions_project_id ON document_permissions(project_id);
CREATE INDEX IF NOT EXISTS idx_document_permissions_user_id ON document_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_document_permissions_document_path ON document_permissions(document_path);

CREATE INDEX IF NOT EXISTS idx_borrowers_entity_id ON borrowers(entity_id);
CREATE INDEX IF NOT EXISTS idx_projects_entity_id ON projects(entity_id);
CREATE INDEX IF NOT EXISTS idx_profiles_active_entity_id ON profiles(active_entity_id);

-- 8. Row Level Security Policies

-- Enable RLS on all tables
ALTER TABLE borrower_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrower_entity_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_permissions ENABLE ROW LEVEL SECURITY;

-- borrower_entities policies
DROP POLICY IF EXISTS "Users can read their entities" ON borrower_entities;
CREATE POLICY "Users can read their entities" ON borrower_entities
  FOR SELECT USING (
    id IN (
      SELECT entity_id FROM borrower_entity_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "Owners can update entities" ON borrower_entities;
CREATE POLICY "Owners can update entities" ON borrower_entities
  FOR UPDATE USING (
    id IN (
      SELECT entity_id FROM borrower_entity_members 
      WHERE user_id = auth.uid() AND role = 'owner' AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "Users can create entities" ON borrower_entities;
CREATE POLICY "Users can create entities" ON borrower_entities
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- borrower_entity_members policies
DROP POLICY IF EXISTS "Members can read entity members" ON borrower_entity_members;
CREATE POLICY "Members can read entity members" ON borrower_entity_members
  FOR SELECT USING (
    entity_id IN (
      SELECT entity_id FROM borrower_entity_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "Owners can manage members" ON borrower_entity_members;
CREATE POLICY "Owners can manage members" ON borrower_entity_members
  FOR ALL USING (
    entity_id IN (
      SELECT entity_id FROM borrower_entity_members 
      WHERE user_id = auth.uid() AND role = 'owner' AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "Users can accept their own invites" ON borrower_entity_members;
CREATE POLICY "Users can accept their own invites" ON borrower_entity_members
  FOR UPDATE USING (
    user_id = auth.uid() AND status = 'pending'
  );

-- document_permissions policies
DROP POLICY IF EXISTS "Users can read their permissions" ON document_permissions;
CREATE POLICY "Users can read their permissions" ON document_permissions
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Owners can manage permissions" ON document_permissions;
CREATE POLICY "Owners can manage permissions" ON document_permissions
  FOR ALL USING (
    entity_id IN (
      SELECT entity_id FROM borrower_entity_members 
      WHERE user_id = auth.uid() AND role = 'owner' AND status = 'active'
    )
  );

-- Update existing RLS policies for borrowers table
DROP POLICY IF EXISTS "Users can read their own borrower profile" ON borrowers;
CREATE POLICY "Users can read their own borrower profile" ON borrowers
  FOR SELECT USING (
    id IN (
      SELECT owner_id FROM projects 
      WHERE entity_id IN (
        SELECT entity_id FROM borrower_entity_members 
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

DROP POLICY IF EXISTS "Users can update their own borrower profile" ON borrowers;
CREATE POLICY "Users can update their own borrower profile" ON borrowers
  FOR UPDATE USING (
    id IN (
      SELECT owner_id FROM projects 
      WHERE entity_id IN (
        SELECT entity_id FROM borrower_entity_members 
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

-- Update existing RLS policies for projects table
DROP POLICY IF EXISTS "Users can read their own projects" ON projects;
CREATE POLICY "Users can read their own projects" ON projects
  FOR SELECT USING (
    entity_id IN (
      SELECT entity_id FROM borrower_entity_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
CREATE POLICY "Users can update their own projects" ON projects
  FOR UPDATE USING (
    entity_id IN (
      SELECT entity_id FROM borrower_entity_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- 9. Create functions for common operations

-- Function to check if user is owner of entity
CREATE OR REPLACE FUNCTION is_entity_owner(entity_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM borrower_entity_members 
    WHERE entity_id = entity_uuid 
    AND user_id = user_uuid 
    AND role = 'owner' 
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is member of entity
CREATE OR REPLACE FUNCTION is_entity_member(entity_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM borrower_entity_members 
    WHERE entity_id = entity_uuid 
    AND user_id = user_uuid 
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's role in entity
CREATE OR REPLACE FUNCTION get_user_entity_role(entity_uuid UUID, user_uuid UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role FROM borrower_entity_members 
    WHERE entity_id = entity_uuid 
    AND user_id = user_uuid 
    AND status = 'active'
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create triggers for updated_at timestamps

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for borrower_entities
DROP TRIGGER IF EXISTS update_borrower_entities_updated_at ON borrower_entities;
CREATE TRIGGER update_borrower_entities_updated_at
  BEFORE UPDATE ON borrower_entities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 11. Create views for easier querying

-- View for active entity members with user details
CREATE OR REPLACE VIEW active_entity_members AS
SELECT 
  bem.id,
  bem.entity_id,
  bem.user_id,
  bem.role,
  bem.invited_by,
  bem.invited_at,
  bem.accepted_at,
  bem.status,
  p.email as user_email,
  p.full_name as user_name,
  be.name as entity_name
FROM borrower_entity_members bem
JOIN borrower_entities be ON bem.entity_id = be.id
LEFT JOIN profiles p ON bem.user_id = p.id
WHERE bem.status = 'active';

-- View for pending invites with inviter details
CREATE OR REPLACE VIEW pending_invites AS
SELECT 
  bem.id,
  bem.entity_id,
  bem.user_id,
  bem.role,
  bem.invited_by,
  bem.invited_at,
  bem.invite_token,
  bem.invite_expires_at,
  p.email as user_email,
  p.full_name as user_name,
  be.name as entity_name,
  inviter.email as inviter_email,
  inviter.full_name as inviter_name
FROM borrower_entity_members bem
JOIN borrower_entities be ON bem.entity_id = be.id
LEFT JOIN profiles p ON bem.user_id = p.id
LEFT JOIN profiles inviter ON bem.invited_by = inviter.id
WHERE bem.status = 'pending';

-- 12. Grant necessary permissions

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON borrower_entities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON borrower_entity_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON document_permissions TO authenticated;

-- Grant permissions on views
GRANT SELECT ON active_entity_members TO authenticated;
GRANT SELECT ON pending_invites TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
