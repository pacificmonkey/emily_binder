-- ============================================================================
-- Migration: 00045_security_hardening.sql
-- Description: Phase 1 security hardening — fixes privilege escalation,
--   impersonation bypass, TOCTOU race conditions, and workspace self-enrollment
-- Fixes: AUTH-01, AUTH-02, AUTH-03, AUTH-04, DB-02, DB-03, DB-04
-- ============================================================================

-- ============================================================================
-- AUTH-02: add_coins() must require admin role
-- Both the 3-param wrapper (00042) and the 6-param original (00035) are
-- SECURITY DEFINER with no admin check. Any authenticated user can mint coins.
-- ============================================================================

-- Fix the 3-param wrapper (admin add_coins via impersonation)
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
  -- AUTH-02: Require admin role
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;

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

-- Fix the 6-param original add_coins (used by internal functions)
CREATE OR REPLACE FUNCTION add_coins(
  p_patient_id UUID,
  p_amount INTEGER,
  p_reason TEXT,
  p_link_type TEXT DEFAULT NULL,
  p_link_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
  v_entry_id UUID;
BEGIN
  -- AUTH-02: Require admin role for direct patient coin operations
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;

  -- Get workspace
  SELECT workspace_id INTO v_workspace_id
  FROM patient_profile
  WHERE patient_id = p_patient_id;

  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Patient not found');
  END IF;

  -- Verify admin is in the same workspace
  IF NOT EXISTS (
    SELECT 1 FROM workspace_membership
    WHERE workspace_id = v_workspace_id
      AND user_id = auth.uid()
      AND role_key = 'admin'
      AND status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not admin in patient workspace');
  END IF;

  -- Insert ledger entry
  INSERT INTO coin_ledger_entry (
    workspace_id, patient_id, delta, reason, link_type, link_id, notes, created_by_user_id
  )
  VALUES (
    v_workspace_id, p_patient_id, p_amount, p_reason, p_link_type, p_link_id, p_notes, auth.uid()
  )
  RETURNING coin_ledger_entry_id INTO v_entry_id;

  RETURN jsonb_build_object('success', true, 'coin_ledger_entry_id', v_entry_id);
END;
$$;

-- ============================================================================
-- AUTH-01: Fix impersonation bypass chain
-- Problem 1: RLS INSERT policy allows any user to create impersonation sessions
-- Problem 2: get_effective_patient_id() doesn't verify caller is admin
-- ============================================================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Admins can manage own impersonation sessions" ON admin_impersonation_session;

-- Replace with separate INSERT/UPDATE/DELETE policies that require admin role
CREATE POLICY "Admins can insert impersonation sessions" ON admin_impersonation_session
  FOR INSERT TO authenticated
  WITH CHECK (
    admin_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM workspace_membership
      WHERE user_id = auth.uid()
        AND role_key = 'admin'
        AND status = 'active'
    )
  );

CREATE POLICY "Admins can update own impersonation sessions" ON admin_impersonation_session
  FOR UPDATE TO authenticated
  USING (
    admin_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM workspace_membership
      WHERE user_id = auth.uid()
        AND role_key = 'admin'
        AND status = 'active'
    )
  );

CREATE POLICY "Admins can delete own impersonation sessions" ON admin_impersonation_session
  FOR DELETE TO authenticated
  USING (
    admin_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM workspace_membership
      WHERE user_id = auth.uid()
        AND role_key = 'admin'
        AND status = 'active'
    )
  );

-- Fix get_effective_patient_id() to verify admin role before returning impersonated patient
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
    -- AUTH-01: Verify caller is actually an admin before honoring impersonation
    IF EXISTS (
      SELECT 1 FROM workspace_membership
      WHERE user_id = auth.uid()
        AND role_key = 'admin'
        AND status = 'active'
    ) THEN
      RETURN v_impersonated_patient_id;
    END IF;
    -- If not admin, fall through to return own patient_id (ignore stale session)
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

-- DB-04: Fix unique constraint for active impersonation sessions
-- PostgreSQL treats NULLs as distinct for UNIQUE, so the existing
-- UNIQUE(admin_user_id, ended_at) does NOT prevent multiple active sessions.
-- Add a partial unique index instead.
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_impersonation_one_active
  ON admin_impersonation_session (admin_user_id)
  WHERE ended_at IS NULL;

-- ============================================================================
-- AUTH-03: SECURITY DEFINER functions lack workspace boundary checks
-- update_event(), delete_event(), and log_intake() accept a UUID and operate
-- on it without verifying the caller belongs to that workspace.
-- ============================================================================

-- Fix update_event: verify caller has workspace access
CREATE OR REPLACE FUNCTION update_event(
  p_event_id UUID,
  p_title TEXT DEFAULT NULL,
  p_type event_type DEFAULT NULL,
  p_starts_at TIMESTAMPTZ DEFAULT NULL,
  p_ends_at TIMESTAMPTZ DEFAULT NULL,
  p_timezone TEXT DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_status event_status DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_event RECORD;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check event exists
  SELECT * INTO v_event FROM event WHERE event_id = p_event_id;

  IF v_event IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Event not found');
  END IF;

  -- AUTH-03: Verify caller belongs to the event's workspace
  IF NOT EXISTS (
    SELECT 1 FROM workspace_membership
    WHERE workspace_id = v_event.workspace_id
      AND user_id = v_user_id
      AND status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  -- Update the event with provided values
  UPDATE event SET
    title = COALESCE(p_title, title),
    type = COALESCE(p_type, type),
    starts_at = COALESCE(p_starts_at, starts_at),
    ends_at = COALESCE(p_ends_at, ends_at),
    timezone = COALESCE(p_timezone, timezone),
    location = COALESCE(p_location, location),
    notes = COALESCE(p_notes, notes),
    status = COALESCE(p_status, status)
  WHERE event_id = p_event_id;

  RETURN jsonb_build_object(
    'success', true,
    'event_id', p_event_id
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix delete_event: verify caller has workspace access
CREATE OR REPLACE FUNCTION delete_event(
  p_event_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_event RECORD;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check event exists
  SELECT * INTO v_event FROM event WHERE event_id = p_event_id;

  IF v_event IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Event not found');
  END IF;

  -- AUTH-03: Verify caller belongs to the event's workspace
  IF NOT EXISTS (
    SELECT 1 FROM workspace_membership
    WHERE workspace_id = v_event.workspace_id
      AND user_id = v_user_id
      AND status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  -- Delete the event
  DELETE FROM event WHERE event_id = p_event_id;

  RETURN jsonb_build_object(
    'success', true,
    'event_id', p_event_id
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix log_intake: verify caller belongs to prescription's workspace
CREATE OR REPLACE FUNCTION log_intake(
  p_prescription_id UUID,
  p_status intake_status,
  p_taken_time TIMESTAMPTZ DEFAULT NULL,
  p_scheduled_time TIMESTAMPTZ DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_workspace_id UUID;
  v_patient_id UUID;
  v_prescription RECORD;
  v_intake_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get prescription details
  SELECT * INTO v_prescription
  FROM prescription
  WHERE prescription_id = p_prescription_id;

  IF v_prescription IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Prescription not found');
  END IF;

  -- AUTH-03: Verify caller belongs to the prescription's workspace
  IF NOT EXISTS (
    SELECT 1 FROM workspace_membership
    WHERE workspace_id = v_prescription.workspace_id
      AND user_id = v_user_id
      AND status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  v_workspace_id := v_prescription.workspace_id;
  v_patient_id := v_prescription.patient_id;

  -- Create intake event
  INSERT INTO intake_event (
    workspace_id,
    patient_id,
    prescription_id,
    scheduled_time,
    taken_time,
    status,
    dose_quantity,
    dose_unit,
    reason,
    notes,
    recorded_by
  ) VALUES (
    v_workspace_id,
    v_patient_id,
    p_prescription_id,
    p_scheduled_time,
    COALESCE(p_taken_time, now()),
    p_status,
    v_prescription.dose_quantity,
    v_prescription.dose_unit,
    p_reason,
    p_notes,
    'user'
  )
  RETURNING intake_event_id INTO v_intake_id;

  -- Update inventory if taken
  IF p_status = 'taken' THEN
    UPDATE inventory
    SET
      current_on_hand = GREATEST(0, current_on_hand - v_prescription.dose_quantity),
      as_of = now(),
      source = 'computed',
      updated_at = now()
    WHERE prescription_id = p_prescription_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'intake_event_id', v_intake_id
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also fix create_event to use get_effective_patient_id() instead of
-- picking an arbitrary patient (DB-13)
CREATE OR REPLACE FUNCTION create_event(
  p_title TEXT,
  p_type event_type DEFAULT 'other',
  p_starts_at TIMESTAMPTZ DEFAULT NULL,
  p_ends_at TIMESTAMPTZ DEFAULT NULL,
  p_timezone TEXT DEFAULT 'America/Los_Angeles',
  p_location TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_workspace_id UUID;
  v_patient_id UUID;
  v_event_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Use impersonation-aware helpers (fixes DB-13: arbitrary patient selection)
  v_workspace_id := get_effective_workspace_id();
  v_patient_id := get_effective_patient_id();

  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace membership');
  END IF;

  IF v_patient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No patient profile found');
  END IF;

  -- Create the event
  INSERT INTO event (
    workspace_id,
    patient_id,
    type,
    title,
    starts_at,
    ends_at,
    timezone,
    location,
    notes,
    status,
    created_by_user_id
  ) VALUES (
    v_workspace_id,
    v_patient_id,
    p_type,
    p_title,
    COALESCE(p_starts_at, now()),
    p_ends_at,
    p_timezone,
    p_location,
    p_notes,
    'scheduled',
    v_user_id
  )
  RETURNING event_id INTO v_event_id;

  RETURN jsonb_build_object(
    'success', true,
    'event_id', v_event_id
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- AUTH-04: Fix workspace self-enrollment
-- The INSERT policy on workspace_membership allows user_id = auth.uid(),
-- letting any user add themselves to any workspace with any role.
-- ============================================================================

DROP POLICY IF EXISTS workspace_membership_insert ON workspace_membership;

-- Only admins can add members. Initial membership is created by
-- complete_onboarding() which is SECURITY DEFINER and bypasses RLS.
CREATE POLICY workspace_membership_insert ON workspace_membership
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_membership wm
      WHERE wm.workspace_id = workspace_membership.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role_key = 'admin'
        AND wm.status = 'active'
    )
  );

-- ============================================================================
-- DB-02/DB-03: Fix TOCTOU race condition in spend_coins()
-- Use SELECT ... FOR UPDATE to lock the wallet row during balance check.
-- ============================================================================

CREATE OR REPLACE FUNCTION spend_coins(
  p_patient_id UUID,
  p_amount INTEGER,
  p_reason TEXT,
  p_link_type TEXT DEFAULT NULL,
  p_link_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
  v_current_balance INTEGER;
  v_entry_id UUID;
BEGIN
  -- DB-02: Lock the wallet row to prevent concurrent reads
  SELECT cw.workspace_id, cw.balance INTO v_workspace_id, v_current_balance
  FROM coin_wallet cw
  WHERE cw.patient_id = p_patient_id
  FOR UPDATE;

  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
  END IF;

  IF v_current_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient coins', 'balance', v_current_balance);
  END IF;

  -- Insert negative ledger entry
  INSERT INTO coin_ledger_entry (
    workspace_id, patient_id, delta, reason, link_type, link_id, notes, created_by_user_id
  )
  VALUES (
    v_workspace_id, p_patient_id, -p_amount, p_reason, p_link_type, p_link_id, p_notes, auth.uid()
  )
  RETURNING coin_ledger_entry_id INTO v_entry_id;

  RETURN jsonb_build_object('success', true, 'coin_ledger_entry_id', v_entry_id);
END;
$$;

-- Also fix purchase_store_item to lock wallet before checking balance
CREATE OR REPLACE FUNCTION purchase_store_item(
  p_store_item_id UUID,
  p_quantity INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
  v_patient_id UUID;
  v_item RECORD;
  v_balance INTEGER;
  v_total_cost INTEGER;
  v_previous_purchases INTEGER;
  v_monthly_purchases INTEGER;
  v_purchase_id UUID;
BEGIN
  v_workspace_id := get_effective_workspace_id();
  v_patient_id := get_effective_patient_id();

  IF v_workspace_id IS NULL OR v_patient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active patient profile');
  END IF;

  -- Get store item
  SELECT * INTO v_item
  FROM store_item
  WHERE store_item_id = p_store_item_id
    AND patient_id = v_patient_id
    AND enabled = true;

  IF v_item IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item not found or not available');
  END IF;

  -- Calculate total cost
  v_total_cost := v_item.coin_cost * p_quantity;

  -- DB-03: Lock wallet row to prevent concurrent purchases
  SELECT COALESCE(balance, 0) INTO v_balance
  FROM coin_wallet
  WHERE patient_id = v_patient_id
  FOR UPDATE;

  IF v_balance IS NULL THEN v_balance := 0; END IF;

  IF v_balance < v_total_cost THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient coins',
      'balance', v_balance,
      'cost', v_total_cost
    );
  END IF;

  -- Check purchase limits
  IF v_item.max_purchases_total IS NOT NULL THEN
    SELECT COALESCE(SUM(quantity), 0) INTO v_previous_purchases
    FROM purchase
    WHERE patient_id = v_patient_id
      AND store_item_id = p_store_item_id
      AND status = 'completed';

    IF v_previous_purchases + p_quantity > v_item.max_purchases_total THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Purchase limit reached',
        'limit', v_item.max_purchases_total,
        'purchased', v_previous_purchases
      );
    END IF;
  END IF;

  IF v_item.max_purchases_per_month IS NOT NULL THEN
    SELECT COALESCE(SUM(quantity), 0) INTO v_monthly_purchases
    FROM purchase
    WHERE patient_id = v_patient_id
      AND store_item_id = p_store_item_id
      AND status = 'completed'
      AND purchased_at >= date_trunc('month', now());

    IF v_monthly_purchases + p_quantity > v_item.max_purchases_per_month THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Monthly purchase limit reached',
        'limit', v_item.max_purchases_per_month,
        'purchased', v_monthly_purchases
      );
    END IF;
  END IF;

  -- Create purchase record
  INSERT INTO purchase (workspace_id, patient_id, store_item_id, quantity, coin_cost_total, status)
  VALUES (v_workspace_id, v_patient_id, p_store_item_id, p_quantity, v_total_cost, 'completed')
  RETURNING purchase_id INTO v_purchase_id;

  -- Spend coins (wallet is already locked by our FOR UPDATE above)
  PERFORM spend_coins(v_patient_id, v_total_cost, 'purchase', 'purchase', v_purchase_id, 'Purchased: ' || v_item.name);

  -- Add to inventory
  INSERT INTO user_inventory (workspace_id, patient_id, store_item_id, kind, quantity)
  VALUES (v_workspace_id, v_patient_id, p_store_item_id, v_item.inventory_kind, p_quantity)
  ON CONFLICT (patient_id, store_item_id)
  DO UPDATE SET quantity = user_inventory.quantity + p_quantity;

  -- Get new balance
  SELECT balance INTO v_balance
  FROM coin_wallet
  WHERE patient_id = v_patient_id;

  RETURN jsonb_build_object(
    'success', true,
    'purchase_id', v_purchase_id,
    'coin_cost_total', v_total_cost,
    'new_balance', v_balance
  );
END;
$$;
