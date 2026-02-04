-- Migration: 00006_rls_policies.sql
-- Description: Row Level Security policies for core identity and base tables
-- Schema Version: 1.3.0

-- Enable RLS on all tables
ALTER TABLE workspace ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_membership ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permission ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_label ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_module ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_module_setting ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_system ENABLE ROW LEVEL SECURITY;
ALTER TABLE currency_label ENABLE ROW LEVEL SECURITY;
ALTER TABLE level_curve ENABLE ROW LEVEL SECURITY;
ALTER TABLE level_curve_step ENABLE ROW LEVEL SECURITY;
ALTER TABLE level_system ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_ledger_entry ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- WORKSPACE POLICIES
-- =============================================================================

-- Users can see workspaces they are members of
CREATE POLICY workspace_select ON workspace
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_membership wm
      WHERE wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
  );

-- Only admins can update workspace settings
CREATE POLICY workspace_update ON workspace
  FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_membership wm
      WHERE wm.user_id = auth.uid()
        AND wm.role_key = 'admin'
        AND wm.status = 'active'
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_membership wm
      WHERE wm.user_id = auth.uid()
        AND wm.role_key = 'admin'
        AND wm.status = 'active'
    )
  );

-- =============================================================================
-- USER POLICIES
-- =============================================================================

-- Users can see other users in their workspace
CREATE POLICY user_select ON "user"
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_membership wm
      WHERE wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
  );

-- Users can update their own profile
CREATE POLICY user_update_own ON "user"
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can update any user in their workspace
CREATE POLICY user_update_admin ON "user"
  FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_membership wm
      WHERE wm.user_id = auth.uid()
        AND wm.role_key = 'admin'
        AND wm.status = 'active'
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_membership wm
      WHERE wm.user_id = auth.uid()
        AND wm.role_key = 'admin'
        AND wm.status = 'active'
    )
  );

-- =============================================================================
-- PATIENT PROFILE POLICIES
-- =============================================================================

-- Users can see patient profiles in their workspace
CREATE POLICY patient_profile_select ON patient_profile
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_membership wm
      WHERE wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
  );

-- Admins can update patient profiles
CREATE POLICY patient_profile_update ON patient_profile
  FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_membership wm
      WHERE wm.user_id = auth.uid()
        AND wm.role_key = 'admin'
        AND wm.status = 'active'
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_membership wm
      WHERE wm.user_id = auth.uid()
        AND wm.role_key = 'admin'
        AND wm.status = 'active'
    )
  );

-- =============================================================================
-- WORKSPACE MEMBERSHIP POLICIES
-- =============================================================================

-- Users can see memberships in their workspace
CREATE POLICY workspace_membership_select ON workspace_membership
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_membership wm
      WHERE wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
  );

-- Admins can manage memberships
CREATE POLICY workspace_membership_insert ON workspace_membership
  FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_membership wm
      WHERE wm.user_id = auth.uid()
        AND wm.role_key = 'admin'
        AND wm.status = 'active'
    )
  );

CREATE POLICY workspace_membership_update ON workspace_membership
  FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_membership wm
      WHERE wm.user_id = auth.uid()
        AND wm.role_key = 'admin'
        AND wm.status = 'active'
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_membership wm
      WHERE wm.user_id = auth.uid()
        AND wm.role_key = 'admin'
        AND wm.status = 'active'
    )
  );

-- =============================================================================
-- PERMISSION POLICIES (Read-only for all authenticated users)
-- =============================================================================

CREATE POLICY permission_select ON permission
  FOR SELECT
  TO authenticated
  USING (true);

-- =============================================================================
-- ROLE PERMISSION POLICIES
-- =============================================================================

-- Users can see role permissions in their workspace
CREATE POLICY role_permission_select ON role_permission
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_membership wm
      WHERE wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
  );

-- Only admins can modify role permissions
CREATE POLICY role_permission_insert ON role_permission
  FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_membership wm
      WHERE wm.user_id = auth.uid()
        AND wm.role_key = 'admin'
        AND wm.status = 'active'
    )
  );

CREATE POLICY role_permission_update ON role_permission
  FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_membership wm
      WHERE wm.user_id = auth.uid()
        AND wm.role_key = 'admin'
        AND wm.status = 'active'
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_membership wm
      WHERE wm.user_id = auth.uid()
        AND wm.role_key = 'admin'
        AND wm.status = 'active'
    )
  );

CREATE POLICY role_permission_delete ON role_permission
  FOR DELETE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_membership wm
      WHERE wm.user_id = auth.uid()
        AND wm.role_key = 'admin'
        AND wm.status = 'active'
    )
  );

-- =============================================================================
-- ROLE LABEL POLICIES
-- =============================================================================

-- All authenticated users can see role labels
CREATE POLICY role_label_select ON role_label
  FOR SELECT
  TO authenticated
  USING (true);

-- =============================================================================
-- FEATURE MODULE POLICIES (Read-only for all authenticated users)
-- =============================================================================

CREATE POLICY feature_module_select ON feature_module
  FOR SELECT
  TO authenticated
  USING (true);

-- =============================================================================
-- FEATURE MODULE SETTING POLICIES
-- =============================================================================

-- Users can see feature settings in their workspace
CREATE POLICY feature_module_setting_select ON feature_module_setting
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_membership wm
      WHERE wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
  );

-- Only admins can modify feature settings
CREATE POLICY feature_module_setting_insert ON feature_module_setting
  FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_membership wm
      WHERE wm.user_id = auth.uid()
        AND wm.role_key = 'admin'
        AND wm.status = 'active'
    )
  );

CREATE POLICY feature_module_setting_update ON feature_module_setting
  FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_membership wm
      WHERE wm.user_id = auth.uid()
        AND wm.role_key = 'admin'
        AND wm.status = 'active'
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_membership wm
      WHERE wm.user_id = auth.uid()
        AND wm.role_key = 'admin'
        AND wm.status = 'active'
    )
  );

-- =============================================================================
-- POINTS SYSTEM AND CURRENCY LABEL POLICIES
-- =============================================================================

CREATE POLICY points_system_select ON points_system
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY currency_label_select ON currency_label
  FOR SELECT
  TO authenticated
  USING (true);

-- =============================================================================
-- LEVEL CURVE POLICIES (Read-only for all authenticated users)
-- =============================================================================

CREATE POLICY level_curve_select ON level_curve
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY level_curve_step_select ON level_curve_step
  FOR SELECT
  TO authenticated
  USING (true);

-- =============================================================================
-- LEVEL SYSTEM POLICIES
-- =============================================================================

CREATE POLICY level_system_select ON level_system
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_membership wm
      WHERE wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
  );

-- =============================================================================
-- USER PROGRESS POLICIES
-- =============================================================================

CREATE POLICY user_progress_select ON user_progress
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_membership wm
      WHERE wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
  );

-- =============================================================================
-- POINTS LEDGER ENTRY POLICIES
-- =============================================================================

-- Users can see points ledger in their workspace
CREATE POLICY points_ledger_entry_select ON points_ledger_entry
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_membership wm
      WHERE wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
  );

-- Members can insert points ledger entries (for task completion)
CREATE POLICY points_ledger_entry_insert ON points_ledger_entry
  FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_membership wm
      WHERE wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
  );

-- =============================================================================
-- SERVICE ROLE BYPASS (for backend operations)
-- =============================================================================

-- Grant service_role full access (bypasses RLS)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
