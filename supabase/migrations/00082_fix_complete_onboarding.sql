-- Migration: 00082_fix_complete_onboarding.sql
-- Description: Fix complete_onboarding() function which was broken by migration
-- 00079_restrict_self_signup.sql (originally numbered 00071). That migration used wrong column names for 5 tables
-- (12 mismatches total). This migration replaces the function with correct column names
-- matching the actual schema defined in 00002_core_identity.sql and 00005_gamification_base.sql.
--
-- Mismatches fixed:
--   workspace:            name -> display_name, timezone -> timezone_default, removed created_at/updated_at
--   user:                 removed email (doesn't exist), added workspace_id, timezone
--   patient_profile:      display_name -> full_name, removed created_at/updated_at
--   workspace_membership: removed patient_id, created_at -> joined_at
--   user_progress:        user_id -> patient_id, removed points_system_key, removed next_level_points

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

  -- Check signup allowlist
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
  -- Correct columns: display_name (not name), timezone_default (not timezone)
  -- No created_at/updated_at columns exist on this table
  INSERT INTO workspace (workspace_id, display_name, timezone_default)
  VALUES (v_workspace_id, v_name || '''s Workspace', 'America/Los_Angeles');

  -- Create user profile
  -- Correct columns: workspace_id, display_name, status, timezone
  -- No email column exists on user table (email is only in auth.users)
  INSERT INTO "user" (user_id, workspace_id, display_name, status, timezone)
  VALUES (v_user_id, v_workspace_id, v_name, 'active', 'America/Los_Angeles')
  ON CONFLICT (user_id) DO UPDATE SET
    workspace_id = EXCLUDED.workspace_id,
    display_name = EXCLUDED.display_name;

  -- Create patient profile
  -- Correct column: full_name (not display_name)
  -- No created_at/updated_at columns exist on this table
  INSERT INTO patient_profile (patient_id, workspace_id, full_name)
  VALUES (v_patient_id, v_workspace_id, v_name);

  -- Create workspace membership
  -- Correct: no patient_id column, use joined_at (not created_at)
  INSERT INTO workspace_membership (workspace_id, user_id, role_key, status, joined_at)
  VALUES (v_workspace_id, v_user_id, 'admin', 'active', now());

  -- Initialize user progress
  -- Correct: patient_id (not user_id), no points_system_key column,
  -- points_to_next_level (not next_level_points), points_into_level required
  INSERT INTO user_progress (workspace_id, patient_id, total_points, current_level, points_into_level, points_to_next_level, last_recomputed_at)
  VALUES (v_workspace_id, v_patient_id, 0, 1, 0, 100, now());

  RETURN jsonb_build_object(
    'success', true,
    'workspace_id', v_workspace_id,
    'patient_id', v_patient_id,
    'already_onboarded', false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
