-- Migration 008: Streaks & Badges
-- Emily Mission Log

-- =============================================================================
-- WEEKLY STREAK STATE TABLE
-- Tracks weekly streaks for weekly recurring missions
-- =============================================================================

CREATE TABLE weekly_streak_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,

  -- Streak tracking
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_completed_week DATE, -- Monday of the last week where mission was completed

  -- Timestamps
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Unique constraint
  UNIQUE(user_id, mission_id)
);

-- Index for lookups
CREATE INDEX idx_weekly_streak_user ON weekly_streak_state(user_id);

-- Trigger for updated_at
CREATE TRIGGER weekly_streak_state_updated_at
  BEFORE UPDATE ON weekly_streak_state
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- BADGES TABLE
-- Earned badges/achievements
-- =============================================================================

CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Badge info
  badge_type TEXT NOT NULL, -- 'streak_milestone', 'level_milestone', 'special'
  badge_name TEXT NOT NULL,
  badge_description TEXT,
  badge_icon TEXT, -- Emoji or icon name

  -- Related data
  related_mission_id UUID REFERENCES missions(id) ON DELETE SET NULL,
  milestone_value INTEGER, -- e.g., streak count or level reached

  -- Timestamps
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for user badges
CREATE INDEX idx_badges_user ON badges(user_id, earned_at DESC);
CREATE INDEX idx_badges_type ON badges(user_id, badge_type);

-- =============================================================================
-- GRACE TOKENS TABLE
-- Tokens that protect weekly streaks
-- =============================================================================

CREATE TABLE grace_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One row per user
  UNIQUE(user_id)
);

-- Trigger for updated_at
CREATE TRIGGER grace_tokens_updated_at
  BEFORE UPDATE ON grace_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- GRACE TOKEN USAGE LOG
-- =============================================================================

CREATE TABLE grace_token_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  week_protected DATE NOT NULL, -- Monday of the week that was protected
  used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for lookups
CREATE INDEX idx_grace_token_usage_user ON grace_token_usage(user_id, week_protected);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE weekly_streak_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE grace_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE grace_token_usage ENABLE ROW LEVEL SECURITY;

-- Weekly streak state
CREATE POLICY "joey_full_streaks" ON weekly_streak_state
  FOR ALL USING (public.is_joey());

CREATE POLICY "read_own_streaks" ON weekly_streak_state
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "support_read_emily_streaks" ON weekly_streak_state
  FOR SELECT USING (
    public.get_user_role() = 'support' AND
    public.is_support_of(user_id)
  );

-- Badges
CREATE POLICY "joey_full_badges" ON badges
  FOR ALL USING (public.is_joey());

CREATE POLICY "read_own_badges" ON badges
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "support_read_emily_badges" ON badges
  FOR SELECT USING (
    public.get_user_role() = 'support' AND
    public.is_support_of(user_id)
  );

-- Grace tokens
CREATE POLICY "joey_full_grace_tokens" ON grace_tokens
  FOR ALL USING (public.is_joey());

CREATE POLICY "read_own_grace_tokens" ON grace_tokens
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "emily_update_own_grace_tokens" ON grace_tokens
  FOR UPDATE USING (
    public.is_emily() AND user_id = auth.uid()
  );

CREATE POLICY "support_read_emily_grace_tokens" ON grace_tokens
  FOR SELECT USING (
    public.get_user_role() = 'support' AND
    public.is_support_of(user_id)
  );

-- Grace token usage
CREATE POLICY "joey_full_grace_usage" ON grace_token_usage
  FOR ALL USING (public.is_joey());

CREATE POLICY "read_own_grace_usage" ON grace_token_usage
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "emily_insert_grace_usage" ON grace_token_usage
  FOR INSERT WITH CHECK (
    public.is_emily() AND user_id = auth.uid()
  );

-- =============================================================================
-- AUTO-CREATE GRACE TOKENS FOR NEW USERS
-- =============================================================================

CREATE OR REPLACE FUNCTION create_grace_tokens_for_new_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO grace_tokens (user_id, quantity) VALUES (NEW.id, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created_grace
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_grace_tokens_for_new_profile();
