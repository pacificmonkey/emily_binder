-- Migration: 00072_impersonation_hardening.sql
-- Description: Harden impersonation: audit trigger, required reason, admin check on stop

-- =============================================================================
-- 1. Add audit trigger on admin_impersonation_session
-- =============================================================================
SELECT create_audit_trigger('admin_impersonation_session');

-- =============================================================================
-- 2. Update start_impersonation: make reason required (non-null, non-empty)
-- =============================================================================
CREATE OR REPLACE FUNCTION start_impersonation(
  p_target_patient_id UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_user_id UUID;
  v_admin_workspace_id UUID;
  v_target_workspace_id UUID;
  v_session_id UUID;
BEGIN
  v_admin_user_id := auth.uid();

  IF v_admin_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Verify admin role
  SELECT wm.workspace_id INTO v_admin_workspace_id
  FROM workspace_membership wm
  WHERE wm.user_id = v_admin_user_id
    AND wm.role_key = 'admin'
    AND wm.status = 'active'
  LIMIT 1;

  IF v_admin_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;

  -- Require a non-empty reason
  IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'A reason is required for impersonation');
  END IF;

  -- Get target patient's workspace
  SELECT pp.workspace_id INTO v_target_workspace_id
  FROM patient_profile pp
  WHERE pp.patient_id = p_target_patient_id;

  IF v_target_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target patient not found');
  END IF;

  -- Verify same workspace
  IF v_target_workspace_id != v_admin_workspace_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot impersonate across workspaces');
  END IF;

  -- End any existing sessions
  UPDATE admin_impersonation_session
  SET ended_at = now()
  WHERE admin_user_id = v_admin_user_id AND ended_at IS NULL;

  -- Create new session
  v_session_id := gen_random_uuid();

  INSERT INTO admin_impersonation_session (
    session_id, admin_user_id, target_patient_id, reason, started_at
  ) VALUES (
    v_session_id, v_admin_user_id, p_target_patient_id, TRIM(p_reason), now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'session_id', v_session_id,
    'target_patient_id', p_target_patient_id
  );
END;
$$;

-- =============================================================================
-- 3. Update stop_impersonation: add admin role verification
-- =============================================================================
CREATE OR REPLACE FUNCTION stop_impersonation()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_ended_count INTEGER;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Verify the user is (or was) an admin — they may have active sessions
  IF NOT EXISTS (
    SELECT 1 FROM workspace_membership wm
    WHERE wm.user_id = v_user_id
      AND wm.role_key = 'admin'
      AND wm.status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;

  UPDATE admin_impersonation_session
  SET ended_at = now()
  WHERE admin_user_id = v_user_id AND ended_at IS NULL;

  GET DIAGNOSTICS v_ended_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'sessions_ended', v_ended_count
  );
END;
$$;
