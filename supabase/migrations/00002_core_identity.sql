-- Migration: 00002_core_identity.sql
-- Description: Core identity tables: Workspace, User, PatientProfile, WorkspaceMembership
-- Schema Version: 1.3.0

-- Workspace: Security boundary and multi-client container
CREATE TABLE workspace (
  workspace_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name TEXT NOT NULL,
  timezone_default TEXT NOT NULL DEFAULT 'America/Los_Angeles',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for workspace lookups
CREATE INDEX idx_workspace_created_at ON workspace(created_at);

-- User: A person account in the app
-- Note: This references Supabase auth.users via user_id = auth.uid()
CREATE TABLE "user" (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  status user_status NOT NULL DEFAULT 'active',
  timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for user table
CREATE INDEX idx_user_workspace_id ON "user"(workspace_id);
CREATE INDEX idx_user_status ON "user"(status);

-- PatientProfile: Profile for the supported person
CREATE TABLE patient_profile (
  patient_id UUID PRIMARY KEY REFERENCES "user"(user_id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  sex TEXT,
  allergies JSONB,
  conditions JSONB,
  timezone_default TEXT NOT NULL DEFAULT 'America/Los_Angeles'
);

-- Index for patient lookups by workspace
CREATE INDEX idx_patient_profile_workspace_id ON patient_profile(workspace_id);

-- WorkspaceMembership: Users belong to a workspace with a role
CREATE TABLE workspace_membership (
  workspace_membership_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
  role_key role_key NOT NULL,
  status membership_status NOT NULL DEFAULT 'active',
  invited_by_user_id UUID REFERENCES "user"(user_id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,

  -- Ensure unique membership per user per workspace
  CONSTRAINT uq_workspace_membership_user_workspace UNIQUE (workspace_id, user_id)
);

-- Indexes for workspace membership
CREATE INDEX idx_workspace_membership_workspace_id ON workspace_membership(workspace_id);
CREATE INDEX idx_workspace_membership_user_id ON workspace_membership(user_id);
CREATE INDEX idx_workspace_membership_role_key ON workspace_membership(role_key);
CREATE INDEX idx_workspace_membership_status ON workspace_membership(status);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER workspace_updated_at
  BEFORE UPDATE ON workspace
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER user_updated_at
  BEFORE UPDATE ON "user"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE workspace IS 'Security boundary and future multi-client container. Single-client v1 still uses a workspace.';
COMMENT ON TABLE "user" IS 'A person account in the app, linked to Supabase auth.users.';
COMMENT ON TABLE patient_profile IS 'Profile for the supported person (single-client now; can expand later).';
COMMENT ON TABLE workspace_membership IS 'Users belong to a workspace with a role. This enables later multi-client expansion cleanly.';
