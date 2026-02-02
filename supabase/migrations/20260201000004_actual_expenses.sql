-- Migration: Actual Expenses
-- Tracks real transactions/spending separate from planned budget expenses
-- Both planned and actual affect remaining funds calculation

-- =============================================================================
-- CREATE ACTUAL EXPENSES TABLE
-- =============================================================================

CREATE TABLE budget_actual_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Transaction details
  name TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  category expense_category,

  -- When the expense occurred
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Optional link to planned expense (for "Log" functionality)
  planned_expense_id UUID REFERENCES budget_expenses(id) ON DELETE SET NULL,

  -- Notes about the transaction
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_actual_expenses_owner ON budget_actual_expenses(owner_user_id);
CREATE INDEX idx_actual_expenses_date ON budget_actual_expenses(owner_user_id, expense_date);
CREATE INDEX idx_actual_expenses_category ON budget_actual_expenses(owner_user_id, category);
CREATE INDEX idx_actual_expenses_planned ON budget_actual_expenses(planned_expense_id) WHERE planned_expense_id IS NOT NULL;

-- =============================================================================
-- UPDATED_AT TRIGGER
-- =============================================================================

CREATE TRIGGER update_actual_expenses_updated_at
  BEFORE UPDATE ON budget_actual_expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE budget_actual_expenses ENABLE ROW LEVEL SECURITY;

-- Joey can see and manage all actual expenses
CREATE POLICY "joey_full_actual_expenses" ON budget_actual_expenses
  FOR ALL USING (public.is_joey());

-- Emily can manage her own actual expenses
CREATE POLICY "emily_own_actual_expenses" ON budget_actual_expenses
  FOR ALL USING (
    public.is_emily() AND owner_user_id = auth.uid()
  );

-- Support can read Emily's actual expenses
CREATE POLICY "support_read_emily_actual_expenses" ON budget_actual_expenses
  FOR SELECT USING (
    public.get_user_role() = 'support' AND
    public.is_support_of(owner_user_id)
  );
