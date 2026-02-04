-- ============================================================================
-- Migration: 00040_admin_impersonation.sql
-- Description: Admin impersonation support for managing patient data
-- ============================================================================

-- Admin Impersonation Session table
-- Tracks when an admin is acting on behalf of a patient
CREATE TABLE admin_impersonation_session (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  admin_user_id UUID NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
  target_patient_id UUID NOT NULL REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  reason TEXT,

  -- Ensure admin can only have one active impersonation at a time
  CONSTRAINT uq_active_impersonation UNIQUE (admin_user_id, ended_at)
);

-- Indexes
CREATE INDEX idx_admin_impersonation_admin_user_id ON admin_impersonation_session(admin_user_id);
CREATE INDEX idx_admin_impersonation_target_patient_id ON admin_impersonation_session(target_patient_id);
CREATE INDEX idx_admin_impersonation_active ON admin_impersonation_session(admin_user_id) WHERE ended_at IS NULL;

-- RLS
ALTER TABLE admin_impersonation_session ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view own impersonation sessions" ON admin_impersonation_session
  FOR SELECT TO authenticated
  USING (admin_user_id = auth.uid());

CREATE POLICY "Admins can manage own impersonation sessions" ON admin_impersonation_session
  FOR ALL TO authenticated
  USING (admin_user_id = auth.uid());

-- Function to get the effective patient ID (handles impersonation)
-- Returns the impersonated patient if admin is impersonating, otherwise the logged-in user's patient profile
CREATE OR REPLACE FUNCTION get_effective_patient_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_impersonated_patient_id UUID;
  v_own_patient_id UUID;
BEGIN
  -- Check for active impersonation session
  SELECT target_patient_id INTO v_impersonated_patient_id
  FROM admin_impersonation_session
  WHERE admin_user_id = auth.uid()
    AND ended_at IS NULL
  ORDER BY started_at DESC
  LIMIT 1;

  IF v_impersonated_patient_id IS NOT NULL THEN
    RETURN v_impersonated_patient_id;
  END IF;

  -- No impersonation, return own patient profile
  SELECT patient_id INTO v_own_patient_id
  FROM patient_profile pp
  JOIN workspace_membership wm ON wm.workspace_id = pp.workspace_id AND wm.user_id = pp.patient_id
  WHERE wm.user_id = auth.uid() AND wm.status = 'active'
  LIMIT 1;

  RETURN v_own_patient_id;
END;
$$;

-- Function to get effective workspace ID
CREATE OR REPLACE FUNCTION get_effective_workspace_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_impersonated_workspace_id UUID;
  v_own_workspace_id UUID;
BEGIN
  -- Check for active impersonation session
  SELECT workspace_id INTO v_impersonated_workspace_id
  FROM admin_impersonation_session
  WHERE admin_user_id = auth.uid()
    AND ended_at IS NULL
  ORDER BY started_at DESC
  LIMIT 1;

  IF v_impersonated_workspace_id IS NOT NULL THEN
    RETURN v_impersonated_workspace_id;
  END IF;

  -- No impersonation, return own workspace
  SELECT workspace_id INTO v_own_workspace_id
  FROM workspace_membership
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1;

  RETURN v_own_workspace_id;
END;
$$;

-- Function to start impersonation
CREATE OR REPLACE FUNCTION start_impersonation(p_target_patient_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_workspace_id UUID;
  v_target_workspace_id UUID;
  v_session_id UUID;
BEGIN
  -- Verify caller is an admin
  SELECT workspace_id INTO v_admin_workspace_id
  FROM workspace_membership
  WHERE user_id = auth.uid() AND role_key = 'admin' AND status = 'active'
  LIMIT 1;

  IF v_admin_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;

  -- Verify target patient exists and is in the same workspace
  SELECT workspace_id INTO v_target_workspace_id
  FROM patient_profile
  WHERE patient_id = p_target_patient_id;

  IF v_target_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Patient not found');
  END IF;

  IF v_target_workspace_id != v_admin_workspace_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Patient not in your workspace');
  END IF;

  -- End any existing impersonation session
  UPDATE admin_impersonation_session
  SET ended_at = now()
  WHERE admin_user_id = auth.uid() AND ended_at IS NULL;

  -- Start new impersonation session
  INSERT INTO admin_impersonation_session (workspace_id, admin_user_id, target_patient_id, reason)
  VALUES (v_admin_workspace_id, auth.uid(), p_target_patient_id, p_reason)
  RETURNING session_id INTO v_session_id;

  RETURN jsonb_build_object(
    'success', true,
    'session_id', v_session_id,
    'target_patient_id', p_target_patient_id
  );
END;
$$;

-- Function to stop impersonation
CREATE OR REPLACE FUNCTION stop_impersonation()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ended_count INTEGER;
BEGIN
  UPDATE admin_impersonation_session
  SET ended_at = now()
  WHERE admin_user_id = auth.uid() AND ended_at IS NULL;

  GET DIAGNOSTICS v_ended_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'sessions_ended', v_ended_count
  );
END;
$$;

-- Function to get current impersonation status
CREATE OR REPLACE FUNCTION get_impersonation_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session RECORD;
  v_patient_name TEXT;
BEGIN
  SELECT ais.*, pp.full_name
  INTO v_session
  FROM admin_impersonation_session ais
  JOIN patient_profile pp ON pp.patient_id = ais.target_patient_id
  WHERE ais.admin_user_id = auth.uid() AND ais.ended_at IS NULL
  LIMIT 1;

  IF v_session IS NULL THEN
    RETURN jsonb_build_object(
      'is_impersonating', false
    );
  END IF;

  RETURN jsonb_build_object(
    'is_impersonating', true,
    'session_id', v_session.session_id,
    'target_patient_id', v_session.target_patient_id,
    'target_patient_name', v_session.full_name,
    'started_at', v_session.started_at
  );
END;
$$;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_membership
    WHERE user_id = auth.uid() AND role_key = 'admin' AND status = 'active'
  );
END;
$$;

-- Function to get available patients for impersonation (for admin UI)
CREATE OR REPLACE FUNCTION get_patients_for_impersonation()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
  v_patients JSONB;
BEGIN
  -- Verify caller is an admin and get workspace
  SELECT workspace_id INTO v_workspace_id
  FROM workspace_membership
  WHERE user_id = auth.uid() AND role_key = 'admin' AND status = 'active'
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'patient_id', pp.patient_id,
      'full_name', pp.full_name,
      'email', u.email
    ) ORDER BY pp.full_name
  ), '[]'::jsonb)
  INTO v_patients
  FROM patient_profile pp
  JOIN "user" u ON u.user_id = pp.patient_id
  WHERE pp.workspace_id = v_workspace_id;

  RETURN jsonb_build_object('success', true, 'patients', v_patients);
END;
$$;

-- ============================================================================
-- SEED: Make pacific.joseph@gmail.com an admin
-- ============================================================================

DO $$
DECLARE
  v_user_id UUID;
  v_workspace_id UUID;
BEGIN
  -- Find the user by email
  SELECT u.user_id, u.workspace_id
  INTO v_user_id, v_workspace_id
  FROM "user" u
  JOIN auth.users au ON au.id = u.user_id
  WHERE au.email = 'pacific.joseph@gmail.com'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User pacific.joseph@gmail.com not found. Will be made admin on first login.';
    RETURN;
  END IF;

  -- Update or insert workspace membership as admin
  INSERT INTO workspace_membership (workspace_id, user_id, role_key, status)
  VALUES (v_workspace_id, v_user_id, 'admin', 'active')
  ON CONFLICT (workspace_id, user_id)
  DO UPDATE SET role_key = 'admin', status = 'active';

  RAISE NOTICE 'User pacific.joseph@gmail.com has been made admin in workspace %', v_workspace_id;
END $$;

-- Comment
COMMENT ON TABLE admin_impersonation_session IS 'Tracks admin impersonation sessions for audit and context switching.';
COMMENT ON FUNCTION get_effective_patient_id IS 'Returns the patient ID being acted upon, considering impersonation.';
COMMENT ON FUNCTION start_impersonation IS 'Admin-only: Start impersonating a patient to manage their data.';
COMMENT ON FUNCTION stop_impersonation IS 'End any active impersonation session.';
