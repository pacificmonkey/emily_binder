-- Migration 002: Categories
-- Emily Mission Log

-- =============================================================================
-- END OF DAY POLICY ENUM
-- =============================================================================

CREATE TYPE end_of_day_policy AS ENUM (
  'carryover_next_day',
  'never_carryover',
  'convert_to_this_week'
);

-- =============================================================================
-- CATEGORIES TABLE
-- =============================================================================

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  vp_value INTEGER NOT NULL DEFAULT 10,
  end_of_day_policy end_of_day_policy NOT NULL DEFAULT 'carryover_next_day',
  is_mandatory_default BOOLEAN NOT NULL DEFAULT false,
  color TEXT, -- Optional color for UI
  icon TEXT,  -- Optional icon/emoji
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for active categories
CREATE INDEX idx_categories_active ON categories(active, sort_order);

-- Trigger to auto-update updated_at
CREATE TRIGGER categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Everyone can read active categories
CREATE POLICY "categories_select" ON categories
  FOR SELECT USING (active = true);

-- Only Joey can modify categories
CREATE POLICY "joey_full_categories" ON categories
  FOR ALL USING (public.is_joey());

-- =============================================================================
-- SEED DEFAULT CATEGORIES
-- =============================================================================

INSERT INTO categories (name, vp_value, end_of_day_policy, is_mandatory_default, icon, sort_order) VALUES
  ('Self-Care', 15, 'carryover_next_day', true, '🧘', 1),
  ('Health', 20, 'carryover_next_day', true, '💊', 2),
  ('Home', 10, 'carryover_next_day', false, '🏠', 3),
  ('Work', 15, 'never_carryover', false, '💼', 4),
  ('Social', 10, 'convert_to_this_week', false, '👥', 5),
  ('Creative', 10, 'convert_to_this_week', false, '🎨', 6),
  ('Learning', 15, 'convert_to_this_week', false, '📚', 7),
  ('Errands', 10, 'carryover_next_day', false, '🛒', 8);
