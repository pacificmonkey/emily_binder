-- Migration: 00011_onboarding_function.sql
-- Description: Secure onboarding function to bootstrap workspace for new users
-- Schema Version: 1.3.0

-- =============================================================================
-- ONBOARDING FUNCTION
-- =============================================================================

-- This function creates the initial workspace, user profile, patient profile,
-- and membership for a new user. It runs with SECURITY DEFINER to bypass RLS.
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

  -- Check if user already has a workspace
  IF EXISTS (
    SELECT 1 FROM workspace_membership
    WHERE user_id = v_user_id AND status = 'active'
  ) THEN
    -- Return existing workspace info
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

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION complete_onboarding(TEXT) TO authenticated;

-- =============================================================================
-- CHECK ONBOARDING STATUS FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION check_onboarding_status()
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_workspace_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('completed', false, 'error', 'Not authenticated');
  END IF;

  SELECT workspace_id INTO v_workspace_id
  FROM workspace_membership
  WHERE user_id = v_user_id AND status = 'active'
  LIMIT 1;

  RETURN jsonb_build_object(
    'completed', v_workspace_id IS NOT NULL,
    'workspace_id', v_workspace_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_onboarding_status() TO authenticated;

-- Comments
COMMENT ON FUNCTION complete_onboarding IS 'Bootstraps workspace, user profile, patient profile, and membership for new users. Runs with SECURITY DEFINER to bypass RLS.';
COMMENT ON FUNCTION check_onboarding_status IS 'Checks if current user has completed onboarding.';
