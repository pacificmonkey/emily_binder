-- Migration 011: Bonus Objectives
-- Emily Mission Log

-- =============================================================================
-- BONUS OBJECTIVES TABLE
-- Special objectives that grant bonus VP (mood check-in, daily win, etc.)
-- =============================================================================

CREATE TABLE bonus_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Objective info
  name TEXT NOT NULL,
  description TEXT,
  vp_value INTEGER NOT NULL DEFAULT 5,

  -- Objective type determines how it's tracked/completed
  -- 'mood_checkin' - Complete a mood check-in
  -- 'daily_win' - Reach daily win threshold
  -- 'streak_maintained' - Keep a weekly streak going
  -- 'custom' - Manually triggered
  objective_type TEXT NOT NULL,

  -- Completion rules
  max_per_day INTEGER DEFAULT 1, -- NULL means unlimited
  cooldown_hours INTEGER DEFAULT 0, -- Hours between completions

  -- Display
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for active objectives
CREATE INDEX idx_bonus_objectives_active ON bonus_objectives(active, sort_order);

-- =============================================================================
-- BONUS COMPLETIONS TABLE
-- Tracks when bonus objectives are completed
-- =============================================================================

CREATE TABLE bonus_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bonus_objective_id UUID NOT NULL REFERENCES bonus_objectives(id) ON DELETE CASCADE,
  completion_date DATE NOT NULL,
  vp_awarded INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Prevent duplicate completions on same day for limited objectives
  UNIQUE(user_id, bonus_objective_id, completion_date)
);

-- Index for user completions
CREATE INDEX idx_bonus_completions_user_date ON bonus_completions(user_id, completion_date);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE bonus_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE bonus_completions ENABLE ROW LEVEL SECURITY;

-- Bonus objectives: everyone can read active, Joey can modify
CREATE POLICY "read_active_bonus_objectives" ON bonus_objectives
  FOR SELECT USING (active = true);

CREATE POLICY "joey_full_bonus_objectives" ON bonus_objectives
  FOR ALL USING (public.is_joey());

-- Bonus completions
CREATE POLICY "joey_full_bonus_completions" ON bonus_completions
  FOR ALL USING (public.is_joey());

CREATE POLICY "read_own_bonus_completions" ON bonus_completions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "emily_insert_bonus_completions" ON bonus_completions
  FOR INSERT WITH CHECK (
    public.is_emily() AND user_id = auth.uid()
  );

CREATE POLICY "support_read_emily_bonus" ON bonus_completions
  FOR SELECT USING (
    public.get_user_role() = 'support' AND
    public.is_support_of(user_id)
  );

-- =============================================================================
-- SEED DEFAULT BONUS OBJECTIVES
-- =============================================================================

INSERT INTO bonus_objectives (name, description, vp_value, objective_type, max_per_day, icon, sort_order) VALUES
  ('Mood Check-in', 'Log how you''re feeling', 5, 'mood_checkin', 3, '💭', 1),
  ('Daily Win', 'Complete enough tasks for the day', 10, 'daily_win', 1, '🌟', 2),
  ('Streak Keeper', 'Maintain a weekly streak', 15, 'streak_maintained', NULL, '🔥', 3);
