-- Migration: Income Category Restrictions
-- Allows income sources to be restricted to specific expense categories
-- Example: SNAP can only be used for food expenses

-- =============================================================================
-- ADD ALLOWED_CATEGORIES COLUMN
-- =============================================================================

-- NULL = unrestricted (can cover any expense category)
-- Array of categories = restricted to those categories only
ALTER TABLE budget_income_sources
ADD COLUMN allowed_categories expense_category[] DEFAULT NULL;

-- =============================================================================
-- UPDATE DEFAULT INCOME SEED FUNCTION
-- =============================================================================

-- Update the trigger to set SNAP as food-only by default
CREATE OR REPLACE FUNCTION create_default_budget_for_emily()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role_global = 'emily' THEN
    -- Create SSI income source (unrestricted)
    INSERT INTO budget_income_sources (owner_user_id, name, amount, frequency, allowed_categories)
    VALUES (NEW.id, 'SSI', 914.00, 'monthly', NULL);

    -- Create SNAP income source (food only)
    INSERT INTO budget_income_sources (owner_user_id, name, amount, frequency, allowed_categories)
    VALUES (NEW.id, 'SNAP', 234.00, 'monthly', ARRAY['food']::expense_category[]);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- UPDATE EXISTING SNAP RECORDS
-- =============================================================================

-- Set existing SNAP income sources to food-only
UPDATE budget_income_sources
SET allowed_categories = ARRAY['food']::expense_category[]
WHERE name = 'SNAP' AND allowed_categories IS NULL;
