-- Migration: Budget Module
-- Emily Mission Log
-- Tracks income sources and expenses for basic budgeting

-- =============================================================================
-- EXPENSE FREQUENCY ENUM
-- =============================================================================

CREATE TYPE expense_frequency AS ENUM ('monthly', 'one_time');

-- =============================================================================
-- EXPENSE CATEGORY ENUM
-- =============================================================================

CREATE TYPE expense_category AS ENUM ('rent', 'utilities', 'food', 'medical', 'transportation', 'other');

-- =============================================================================
-- BUDGET INCOME SOURCES TABLE
-- =============================================================================

CREATE TABLE budget_income_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Income info
  name TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'monthly',
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for owner queries
CREATE INDEX idx_budget_income_owner ON budget_income_sources(owner_user_id) WHERE is_active = true;

-- Trigger for updated_at
CREATE TRIGGER budget_income_updated_at
  BEFORE UPDATE ON budget_income_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- BUDGET EXPENSES TABLE
-- =============================================================================

CREATE TABLE budget_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Expense info
  name TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  frequency expense_frequency NOT NULL,
  category expense_category,

  -- For one-time expenses
  due_date DATE,
  is_paid BOOLEAN NOT NULL DEFAULT false,

  -- State
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for owner queries
CREATE INDEX idx_budget_expenses_owner ON budget_expenses(owner_user_id) WHERE is_active = true;
CREATE INDEX idx_budget_expenses_frequency ON budget_expenses(owner_user_id, frequency) WHERE is_active = true;

-- Trigger for updated_at
CREATE TRIGGER budget_expenses_updated_at
  BEFORE UPDATE ON budget_expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE budget_income_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_expenses ENABLE ROW LEVEL SECURITY;

-- Income sources: Joey full access
CREATE POLICY "joey_full_budget_income" ON budget_income_sources
  FOR ALL USING (public.is_joey());

-- Income sources: Emily own data
CREATE POLICY "emily_own_budget_income" ON budget_income_sources
  FOR ALL USING (
    public.is_emily() AND owner_user_id = auth.uid()
  );

-- Income sources: Support read Emily's data
CREATE POLICY "support_read_emily_budget_income" ON budget_income_sources
  FOR SELECT USING (
    public.get_user_role() = 'support' AND
    public.is_support_of(owner_user_id)
  );

-- Expenses: Joey full access
CREATE POLICY "joey_full_budget_expenses" ON budget_expenses
  FOR ALL USING (public.is_joey());

-- Expenses: Emily own data
CREATE POLICY "emily_own_budget_expenses" ON budget_expenses
  FOR ALL USING (
    public.is_emily() AND owner_user_id = auth.uid()
  );

-- Expenses: Support read Emily's data
CREATE POLICY "support_read_emily_budget_expenses" ON budget_expenses
  FOR SELECT USING (
    public.get_user_role() = 'support' AND
    public.is_support_of(owner_user_id)
  );

-- =============================================================================
-- SEED DEFAULT INCOME SOURCES FOR EMILY USERS
-- =============================================================================

CREATE OR REPLACE FUNCTION create_default_budget_for_emily()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role_global = 'emily' THEN
    -- Create SSI income source
    INSERT INTO budget_income_sources (owner_user_id, name, amount, frequency)
    VALUES (NEW.id, 'SSI', 914.00, 'monthly');

    -- Create SNAP income source
    INSERT INTO budget_income_sources (owner_user_id, name, amount, frequency)
    VALUES (NEW.id, 'SNAP', 234.00, 'monthly');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_emily_created_budget
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_budget_for_emily();
