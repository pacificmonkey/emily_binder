-- ============================================================================
-- Migration: 00044_admin_feature_audit.sql
-- Description: Admin functions for feature toggles and audit log viewing
-- ============================================================================

-- ============================================================================
-- 1. Feature Module Management Functions
-- ============================================================================

-- Get all feature modules with their current settings for effective patient
CREATE OR REPLACE FUNCTION get_feature_modules()
RETURNS TABLE (
  feature_module_id UUID,
  key TEXT,
  description TEXT,
  default_enabled BOOLEAN,
  depends_on_module_keys TEXT[],
  is_enabled BOOLEAN,
  setting_id UUID,
  set_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id UUID;
BEGIN
  v_patient_id := get_effective_patient_id();

  IF v_patient_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    fm.feature_module_id,
    fm.key::TEXT,
    fm.description,
    fm.default_enabled,
    fm.depends_on_module_keys,
    COALESCE(fms.enabled, fm.default_enabled) AS is_enabled,
    fms.feature_module_setting_id AS setting_id,
    fms.set_at
  FROM feature_module fm
  LEFT JOIN feature_module_setting fms
    ON fm.feature_module_id = fms.feature_module_id
    AND fms.patient_id = v_patient_id
  ORDER BY fm.key;
END;
$$;

-- Toggle a feature module
CREATE OR REPLACE FUNCTION toggle_feature_module(
  p_feature_key TEXT,
  p_enabled BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id UUID;
  v_workspace_id UUID;
  v_feature_module_id UUID;
  v_setting_id UUID;
BEGIN
  v_patient_id := get_effective_patient_id();
  v_workspace_id := get_effective_workspace_id();

  IF v_patient_id IS NULL OR v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active patient');
  END IF;

  -- Check admin permission
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin permission required');
  END IF;

  -- Get the feature module
  SELECT fm.feature_module_id INTO v_feature_module_id
  FROM feature_module fm
  WHERE fm.key = p_feature_key::feature_module_key;

  IF v_feature_module_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Feature module not found');
  END IF;

  -- Check dependencies when enabling
  IF p_enabled AND NOT check_feature_dependencies(v_patient_id, p_feature_key::feature_module_key) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Required dependencies are not enabled');
  END IF;

  -- Upsert the setting
  INSERT INTO feature_module_setting (
    workspace_id,
    patient_id,
    feature_module_id,
    enabled,
    set_by_user_id
  )
  VALUES (
    v_workspace_id,
    v_patient_id,
    v_feature_module_id,
    p_enabled,
    auth.uid()
  )
  ON CONFLICT (patient_id, feature_module_id)
  DO UPDATE SET
    enabled = EXCLUDED.enabled,
    set_by_user_id = EXCLUDED.set_by_user_id,
    set_at = now()
  RETURNING feature_module_setting_id INTO v_setting_id;

  RETURN jsonb_build_object(
    'success', true,
    'setting_id', v_setting_id,
    'enabled', p_enabled
  );
END;
$$;

-- ============================================================================
-- 2. Audit Log Viewing Functions
-- ============================================================================

-- Get audit log entries (admin only)
CREATE OR REPLACE FUNCTION get_audit_log(
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0,
  p_object_type TEXT DEFAULT NULL,
  p_action TEXT DEFAULT NULL
)
RETURNS TABLE (
  audit_event_id UUID,
  object_type TEXT,
  object_id UUID,
  action TEXT,
  actor_user_id UUID,
  actor_email TEXT,
  field_changes JSONB,
  occurred_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
BEGIN
  v_workspace_id := get_effective_workspace_id();

  IF v_workspace_id IS NULL THEN
    RETURN;
  END IF;

  -- Check admin permission
  IF NOT is_admin() THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    ae.audit_event_id,
    ae.object_type::TEXT,
    ae.object_id,
    ae.action::TEXT,
    ae.actor_user_id,
    u.email AS actor_email,
    ae.field_changes,
    ae.occurred_at
  FROM audit_event ae
  LEFT JOIN "user" u ON ae.actor_user_id = u.user_id
  WHERE ae.workspace_id = v_workspace_id
    AND (p_object_type IS NULL OR ae.object_type::TEXT = p_object_type)
    AND (p_action IS NULL OR ae.action::TEXT = p_action)
  ORDER BY ae.occurred_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Get audit log count
CREATE OR REPLACE FUNCTION get_audit_log_count(
  p_object_type TEXT DEFAULT NULL,
  p_action TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
  v_count INTEGER;
BEGIN
  v_workspace_id := get_effective_workspace_id();

  IF v_workspace_id IS NULL THEN
    RETURN 0;
  END IF;

  -- Check admin permission
  IF NOT is_admin() THEN
    RETURN 0;
  END IF;

  SELECT COUNT(*)::INTEGER INTO v_count
  FROM audit_event ae
  WHERE ae.workspace_id = v_workspace_id
    AND (p_object_type IS NULL OR ae.object_type::TEXT = p_object_type)
    AND (p_action IS NULL OR ae.action::TEXT = p_action);

  RETURN v_count;
END;
$$;
