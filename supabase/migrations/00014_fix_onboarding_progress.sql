-- Migration: 00014_fix_onboarding_progress.sql
-- Description: Fix onboarding function to use correct user_progress columns
-- Schema Version: 1.3.0

CREATE OR REPLACE FUNCTION complete_onboarding(
  p_display_name TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_workspace_id UUID;
  v_name TEXT;
BEGIN
  -- Get the current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if user already has a workspace membership
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

  -- Generate workspace ID
  v_workspace_id := gen_random_uuid();

  -- Temporarily disable audit triggers for bootstrap
  PERFORM set_config('app.skip_audit', 'true', true);

  -- 1. Create workspace
  INSERT INTO workspace (workspace_id, display_name, timezone_default, created_at, updated_at)
  VALUES (
    v_workspace_id,
    v_name || '''s Workspace',
    'America/Los_Angeles',
    now(),
    now()
  );

  -- 2. Create user profile (requires workspace_id)
  INSERT INTO "user" (user_id, workspace_id, display_name, status, timezone, created_at, updated_at)
  VALUES (v_user_id, v_workspace_id, v_name, 'active', 'America/Los_Angeles', now(), now())
  ON CONFLICT (user_id) DO UPDATE SET
    workspace_id = EXCLUDED.workspace_id,
    display_name = EXCLUDED.display_name,
    updated_at = now();

  -- 3. Create patient profile (patient_id references user_id)
  INSERT INTO patient_profile (patient_id, workspace_id, full_name, timezone_default)
  VALUES (v_user_id, v_workspace_id, v_name, 'America/Los_Angeles')
  ON CONFLICT (patient_id) DO NOTHING;

  -- 4. Create workspace membership
  INSERT INTO workspace_membership (workspace_id, user_id, role_key, status, joined_at)
  VALUES (v_workspace_id, v_user_id, 'admin', 'active', now())
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  -- 5. Initialize user progress (uses patient_id, not user_id)
  -- Columns: workspace_id, patient_id, total_points, current_level, points_into_level, points_to_next_level
  INSERT INTO user_progress (workspace_id, patient_id, total_points, current_level, points_into_level, points_to_next_level, last_recomputed_at)
  VALUES (v_workspace_id, v_user_id, 0, 1, 0, 100, now())
  ON CONFLICT (patient_id) DO NOTHING;

  -- Re-enable audit
  PERFORM set_config('app.skip_audit', 'false', true);

  RETURN jsonb_build_object(
    'success', true,
    'workspace_id', v_workspace_id,
    'patient_id', v_user_id,
    'already_onboarded', false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
