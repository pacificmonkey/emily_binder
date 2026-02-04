-- Migration: 00019_create_default_level_system.sql
-- Description: Create default level curve and level systems for existing patients
-- This fixes the issue where recompute_user_progress returns early due to missing level_system
-- Schema Version: 1.3.0

-- =============================================================================
-- CREATE DEFAULT LEVEL CURVE (if not exists)
-- =============================================================================

-- Insert a default level curve with 10 levels
INSERT INTO level_curve (curve_id, name, mode, created_at)
SELECT
  '00000000-0000-0000-0000-000000000001'::UUID,
  'Default Level Curve',
  'explicit_table',
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM level_curve WHERE curve_id = '00000000-0000-0000-0000-000000000001'::UUID
);

-- Insert level curve steps (100 points per level)
INSERT INTO level_curve_step (curve_id, level, required_cumulative_points)
SELECT
  '00000000-0000-0000-0000-000000000001'::UUID,
  level,
  (level - 1) * 100  -- Level 1 = 0 pts, Level 2 = 100 pts, Level 3 = 200 pts, etc.
FROM generate_series(1, 10) AS level
ON CONFLICT (curve_id, level) DO NOTHING;

-- =============================================================================
-- CREATE LEVEL SYSTEMS FOR EXISTING PATIENTS
-- =============================================================================

-- Create level_system for any patient_profile that doesn't have one
INSERT INTO level_system (
  workspace_id,
  patient_id,
  points_currency_key,
  curve_id,
  max_level,
  created_at,
  updated_at
)
SELECT
  pp.workspace_id,
  pp.patient_id,
  'points',
  '00000000-0000-0000-0000-000000000001'::UUID,
  10,
  now(),
  now()
FROM patient_profile pp
WHERE NOT EXISTS (
  SELECT 1 FROM level_system ls WHERE ls.patient_id = pp.patient_id
)
ON CONFLICT (patient_id) DO NOTHING;

-- =============================================================================
-- RECOMPUTE USER PROGRESS FROM LEDGER
-- =============================================================================

-- Recompute progress for all patients
DO $$
DECLARE
  v_patient RECORD;
BEGIN
  FOR v_patient IN SELECT patient_id FROM patient_profile
  LOOP
    PERFORM recompute_user_progress(v_patient.patient_id);
  END LOOP;
END;
$$;

-- =============================================================================
-- UPDATE ONBOARDING TO CREATE LEVEL SYSTEM
-- =============================================================================

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
  INSERT INTO user_progress (workspace_id, patient_id, total_points, current_level, points_into_level, points_to_next_level, last_recomputed_at)
  VALUES (v_workspace_id, v_user_id, 0, 1, 0, 100, now())
  ON CONFLICT (patient_id) DO NOTHING;

  -- 6. Create level system for the patient (NEW - required for recompute_user_progress to work)
  INSERT INTO level_system (
    workspace_id,
    patient_id,
    points_currency_key,
    curve_id,
    max_level,
    created_at,
    updated_at
  ) VALUES (
    v_workspace_id,
    v_user_id,
    'points',
    '00000000-0000-0000-0000-000000000001'::UUID,  -- Default level curve
    10,
    now(),
    now()
  )
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

