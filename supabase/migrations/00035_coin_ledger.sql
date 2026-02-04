-- ============================================================================
-- Migration: 00035_coin_ledger.sql
-- Description: Coin economy - CoinWallet (cache) and CoinLedgerEntry (authoritative)
-- Schema Version: 1.3.0
-- ============================================================================

-- CoinWallet: Cached coin balance; authoritative source is CoinLedgerEntry
CREATE TABLE coin_wallet (
  coin_wallet_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  last_recomputed_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One wallet per patient
  CONSTRAINT uq_coin_wallet_patient UNIQUE (patient_id)
);

-- Indexes for coin wallet
CREATE INDEX idx_coin_wallet_workspace_id ON coin_wallet(workspace_id);
CREATE INDEX idx_coin_wallet_patient_id ON coin_wallet(patient_id);

-- CoinLedgerEntry: Append-only ledger of coin earns/spends (AUTHORITATIVE)
CREATE TABLE coin_ledger_entry (
  coin_ledger_entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,  -- +earn / -spend
  reason TEXT NOT NULL,  -- streak_reward, purchase, admin_adjustment, refund, other
  link_type TEXT,  -- streak_state, purchase, redemption, admin, other
  link_id UUID,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_user_id UUID REFERENCES "user"(user_id) ON DELETE SET NULL,
  notes TEXT
);

-- Indexes for coin ledger
CREATE INDEX idx_coin_ledger_workspace_id ON coin_ledger_entry(workspace_id);
CREATE INDEX idx_coin_ledger_patient_id ON coin_ledger_entry(patient_id);
CREATE INDEX idx_coin_ledger_occurred_at ON coin_ledger_entry(occurred_at);
CREATE INDEX idx_coin_ledger_reason ON coin_ledger_entry(reason);
CREATE INDEX idx_coin_ledger_link ON coin_ledger_entry(link_type, link_id);

-- Function to recompute coin wallet from ledger
CREATE OR REPLACE FUNCTION recompute_coin_wallet(p_patient_id UUID) RETURNS VOID AS $$
DECLARE
  v_total_coins INTEGER;
  v_workspace_id UUID;
BEGIN
  -- Get patient's workspace
  SELECT workspace_id INTO v_workspace_id
  FROM patient_profile
  WHERE patient_id = p_patient_id;

  IF v_workspace_id IS NULL THEN
    RETURN;
  END IF;

  -- Sum all coins from ledger
  SELECT COALESCE(SUM(delta), 0)
  INTO v_total_coins
  FROM coin_ledger_entry
  WHERE patient_id = p_patient_id;

  -- Ensure non-negative balance
  IF v_total_coins < 0 THEN
    v_total_coins := 0;
  END IF;

  -- Upsert coin wallet
  INSERT INTO coin_wallet (
    workspace_id, patient_id, balance, last_recomputed_at
  ) VALUES (
    v_workspace_id, p_patient_id, v_total_coins, now()
  )
  ON CONFLICT (patient_id) DO UPDATE SET
    balance = EXCLUDED.balance,
    last_recomputed_at = now();
END;
$$ LANGUAGE plpgsql;

-- Trigger to update coin wallet when ledger changes
CREATE OR REPLACE FUNCTION trigger_update_coin_wallet()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM recompute_coin_wallet(COALESCE(NEW.patient_id, OLD.patient_id));
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER coin_ledger_update_wallet
  AFTER INSERT OR UPDATE OR DELETE ON coin_ledger_entry
  FOR EACH ROW EXECUTE FUNCTION trigger_update_coin_wallet();

-- Comments for documentation
COMMENT ON TABLE coin_wallet IS 'Cached coin balance; authoritative source is CoinLedgerEntry.';
COMMENT ON TABLE coin_ledger_entry IS 'Append-only ledger of coin earns/spends.';

-- RLS Policies for coin_wallet
ALTER TABLE coin_wallet ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own coin wallet" ON coin_wallet
  FOR SELECT TO authenticated
  USING (
    patient_id IN (
      SELECT pp.patient_id FROM patient_profile pp
      JOIN workspace_membership wm ON wm.workspace_id = pp.workspace_id AND wm.user_id = pp.patient_id
      WHERE wm.user_id = auth.uid() AND wm.status = 'active'
    )
  );

CREATE POLICY "Admin can view all coin wallets" ON coin_wallet
  FOR SELECT TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND role_key = 'admin' AND status = 'active'
    )
  );

-- RLS Policies for coin_ledger_entry
ALTER TABLE coin_ledger_entry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own coin ledger" ON coin_ledger_entry
  FOR SELECT TO authenticated
  USING (
    patient_id IN (
      SELECT pp.patient_id FROM patient_profile pp
      JOIN workspace_membership wm ON wm.workspace_id = pp.workspace_id AND wm.user_id = pp.patient_id
      WHERE wm.user_id = auth.uid() AND wm.status = 'active'
    )
  );

CREATE POLICY "Admin can view all coin ledger entries" ON coin_ledger_entry
  FOR SELECT TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND role_key = 'admin' AND status = 'active'
    )
  );

-- Admin can insert coin ledger entries (adjustments)
CREATE POLICY "Admin can insert coin ledger entries" ON coin_ledger_entry
  FOR INSERT TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND role_key = 'admin' AND status = 'active'
    )
  );

-- Function to add coins to a patient's account
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
  -- Get workspace
  SELECT workspace_id INTO v_workspace_id
  FROM patient_profile
  WHERE patient_id = p_patient_id;

  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Patient not found');
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

-- Function to spend coins (for purchases)
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
  -- Get workspace and current balance
  SELECT cw.workspace_id, cw.balance INTO v_workspace_id, v_current_balance
  FROM coin_wallet cw
  WHERE cw.patient_id = p_patient_id;

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

-- Function to get coin balance
CREATE OR REPLACE FUNCTION get_coin_balance(p_patient_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id UUID;
  v_balance INTEGER;
BEGIN
  -- Get patient_id from membership if not provided
  IF p_patient_id IS NULL THEN
    SELECT pp.patient_id INTO v_patient_id
    FROM workspace_membership wm
    JOIN patient_profile pp ON pp.workspace_id = wm.workspace_id AND pp.patient_id = wm.user_id
    WHERE wm.user_id = auth.uid() AND wm.status = 'active'
    LIMIT 1;
  ELSE
    v_patient_id := p_patient_id;
  END IF;

  IF v_patient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Patient not found');
  END IF;

  -- Get balance
  SELECT COALESCE(balance, 0) INTO v_balance
  FROM coin_wallet
  WHERE patient_id = v_patient_id;

  RETURN jsonb_build_object('success', true, 'balance', COALESCE(v_balance, 0));
END;
$$;

-- Function to get coin ledger history
CREATE OR REPLACE FUNCTION get_coin_history(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id UUID;
  v_entries JSONB;
BEGIN
  -- Get patient_id from membership
  SELECT pp.patient_id INTO v_patient_id
  FROM workspace_membership wm
  JOIN patient_profile pp ON pp.workspace_id = wm.workspace_id AND pp.patient_id = wm.user_id
  WHERE wm.user_id = auth.uid() AND wm.status = 'active'
  LIMIT 1;

  IF v_patient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Patient not found');
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'coin_ledger_entry_id', cle.coin_ledger_entry_id,
      'delta', cle.delta,
      'reason', cle.reason,
      'link_type', cle.link_type,
      'link_id', cle.link_id,
      'notes', cle.notes,
      'occurred_at', cle.occurred_at
    ) ORDER BY cle.occurred_at DESC
  ), '[]'::jsonb)
  INTO v_entries
  FROM coin_ledger_entry cle
  WHERE cle.patient_id = v_patient_id
  LIMIT p_limit
  OFFSET p_offset;

  RETURN jsonb_build_object('success', true, 'entries', v_entries);
END;
$$;
