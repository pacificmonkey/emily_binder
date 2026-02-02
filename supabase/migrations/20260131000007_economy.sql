-- Migration 007: Economy (VP, Levels, Coins)
-- Emily Mission Log

-- =============================================================================
-- ECONOMY STATE TABLE
-- Tracks VP, level, and coins for each user
-- =============================================================================

CREATE TABLE economy_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  total_vp INTEGER NOT NULL DEFAULT 0,
  current_level INTEGER NOT NULL DEFAULT 1,
  coins INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger for updated_at
CREATE TRIGGER economy_state_updated_at
  BEFORE UPDATE ON economy_state
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ECONOMY CONFIG TABLE (Singleton)
-- Joey-configurable settings for the economy system
-- =============================================================================

CREATE TABLE economy_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Level progression: VP thresholds for each level
  -- e.g., [100, 250, 500, 1000, 2000, 5000] means level 2 at 100 VP, level 3 at 250 VP, etc.
  level_thresholds JSONB NOT NULL DEFAULT '[100, 250, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000]'::jsonb,

  -- Coins awarded per level-up
  -- e.g., [10, 15, 20, 25, 30, 40] means 10 coins for reaching level 2, 15 for level 3, etc.
  coins_per_level JSONB NOT NULL DEFAULT '[10, 15, 20, 25, 30, 40, 50, 75, 100, 150]'::jsonb,

  -- Daily win: number of completions to trigger "You did enough today"
  daily_win_threshold INTEGER NOT NULL DEFAULT 3,

  -- VP multiplier for mandatory events
  mandatory_event_multiplier NUMERIC NOT NULL DEFAULT 1.5,

  -- Cost of grace tokens in coins
  grace_token_cost INTEGER NOT NULL DEFAULT 50,

  -- Weekly streak reminder: day (0=Mon) and hour (0-23)
  weekly_streak_prompt_day INTEGER NOT NULL DEFAULT 6 CHECK (weekly_streak_prompt_day BETWEEN 0 AND 6),
  weekly_streak_prompt_hour INTEGER NOT NULL DEFAULT 18 CHECK (weekly_streak_prompt_hour BETWEEN 0 AND 23),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger for updated_at
CREATE TRIGGER economy_config_updated_at
  BEFORE UPDATE ON economy_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Singleton enforcement
CREATE UNIQUE INDEX economy_config_singleton ON economy_config ((true));

-- Insert default config
INSERT INTO economy_config DEFAULT VALUES;

-- =============================================================================
-- VP TRANSACTION LOG (for history/debugging)
-- =============================================================================

CREATE TABLE vp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  source_type TEXT NOT NULL, -- 'mission_completion', 'event_completion', 'bonus', 'admin_adjustment'
  source_id UUID, -- Reference to the source (mission_completion.id, etc.)
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for user transactions
CREATE INDEX idx_vp_transactions_user ON vp_transactions(user_id, created_at DESC);

-- =============================================================================
-- COIN TRANSACTION LOG
-- =============================================================================

CREATE TABLE coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- Positive for earning, negative for spending
  source_type TEXT NOT NULL, -- 'level_up', 'sticker_purchase', 'grace_token_purchase', 'admin_adjustment'
  source_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for user transactions
CREATE INDEX idx_coin_transactions_user ON coin_transactions(user_id, created_at DESC);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE economy_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE economy_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE vp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;

-- Economy state: Joey full, Emily/Support read own
CREATE POLICY "joey_full_economy_state" ON economy_state
  FOR ALL USING (public.is_joey());

CREATE POLICY "emily_read_own_economy" ON economy_state
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "support_read_emily_economy" ON economy_state
  FOR SELECT USING (
    public.get_user_role() = 'support' AND
    public.is_support_of(user_id)
  );

-- Economy config: everyone can read, Joey can modify
CREATE POLICY "read_economy_config" ON economy_config
  FOR SELECT USING (true);

CREATE POLICY "joey_update_economy_config" ON economy_config
  FOR UPDATE USING (public.is_joey());

-- VP transactions: same as economy_state
CREATE POLICY "joey_full_vp_transactions" ON vp_transactions
  FOR ALL USING (public.is_joey());

CREATE POLICY "read_own_vp_transactions" ON vp_transactions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "support_read_emily_vp" ON vp_transactions
  FOR SELECT USING (
    public.get_user_role() = 'support' AND
    public.is_support_of(user_id)
  );

-- Coin transactions: same pattern
CREATE POLICY "joey_full_coin_transactions" ON coin_transactions
  FOR ALL USING (public.is_joey());

CREATE POLICY "read_own_coin_transactions" ON coin_transactions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "support_read_emily_coins" ON coin_transactions
  FOR SELECT USING (
    public.get_user_role() = 'support' AND
    public.is_support_of(user_id)
  );

-- =============================================================================
-- AUTO-CREATE ECONOMY STATE FOR NEW USERS
-- =============================================================================

CREATE OR REPLACE FUNCTION create_economy_state_for_new_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO economy_state (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created_economy
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_economy_state_for_new_profile();
