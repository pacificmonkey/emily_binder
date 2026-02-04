-- Migration: 00031_budget_module.sql
-- Description: Create Budget module tables (BudgetAccount, BudgetCategory, BudgetPlanItem, BudgetTransaction)
-- Schema Version: 1.3.0

-- =============================================================================
-- BUDGET ACCOUNT TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS budget_account (
  budget_account_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  restriction_type budget_restriction_type NOT NULL DEFAULT 'none',
  restriction_rules JSONB,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_budget_account_workspace ON budget_account(workspace_id);
CREATE INDEX IF NOT EXISTS idx_budget_account_patient ON budget_account(patient_id);
CREATE INDEX IF NOT EXISTS idx_budget_account_status ON budget_account(status);

ALTER TABLE budget_account ENABLE ROW LEVEL SECURITY;

CREATE POLICY budget_account_select ON budget_account
  FOR SELECT TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_membership
    WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY budget_account_insert ON budget_account
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM workspace_membership
    WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY budget_account_update ON budget_account
  FOR UPDATE TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_membership
    WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY budget_account_delete ON budget_account
  FOR DELETE TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_membership
    WHERE user_id = auth.uid() AND status = 'active'
  ));

-- =============================================================================
-- BUDGET CATEGORY TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS budget_category (
  budget_category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind budget_category_kind NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_budget_category_workspace ON budget_category(workspace_id);
CREATE INDEX IF NOT EXISTS idx_budget_category_patient ON budget_category(patient_id);
CREATE INDEX IF NOT EXISTS idx_budget_category_kind ON budget_category(kind);

ALTER TABLE budget_category ENABLE ROW LEVEL SECURITY;

CREATE POLICY budget_category_select ON budget_category
  FOR SELECT TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_membership
    WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY budget_category_insert ON budget_category
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM workspace_membership
    WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY budget_category_update ON budget_category
  FOR UPDATE TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_membership
    WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY budget_category_delete ON budget_category
  FOR DELETE TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_membership
    WHERE user_id = auth.uid() AND status = 'active'
  ));

-- =============================================================================
-- BUDGET PLAN ITEM TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS budget_plan_item (
  budget_plan_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
  type budget_transaction_type NOT NULL,
  title TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES budget_category(budget_category_id) ON DELETE CASCADE,
  account_id UUID REFERENCES budget_account(budget_account_id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL,
  cadence budget_cadence NOT NULL DEFAULT 'monthly',
  next_due_date DATE,
  status budget_plan_item_status NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_budget_plan_item_workspace ON budget_plan_item(workspace_id);
CREATE INDEX IF NOT EXISTS idx_budget_plan_item_patient ON budget_plan_item(patient_id);
CREATE INDEX IF NOT EXISTS idx_budget_plan_item_category ON budget_plan_item(category_id);
CREATE INDEX IF NOT EXISTS idx_budget_plan_item_status ON budget_plan_item(status);

ALTER TABLE budget_plan_item ENABLE ROW LEVEL SECURITY;

CREATE POLICY budget_plan_item_select ON budget_plan_item
  FOR SELECT TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_membership
    WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY budget_plan_item_insert ON budget_plan_item
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM workspace_membership
    WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY budget_plan_item_update ON budget_plan_item
  FOR UPDATE TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_membership
    WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY budget_plan_item_delete ON budget_plan_item
  FOR DELETE TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_membership
    WHERE user_id = auth.uid() AND status = 'active'
  ));

-- =============================================================================
-- BUDGET TRANSACTION TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS budget_transaction (
  budget_transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
  type budget_transaction_type NOT NULL,
  title TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES budget_category(budget_category_id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES budget_account(budget_account_id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  status budget_entry_status NOT NULL DEFAULT 'posted',
  linked_plan_item_id UUID REFERENCES budget_plan_item(budget_plan_item_id) ON DELETE SET NULL,
  merchant TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_budget_transaction_workspace ON budget_transaction(workspace_id);
CREATE INDEX IF NOT EXISTS idx_budget_transaction_patient ON budget_transaction(patient_id);
CREATE INDEX IF NOT EXISTS idx_budget_transaction_account ON budget_transaction(account_id);
CREATE INDEX IF NOT EXISTS idx_budget_transaction_category ON budget_transaction(category_id);
CREATE INDEX IF NOT EXISTS idx_budget_transaction_occurred_at ON budget_transaction(occurred_at);

ALTER TABLE budget_transaction ENABLE ROW LEVEL SECURITY;

CREATE POLICY budget_transaction_select ON budget_transaction
  FOR SELECT TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_membership
    WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY budget_transaction_insert ON budget_transaction
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM workspace_membership
    WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY budget_transaction_update ON budget_transaction
  FOR UPDATE TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_membership
    WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY budget_transaction_delete ON budget_transaction
  FOR DELETE TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_membership
    WHERE user_id = auth.uid() AND status = 'active'
  ));

-- =============================================================================
-- RPC FUNCTIONS
-- =============================================================================

-- Get budget accounts
CREATE OR REPLACE FUNCTION get_budget_accounts() RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_workspace_id UUID;
  v_patient_id UUID;
  v_accounts JSONB;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT wm.workspace_id INTO v_workspace_id
  FROM workspace_membership wm
  WHERE wm.user_id = v_user_id AND wm.status = 'active'
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace membership');
  END IF;

  SELECT patient_id INTO v_patient_id
  FROM patient_profile
  WHERE workspace_id = v_workspace_id
  LIMIT 1;

  IF v_patient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No patient profile found');
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'budget_account_id', ba.budget_account_id,
      'name', ba.name,
      'restriction_type', ba.restriction_type,
      'restriction_rules', ba.restriction_rules,
      'notes', ba.notes,
      'status', ba.status,
      'created_at', ba.created_at
    ) ORDER BY ba.name
  ), '[]'::jsonb)
  INTO v_accounts
  FROM budget_account ba
  WHERE ba.workspace_id = v_workspace_id
    AND ba.patient_id = v_patient_id
    AND ba.status = 'active';

  RETURN jsonb_build_object(
    'success', true,
    'accounts', v_accounts
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get budget categories
CREATE OR REPLACE FUNCTION get_budget_categories() RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_workspace_id UUID;
  v_patient_id UUID;
  v_categories JSONB;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT wm.workspace_id INTO v_workspace_id
  FROM workspace_membership wm
  WHERE wm.user_id = v_user_id AND wm.status = 'active'
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace membership');
  END IF;

  SELECT patient_id INTO v_patient_id
  FROM patient_profile
  WHERE workspace_id = v_workspace_id
  LIMIT 1;

  IF v_patient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No patient profile found');
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'budget_category_id', bc.budget_category_id,
      'name', bc.name,
      'kind', bc.kind,
      'created_at', bc.created_at
    ) ORDER BY bc.kind, bc.name
  ), '[]'::jsonb)
  INTO v_categories
  FROM budget_category bc
  WHERE bc.workspace_id = v_workspace_id
    AND bc.patient_id = v_patient_id;

  RETURN jsonb_build_object(
    'success', true,
    'categories', v_categories
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create budget account
CREATE OR REPLACE FUNCTION create_budget_account(
  p_name TEXT,
  p_restriction_type budget_restriction_type DEFAULT 'none',
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_workspace_id UUID;
  v_patient_id UUID;
  v_account_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT wm.workspace_id INTO v_workspace_id
  FROM workspace_membership wm
  WHERE wm.user_id = v_user_id AND wm.status = 'active'
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace membership');
  END IF;

  SELECT patient_id INTO v_patient_id
  FROM patient_profile
  WHERE workspace_id = v_workspace_id
  LIMIT 1;

  IF v_patient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No patient profile found');
  END IF;

  INSERT INTO budget_account (
    workspace_id, patient_id, name, restriction_type, notes, status
  ) VALUES (
    v_workspace_id, v_patient_id, p_name, p_restriction_type, p_notes, 'active'
  )
  RETURNING budget_account_id INTO v_account_id;

  RETURN jsonb_build_object(
    'success', true,
    'budget_account_id', v_account_id
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create budget category
CREATE OR REPLACE FUNCTION create_budget_category(
  p_name TEXT,
  p_kind budget_category_kind
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_workspace_id UUID;
  v_patient_id UUID;
  v_category_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT wm.workspace_id INTO v_workspace_id
  FROM workspace_membership wm
  WHERE wm.user_id = v_user_id AND wm.status = 'active'
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace membership');
  END IF;

  SELECT patient_id INTO v_patient_id
  FROM patient_profile
  WHERE workspace_id = v_workspace_id
  LIMIT 1;

  IF v_patient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No patient profile found');
  END IF;

  INSERT INTO budget_category (
    workspace_id, patient_id, name, kind
  ) VALUES (
    v_workspace_id, v_patient_id, p_name, p_kind
  )
  RETURNING budget_category_id INTO v_category_id;

  RETURN jsonb_build_object(
    'success', true,
    'budget_category_id', v_category_id
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create budget transaction
CREATE OR REPLACE FUNCTION create_budget_transaction(
  p_type budget_transaction_type,
  p_title TEXT,
  p_category_id UUID,
  p_account_id UUID,
  p_amount NUMERIC,
  p_occurred_at TIMESTAMPTZ DEFAULT NULL,
  p_merchant TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_linked_plan_item_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_workspace_id UUID;
  v_patient_id UUID;
  v_transaction_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT wm.workspace_id INTO v_workspace_id
  FROM workspace_membership wm
  WHERE wm.user_id = v_user_id AND wm.status = 'active'
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace membership');
  END IF;

  SELECT patient_id INTO v_patient_id
  FROM patient_profile
  WHERE workspace_id = v_workspace_id
  LIMIT 1;

  IF v_patient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No patient profile found');
  END IF;

  INSERT INTO budget_transaction (
    workspace_id, patient_id, type, title, category_id, account_id,
    amount, occurred_at, status, merchant, notes, linked_plan_item_id
  ) VALUES (
    v_workspace_id, v_patient_id, p_type, p_title, p_category_id, p_account_id,
    p_amount, COALESCE(p_occurred_at, now()), 'posted', p_merchant, p_notes, p_linked_plan_item_id
  )
  RETURNING budget_transaction_id INTO v_transaction_id;

  RETURN jsonb_build_object(
    'success', true,
    'budget_transaction_id', v_transaction_id
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get recent transactions
CREATE OR REPLACE FUNCTION get_budget_transactions(
  p_account_id UUID DEFAULT NULL,
  p_category_id UUID DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_limit INT DEFAULT 50
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_workspace_id UUID;
  v_patient_id UUID;
  v_transactions JSONB;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT wm.workspace_id INTO v_workspace_id
  FROM workspace_membership wm
  WHERE wm.user_id = v_user_id AND wm.status = 'active'
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace membership');
  END IF;

  SELECT patient_id INTO v_patient_id
  FROM patient_profile
  WHERE workspace_id = v_workspace_id
  LIMIT 1;

  IF v_patient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No patient profile found');
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'budget_transaction_id', bt.budget_transaction_id,
      'type', bt.type,
      'title', bt.title,
      'amount', bt.amount,
      'occurred_at', bt.occurred_at,
      'status', bt.status,
      'merchant', bt.merchant,
      'notes', bt.notes,
      'category_id', bt.category_id,
      'category_name', bc.name,
      'account_id', bt.account_id,
      'account_name', ba.name,
      'created_at', bt.created_at
    ) ORDER BY bt.occurred_at DESC
  ), '[]'::jsonb)
  INTO v_transactions
  FROM budget_transaction bt
  JOIN budget_category bc ON bc.budget_category_id = bt.category_id
  JOIN budget_account ba ON ba.budget_account_id = bt.account_id
  WHERE bt.workspace_id = v_workspace_id
    AND bt.patient_id = v_patient_id
    AND (p_account_id IS NULL OR bt.account_id = p_account_id)
    AND (p_category_id IS NULL OR bt.category_id = p_category_id)
    AND (p_start_date IS NULL OR bt.occurred_at >= p_start_date)
    AND (p_end_date IS NULL OR bt.occurred_at <= p_end_date)
  LIMIT p_limit;

  RETURN jsonb_build_object(
    'success', true,
    'transactions', v_transactions
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get budget summary (current month)
CREATE OR REPLACE FUNCTION get_budget_summary() RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_workspace_id UUID;
  v_patient_id UUID;
  v_month_start DATE;
  v_month_end DATE;
  v_total_income NUMERIC;
  v_total_expenses NUMERIC;
  v_by_category JSONB;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT wm.workspace_id INTO v_workspace_id
  FROM workspace_membership wm
  WHERE wm.user_id = v_user_id AND wm.status = 'active'
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace membership');
  END IF;

  SELECT patient_id INTO v_patient_id
  FROM patient_profile
  WHERE workspace_id = v_workspace_id
  LIMIT 1;

  IF v_patient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No patient profile found');
  END IF;

  v_month_start := date_trunc('month', CURRENT_DATE)::DATE;
  v_month_end := (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE;

  -- Total income
  SELECT COALESCE(SUM(amount), 0) INTO v_total_income
  FROM budget_transaction
  WHERE workspace_id = v_workspace_id
    AND patient_id = v_patient_id
    AND type = 'income'
    AND status = 'posted'
    AND occurred_at >= v_month_start
    AND occurred_at <= v_month_end + INTERVAL '1 day';

  -- Total expenses
  SELECT COALESCE(SUM(amount), 0) INTO v_total_expenses
  FROM budget_transaction
  WHERE workspace_id = v_workspace_id
    AND patient_id = v_patient_id
    AND type = 'expense'
    AND status = 'posted'
    AND occurred_at >= v_month_start
    AND occurred_at <= v_month_end + INTERVAL '1 day';

  -- By category
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'category_id', bc.budget_category_id,
      'category_name', bc.name,
      'kind', bc.kind,
      'total', COALESCE(cat_totals.total, 0)
    )
  ), '[]'::jsonb)
  INTO v_by_category
  FROM budget_category bc
  LEFT JOIN (
    SELECT category_id, SUM(amount) as total
    FROM budget_transaction
    WHERE workspace_id = v_workspace_id
      AND patient_id = v_patient_id
      AND status = 'posted'
      AND occurred_at >= v_month_start
      AND occurred_at <= v_month_end + INTERVAL '1 day'
    GROUP BY category_id
  ) cat_totals ON cat_totals.category_id = bc.budget_category_id
  WHERE bc.workspace_id = v_workspace_id
    AND bc.patient_id = v_patient_id;

  RETURN jsonb_build_object(
    'success', true,
    'month_start', v_month_start,
    'month_end', v_month_end,
    'total_income', v_total_income,
    'total_expenses', v_total_expenses,
    'net', v_total_income - v_total_expenses,
    'by_category', v_by_category
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Delete transaction
CREATE OR REPLACE FUNCTION delete_budget_transaction(
  p_transaction_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  DELETE FROM budget_transaction
  WHERE budget_transaction_id = p_transaction_id
    AND workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = v_user_id AND status = 'active'
    );

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction not found or access denied');
  END IF;

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_budget_accounts() TO authenticated;
GRANT EXECUTE ON FUNCTION get_budget_categories() TO authenticated;
GRANT EXECUTE ON FUNCTION create_budget_account(TEXT, budget_restriction_type, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_budget_category(TEXT, budget_category_kind) TO authenticated;
GRANT EXECUTE ON FUNCTION create_budget_transaction(budget_transaction_type, TEXT, UUID, UUID, NUMERIC, TIMESTAMPTZ, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_budget_transactions(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_budget_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION delete_budget_transaction(UUID) TO authenticated;

-- Apply audit triggers
SELECT create_audit_trigger('budget_account');
SELECT create_audit_trigger('budget_category');
SELECT create_audit_trigger('budget_plan_item');
SELECT create_audit_trigger('budget_transaction');

-- Insert default categories
INSERT INTO budget_category (workspace_id, patient_id, name, kind)
SELECT
  w.workspace_id,
  pp.patient_id,
  cat.name,
  cat.kind::budget_category_kind
FROM workspace w
JOIN patient_profile pp ON pp.workspace_id = w.workspace_id
CROSS JOIN (
  VALUES
    ('Salary', 'income'),
    ('Benefits', 'income'),
    ('Other Income', 'income'),
    ('Rent/Housing', 'expense'),
    ('Utilities', 'expense'),
    ('Groceries', 'expense'),
    ('Transportation', 'expense'),
    ('Healthcare', 'expense'),
    ('Entertainment', 'expense'),
    ('Dining Out', 'expense'),
    ('Shopping', 'expense'),
    ('Other Expenses', 'expense')
) AS cat(name, kind)
ON CONFLICT DO NOTHING;
