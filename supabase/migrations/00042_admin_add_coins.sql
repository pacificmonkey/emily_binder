-- ============================================================================
-- Migration: 00042_admin_add_coins.sql
-- Description: Admin wrapper for add_coins that uses effective patient
-- ============================================================================

-- Admin wrapper for adding coins to the effective (possibly impersonated) patient
CREATE OR REPLACE FUNCTION add_coins(
  p_delta INTEGER,
  p_reason TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id UUID;
  v_workspace_id UUID;
  v_entry_id UUID;
  v_new_balance INTEGER;
BEGIN
  -- Get effective patient (respects impersonation)
  v_patient_id := get_effective_patient_id();
  v_workspace_id := get_effective_workspace_id();

  IF v_patient_id IS NULL OR v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active patient profile');
  END IF;

  -- Create ledger entry
  INSERT INTO coin_ledger_entry (
    workspace_id, patient_id, delta, reason, notes, created_by_user_id
  )
  VALUES (
    v_workspace_id, v_patient_id, p_delta, p_reason, p_notes, auth.uid()
  )
  RETURNING coin_ledger_entry_id INTO v_entry_id;

  -- Get updated balance
  SELECT balance INTO v_new_balance
  FROM coin_wallet
  WHERE patient_id = v_patient_id;

  RETURN jsonb_build_object(
    'success', true,
    'coin_ledger_entry_id', v_entry_id,
    'new_balance', COALESCE(v_new_balance, 0)
  );
END;
$$;
