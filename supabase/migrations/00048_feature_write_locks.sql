-- ============================================================================
-- Migration: 00048_feature_write_locks.sql
-- Description: Admin-controlled feature write-lock system
-- Fixes: AUTH-08, AUTH-09
-- ============================================================================
-- Allows admins to make specific features read-only for members.
-- Default: all features are writable. Admin explicitly locks what they want.
-- Granularity: module level (e.g., 'health') or feature level (e.g., 'prescriptions').
-- '*' as feature_key means the entire module is locked.
-- ============================================================================

-- ============================================================================
-- 1. feature_write_lock table
-- ============================================================================

CREATE TABLE feature_write_lock (
  feature_write_lock_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
  module_key TEXT NOT NULL,       -- 'health', 'budget', 'tasks', 'goals', 'calendar'
  feature_key TEXT NOT NULL DEFAULT '*', -- '*' = entire module, or specific: 'prescriptions', 'accounts', etc.
  locked_by_user_id UUID NOT NULL REFERENCES "user"(user_id) ON DELETE SET NULL,
  locked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,

  CONSTRAINT uq_feature_write_lock UNIQUE (workspace_id, patient_id, module_key, feature_key)
);

CREATE INDEX idx_feature_write_lock_patient ON feature_write_lock(patient_id, module_key);
CREATE INDEX idx_feature_write_lock_workspace ON feature_write_lock(workspace_id);

COMMENT ON TABLE feature_write_lock IS
  'Admin-controlled write locks. When a row exists, members cannot INSERT/UPDATE/DELETE '
  'on the corresponding module/feature. Admins always retain write access.';

-- ============================================================================
-- 2. RLS on feature_write_lock (admin-only management, all members can read)
-- ============================================================================

ALTER TABLE feature_write_lock ENABLE ROW LEVEL SECURITY;

-- Any workspace member can see which features are locked (for UI display)
CREATE POLICY feature_write_lock_select ON feature_write_lock
  FOR SELECT TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Only admins can create/modify/delete locks
CREATE POLICY feature_write_lock_insert ON feature_write_lock
  FOR INSERT TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND role_key = 'admin' AND status = 'active'
    )
  );

CREATE POLICY feature_write_lock_update ON feature_write_lock
  FOR UPDATE TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND role_key = 'admin' AND status = 'active'
    )
  );

CREATE POLICY feature_write_lock_delete ON feature_write_lock
  FOR DELETE TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND role_key = 'admin' AND status = 'active'
    )
  );

-- ============================================================================
-- 3. is_feature_writable() helper function
-- ============================================================================

CREATE OR REPLACE FUNCTION is_feature_writable(
  p_patient_id UUID,
  p_module_key TEXT,
  p_feature_key TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  -- Admins always have write access
  IF is_admin() THEN
    RETURN TRUE;
  END IF;

  -- Check for module-level lock (feature_key = '*')
  IF EXISTS (
    SELECT 1 FROM feature_write_lock
    WHERE patient_id = p_patient_id
      AND module_key = p_module_key
      AND feature_key = '*'
  ) THEN
    RETURN FALSE;
  END IF;

  -- Check for feature-specific lock
  IF p_feature_key IS NOT NULL AND EXISTS (
    SELECT 1 FROM feature_write_lock
    WHERE patient_id = p_patient_id
      AND module_key = p_module_key
      AND feature_key = p_feature_key
  ) THEN
    RETURN FALSE;
  END IF;

  -- No lock found — writable
  RETURN TRUE;
END;
$$;

-- ============================================================================
-- 4. RESTRICTIVE policies on health module tables
-- ============================================================================

-- prescription (has patient_id, module='health', feature='prescriptions')
CREATE POLICY prescription_write_lock_ins ON prescription
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (is_feature_writable(patient_id, 'health', 'prescriptions'));

CREATE POLICY prescription_write_lock_upd ON prescription
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (is_feature_writable(patient_id, 'health', 'prescriptions'));

CREATE POLICY prescription_write_lock_del ON prescription
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (is_feature_writable(patient_id, 'health', 'prescriptions'));

-- intake_event: INSERT always writable (self-logging), UPDATE/DELETE get write-lock
CREATE POLICY intake_write_lock_upd ON intake_event
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (is_feature_writable(patient_id, 'health', 'intake'));

CREATE POLICY intake_write_lock_del ON intake_event
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (is_feature_writable(patient_id, 'health', 'intake'));

-- inventory (no patient_id; resolve via prescription FK)
CREATE POLICY inventory_write_lock_ins ON inventory
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (
    is_feature_writable(
      (SELECT patient_id FROM prescription WHERE prescription_id = inventory.prescription_id),
      'health', 'inventory'
    )
  );

CREATE POLICY inventory_write_lock_upd ON inventory
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (
    is_feature_writable(
      (SELECT patient_id FROM prescription WHERE prescription_id = inventory.prescription_id),
      'health', 'inventory'
    )
  );

CREATE POLICY inventory_write_lock_del ON inventory
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (
    is_feature_writable(
      (SELECT patient_id FROM prescription WHERE prescription_id = inventory.prescription_id),
      'health', 'inventory'
    )
  );

-- ============================================================================
-- 5. RESTRICTIVE policies on budget module tables
-- ============================================================================

-- budget_account
CREATE POLICY budget_account_write_lock_ins ON budget_account
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (is_feature_writable(patient_id, 'budget', 'accounts'));

CREATE POLICY budget_account_write_lock_upd ON budget_account
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (is_feature_writable(patient_id, 'budget', 'accounts'));

CREATE POLICY budget_account_write_lock_del ON budget_account
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (is_feature_writable(patient_id, 'budget', 'accounts'));

-- budget_category
CREATE POLICY budget_category_write_lock_ins ON budget_category
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (is_feature_writable(patient_id, 'budget', 'categories'));

CREATE POLICY budget_category_write_lock_upd ON budget_category
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (is_feature_writable(patient_id, 'budget', 'categories'));

CREATE POLICY budget_category_write_lock_del ON budget_category
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (is_feature_writable(patient_id, 'budget', 'categories'));

-- budget_plan_item
CREATE POLICY budget_plan_item_write_lock_ins ON budget_plan_item
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (is_feature_writable(patient_id, 'budget', 'plan_items'));

CREATE POLICY budget_plan_item_write_lock_upd ON budget_plan_item
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (is_feature_writable(patient_id, 'budget', 'plan_items'));

CREATE POLICY budget_plan_item_write_lock_del ON budget_plan_item
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (is_feature_writable(patient_id, 'budget', 'plan_items'));

-- budget_transaction: INSERT always writable (members log expenses), UPDATE/DELETE get write-lock
CREATE POLICY budget_txn_write_lock_upd ON budget_transaction
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (is_feature_writable(patient_id, 'budget', 'transactions'));

CREATE POLICY budget_txn_write_lock_del ON budget_transaction
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (is_feature_writable(patient_id, 'budget', 'transactions'));

-- ============================================================================
-- 6. Admin RPCs for managing write locks
-- ============================================================================

-- Lock a feature (admin only)
CREATE OR REPLACE FUNCTION lock_feature(
  p_patient_id UUID,
  p_module_key TEXT,
  p_feature_key TEXT DEFAULT '*',
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
  v_lock_id UUID;
BEGIN
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;

  SELECT workspace_id INTO v_workspace_id
  FROM patient_profile
  WHERE patient_id = p_patient_id;

  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Patient not found');
  END IF;

  INSERT INTO feature_write_lock (
    workspace_id, patient_id, module_key, feature_key, locked_by_user_id, notes
  ) VALUES (
    v_workspace_id, p_patient_id, p_module_key, p_feature_key, auth.uid(), p_notes
  )
  ON CONFLICT (workspace_id, patient_id, module_key, feature_key) DO UPDATE
    SET locked_by_user_id = auth.uid(),
        locked_at = now(),
        notes = COALESCE(p_notes, feature_write_lock.notes)
  RETURNING feature_write_lock_id INTO v_lock_id;

  RETURN jsonb_build_object('success', true, 'feature_write_lock_id', v_lock_id);
END;
$$;

-- Unlock a feature (admin only)
CREATE OR REPLACE FUNCTION unlock_feature(
  p_patient_id UUID,
  p_module_key TEXT,
  p_feature_key TEXT DEFAULT '*'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;

  DELETE FROM feature_write_lock
  WHERE patient_id = p_patient_id
    AND module_key = p_module_key
    AND feature_key = p_feature_key;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lock not found');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Get all feature locks for a patient (admin only)
CREATE OR REPLACE FUNCTION get_feature_locks(p_patient_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id UUID;
  v_locks JSONB;
BEGIN
  v_patient_id := COALESCE(p_patient_id, get_effective_patient_id());

  IF v_patient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active patient');
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'feature_write_lock_id', fwl.feature_write_lock_id,
      'module_key', fwl.module_key,
      'feature_key', fwl.feature_key,
      'locked_by_user_id', fwl.locked_by_user_id,
      'locked_at', fwl.locked_at,
      'notes', fwl.notes
    ) ORDER BY fwl.module_key, fwl.feature_key
  ), '[]'::jsonb)
  INTO v_locks
  FROM feature_write_lock fwl
  WHERE fwl.patient_id = v_patient_id;

  RETURN jsonb_build_object('success', true, 'locks', v_locks);
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION is_feature_writable(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION lock_feature(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION unlock_feature(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_feature_locks(UUID) TO authenticated;
