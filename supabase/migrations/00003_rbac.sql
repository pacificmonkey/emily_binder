-- Migration: 00003_rbac.sql
-- Description: RBAC tables: Permission, RolePermission, RoleLabel
-- Schema Version: 1.3.0

-- Permission: Canonical permission list for RBAC
CREATE TABLE permission (
  permission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key permission_key NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for permission lookups by key
CREATE INDEX idx_permission_key ON permission(key);

-- RolePermission: Maps roles to allowed permissions; workspace-scoped overrides are supported
CREATE TABLE role_permission (
  role_permission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  role_key role_key NOT NULL,
  permission_key permission_key NOT NULL,
  allowed BOOLEAN NOT NULL DEFAULT true,
  set_by_user_id UUID NOT NULL REFERENCES "user"(user_id) ON DELETE SET NULL,
  set_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Unique constraint: one permission setting per role per workspace
  CONSTRAINT uq_role_permission_workspace_role_perm UNIQUE (workspace_id, role_key, permission_key)
);

-- Indexes for role_permission
CREATE INDEX idx_role_permission_workspace_id ON role_permission(workspace_id);
CREATE INDEX idx_role_permission_role_key ON role_permission(role_key);
CREATE INDEX idx_role_permission_permission_key ON role_permission(permission_key);

-- RoleLabel: Renameable display labels for roles (e.g., Joey/Emily/Family)
CREATE TABLE role_label (
  role_label_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type scope_type NOT NULL,
  scope_id UUID,  -- If scope_type=workspace, scope_id=workspace_id
  role_key role_key NOT NULL,
  singular_label TEXT NOT NULL,
  plural_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Unique constraint: one label per role per scope
  CONSTRAINT uq_role_label_scope_role UNIQUE (scope_type, scope_id, role_key)
);

-- Indexes for role_label
CREATE INDEX idx_role_label_scope ON role_label(scope_type, scope_id);
CREATE INDEX idx_role_label_role_key ON role_label(role_key);

-- Apply updated_at trigger
CREATE TRIGGER role_label_updated_at
  BEFORE UPDATE ON role_label
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE permission IS 'Canonical permission list for RBAC.';
COMMENT ON TABLE role_permission IS 'Maps roles to allowed permissions; workspace-scoped overrides are supported.';
COMMENT ON TABLE role_label IS 'Renameable display labels for roles (e.g., Joey/Emily/Family).';

-- Function to check if a user has a specific permission
CREATE OR REPLACE FUNCTION user_has_permission(
  p_user_id UUID,
  p_workspace_id UUID,
  p_permission_key permission_key
) RETURNS BOOLEAN AS $$
DECLARE
  v_role_key role_key;
  v_allowed BOOLEAN;
BEGIN
  -- Get the user's role in this workspace
  SELECT role_key INTO v_role_key
  FROM workspace_membership
  WHERE user_id = p_user_id
    AND workspace_id = p_workspace_id
    AND status = 'active';

  IF v_role_key IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check role_permission for this workspace
  SELECT allowed INTO v_allowed
  FROM role_permission
  WHERE workspace_id = p_workspace_id
    AND role_key = v_role_key
    AND permission_key = p_permission_key;

  -- Default: admin has all permissions, others have none
  IF v_allowed IS NULL THEN
    RETURN v_role_key = 'admin';
  END IF;

  RETURN v_allowed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's role in a workspace
CREATE OR REPLACE FUNCTION get_user_role(
  p_user_id UUID,
  p_workspace_id UUID
) RETURNS role_key AS $$
DECLARE
  v_role_key role_key;
BEGIN
  SELECT role_key INTO v_role_key
  FROM workspace_membership
  WHERE user_id = p_user_id
    AND workspace_id = p_workspace_id
    AND status = 'active';

  RETURN v_role_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
