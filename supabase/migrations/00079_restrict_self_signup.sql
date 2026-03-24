-- Migration: 00071_restrict_self_signup.sql
-- Description: Restrict self-service signup by requiring pre-authorization.
-- Users created via admin_create_user already have workspace_membership,
-- so complete_onboarding returns early for them. This prevents unknown
-- users from self-creating workspaces with admin role.

-- =============================================================================
-- SIGNUP ALLOWLIST TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS signup_allowlist (
  allowlist_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_at TIMESTAMPTZ
);

-- RLS: only admins can manage the allowlist
ALTER TABLE signup_allowlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_manage_allowlist" ON signup_allowlist
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workspace_membership wm
      WHERE wm.user_id = auth.uid()
        AND wm.role_key = 'admin'
        AND wm.status = 'active'
    )
  );

-- =============================================================================
-- UPDATE ONBOARDING FUNCTION: check allowlist before creating workspace
-- =============================================================================

CREATE OR REPLACE FUNCTION complete_onboarding(
  p_display_name TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_workspace_id UUID;
  v_patient_id UUID;
  v_name TEXT;
BEGIN
  -- Get the current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if user already has a workspace (e.g. created via admin_create_user)
  IF EXISTS (
    SELECT 1 FROM workspace_membership
    WHERE user_id = v_user_id AND status = 'active'
  ) THEN
    RETURN jsonb_build_object(
      'success', true,
      'workspace_id', (
        SELECT workspace_id FROM workspace_membership
        WHERE user_id = v_user_id AND status = 'active'
        LIMIT 1
      ),
      'already_onboarded', true
    );
  END IF;

  -- Get user email from auth.users
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = v_user_id;

  -- *** NEW: Check signup allowlist ***
  IF NOT EXISTS (
    SELECT 1 FROM signup_allowlist
    WHERE email = v_user_email AND used_at IS NULL
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Your email is not authorized for signup. Please contact an administrator.'
    );
  END IF;

  -- Mark allowlist entry as used
  UPDATE signup_allowlist
  SET used_at = now()
  WHERE email = v_user_email AND used_at IS NULL;

  -- Determine display name
  v_name := COALESCE(
    NULLIF(p_display_name, ''),
    split_part(v_user_email, '@', 1),
    'User'
  );

  -- Generate IDs
  v_workspace_id := gen_random_uuid();
  v_patient_id := gen_random_uuid();

  -- Create workspace
  INSERT INTO workspace (workspace_id, name, timezone, created_at, updated_at)
  VALUES (
    v_workspace_id,
    v_name || '''s Workspace',
    'America/Los_Angeles',
    now(),
    now()
  );

  -- Create or update user profile
  INSERT INTO "user" (user_id, email, display_name, status, created_at, updated_at)
  VALUES (v_user_id, v_user_email, v_name, 'active', now(), now())
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = EXCLUDED.display_name,
    updated_at = now();

  -- Create patient profile
  INSERT INTO patient_profile (patient_id, workspace_id, display_name, created_at, updated_at)
  VALUES (v_patient_id, v_workspace_id, v_name, now(), now());

  -- Create workspace membership as admin
  INSERT INTO workspace_membership (workspace_id, user_id, patient_id, role_key, status, created_at)
  VALUES (v_workspace_id, v_user_id, v_patient_id, 'admin', 'active', now());

  -- Initialize user progress
  INSERT INTO user_progress (workspace_id, user_id, points_system_key, total_points, current_level, next_level_points, points_to_next_level, last_recomputed_at)
  VALUES (v_workspace_id, v_user_id, 'points', 0, 1, 100, 100, now());

  RETURN jsonb_build_object(
    'success', true,
    'workspace_id', v_workspace_id,
    'patient_id', v_patient_id,
    'already_onboarded', false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE signup_allowlist IS 'Pre-authorized emails that can self-register. Managed by admins.';
COMMENT ON FUNCTION complete_onboarding IS 'Bootstraps workspace for new users. Requires email to be in signup_allowlist.';
