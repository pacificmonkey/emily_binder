-- Migration 009: Stickers
-- Emily Mission Log

-- =============================================================================
-- STICKER CATALOG TABLE
-- Available stickers that can be purchased
-- =============================================================================

CREATE TABLE sticker_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Sticker info
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  cost_coins INTEGER NOT NULL CHECK (cost_coins >= 0),

  -- Categorization
  category TEXT, -- e.g., 'animals', 'nature', 'food', 'celebration'
  tags TEXT[], -- For searching/filtering

  -- Display
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for active stickers
CREATE INDEX idx_sticker_catalog_active ON sticker_catalog(active, sort_order);
CREATE INDEX idx_sticker_catalog_category ON sticker_catalog(category) WHERE active = true;

-- =============================================================================
-- STICKER OWNERSHIP TABLE
-- Stickers owned by users
-- =============================================================================

CREATE TABLE sticker_ownership (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sticker_id UUID NOT NULL REFERENCES sticker_catalog(id) ON DELETE CASCADE,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Unique constraint: one ownership record per user per sticker
  UNIQUE(user_id, sticker_id)
);

-- Index for user stickers
CREATE INDEX idx_sticker_ownership_user ON sticker_ownership(user_id);

-- =============================================================================
-- STICKER PLACEMENTS TABLE
-- Where stickers are placed on the Home canvas
-- =============================================================================

CREATE TABLE sticker_placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sticker_id UUID NOT NULL REFERENCES sticker_catalog(id) ON DELETE CASCADE,

  -- Position and transform
  position_x NUMERIC NOT NULL,
  position_y NUMERIC NOT NULL,
  scale NUMERIC NOT NULL DEFAULT 1.0 CHECK (scale > 0),
  rotation NUMERIC NOT NULL DEFAULT 0, -- Degrees
  z_index INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for user placements
CREATE INDEX idx_sticker_placements_user ON sticker_placements(user_id);

-- Trigger for updated_at
CREATE TRIGGER sticker_placements_updated_at
  BEFORE UPDATE ON sticker_placements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE sticker_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE sticker_ownership ENABLE ROW LEVEL SECURITY;
ALTER TABLE sticker_placements ENABLE ROW LEVEL SECURITY;

-- Sticker catalog: everyone can read active, Joey can modify
CREATE POLICY "read_active_stickers" ON sticker_catalog
  FOR SELECT USING (active = true);

CREATE POLICY "joey_full_sticker_catalog" ON sticker_catalog
  FOR ALL USING (public.is_joey());

-- Sticker ownership
CREATE POLICY "joey_full_sticker_ownership" ON sticker_ownership
  FOR ALL USING (public.is_joey());

CREATE POLICY "read_own_stickers" ON sticker_ownership
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "emily_purchase_stickers" ON sticker_ownership
  FOR INSERT WITH CHECK (
    public.is_emily() AND user_id = auth.uid()
  );

CREATE POLICY "support_read_emily_stickers" ON sticker_ownership
  FOR SELECT USING (
    public.get_user_role() = 'support' AND
    public.is_support_of(user_id)
  );

-- Sticker placements
CREATE POLICY "joey_full_sticker_placements" ON sticker_placements
  FOR ALL USING (public.is_joey());

CREATE POLICY "emily_own_placements" ON sticker_placements
  FOR ALL USING (
    public.is_emily() AND user_id = auth.uid()
  );

CREATE POLICY "support_read_emily_placements" ON sticker_placements
  FOR SELECT USING (
    public.get_user_role() = 'support' AND
    public.is_support_of(user_id)
  );

-- =============================================================================
-- SEED STARTER STICKERS
-- =============================================================================

INSERT INTO sticker_catalog (name, image_url, cost_coins, category, sort_order) VALUES
  ('Happy Star', '/stickers/star-happy.svg', 10, 'celebration', 1),
  ('Rainbow', '/stickers/rainbow.svg', 15, 'nature', 2),
  ('Heart', '/stickers/heart.svg', 10, 'love', 3),
  ('Sparkles', '/stickers/sparkles.svg', 20, 'celebration', 4),
  ('Sun', '/stickers/sun.svg', 15, 'nature', 5),
  ('Moon', '/stickers/moon.svg', 15, 'nature', 6),
  ('Flower', '/stickers/flower.svg', 10, 'nature', 7),
  ('Cat', '/stickers/cat.svg', 25, 'animals', 8),
  ('Coffee', '/stickers/coffee.svg', 15, 'food', 9),
  ('Book', '/stickers/book.svg', 20, 'items', 10);
