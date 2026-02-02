-- Migration: Budget Expense Categories
-- Allows dynamic management of expense categories with emoji, name, and VP value

-- =============================================================================
-- CREATE BUDGET EXPENSE CATEGORIES TABLE
-- =============================================================================

CREATE TABLE budget_expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '📦',  -- Emoji icon
  vp_value INTEGER NOT NULL DEFAULT 0,  -- VP awarded when logging an expense in this category
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_budget_expense_categories_active ON budget_expense_categories(is_active);
CREATE INDEX idx_budget_expense_categories_sort ON budget_expense_categories(sort_order) WHERE is_active = true;

-- =============================================================================
-- UPDATED_AT TRIGGER
-- =============================================================================

CREATE TRIGGER update_budget_expense_categories_updated_at
  BEFORE UPDATE ON budget_expense_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE budget_expense_categories ENABLE ROW LEVEL SECURITY;

-- Everyone can read active categories
CREATE POLICY "anyone_read_active_budget_categories" ON budget_expense_categories
  FOR SELECT USING (is_active = true);

-- Joey can manage all categories
CREATE POLICY "joey_manage_budget_categories" ON budget_expense_categories
  FOR ALL USING (public.is_joey());

-- =============================================================================
-- SEED DEFAULT CATEGORIES
-- =============================================================================

INSERT INTO budget_expense_categories (name, icon, vp_value, sort_order) VALUES
  ('Rent', '🏠', 5, 1),
  ('Utilities', '💡', 2, 2),
  ('Food', '🍎', 1, 3),
  ('Medical', '💊', 3, 4),
  ('Transportation', '🚌', 1, 5),
  ('Other', '📦', 0, 6);

-- =============================================================================
-- UPDATE EXPENSE TABLES TO USE TEXT INSTEAD OF ENUM
-- =============================================================================

-- Change budget_expenses category from enum to text
ALTER TABLE budget_expenses
  ALTER COLUMN category TYPE TEXT;

-- Change budget_actual_expenses category from enum to text
ALTER TABLE budget_actual_expenses
  ALTER COLUMN category TYPE TEXT;

-- Change budget_income_sources allowed_categories from enum[] to text[]
ALTER TABLE budget_income_sources
  ALTER COLUMN allowed_categories TYPE TEXT[]
  USING allowed_categories::TEXT[];

-- Drop the old enum type (no longer needed)
DROP TYPE IF EXISTS expense_category;
