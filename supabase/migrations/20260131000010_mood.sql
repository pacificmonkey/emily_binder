-- Migration 010: Mood Check-ins (How We Feel style)
-- Emily Mission Log

-- =============================================================================
-- MOOD QUADRANT ENUM
-- Based on energy (high/low) x pleasantness (pleasant/unpleasant)
-- =============================================================================

CREATE TYPE mood_quadrant AS ENUM (
  'high_energy_pleasant',    -- Top right: excited, joyful, energized
  'high_energy_unpleasant',  -- Top left: anxious, angry, stressed
  'low_energy_pleasant',     -- Bottom right: calm, peaceful, content
  'low_energy_unpleasant'    -- Bottom left: sad, tired, depleted
);

-- =============================================================================
-- MOOD FEELINGS TABLE
-- Vocabulary of feelings for each quadrant (Joey-configurable)
-- =============================================================================

CREATE TABLE mood_feelings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  quadrant mood_quadrant NOT NULL,
  description TEXT, -- Optional description/explanation
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true
);

-- Index for active feelings by quadrant
CREATE INDEX idx_mood_feelings_quadrant ON mood_feelings(quadrant, sort_order) WHERE active = true;

-- =============================================================================
-- MOOD LOGS TABLE
-- Emily's mood check-in entries (visible only to Joey)
-- =============================================================================

CREATE TABLE mood_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Mood data
  quadrant mood_quadrant NOT NULL,
  feelings TEXT[] NOT NULL, -- 1-2 feelings selected
  intensity INTEGER CHECK (intensity BETWEEN 1 AND 5), -- Optional 1-5 scale

  -- Optional note
  note TEXT,

  -- Timestamp
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for user logs
CREATE INDEX idx_mood_logs_user ON mood_logs(user_id, logged_at DESC);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE mood_feelings ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_logs ENABLE ROW LEVEL SECURITY;

-- Mood feelings: everyone can read active, Joey can modify
CREATE POLICY "read_active_mood_feelings" ON mood_feelings
  FOR SELECT USING (active = true);

CREATE POLICY "joey_full_mood_feelings" ON mood_feelings
  FOR ALL USING (public.is_joey());

-- Mood logs: Joey can read all, Emily can INSERT only (not read history)
CREATE POLICY "joey_full_mood_logs" ON mood_logs
  FOR ALL USING (public.is_joey());

CREATE POLICY "emily_insert_mood" ON mood_logs
  FOR INSERT WITH CHECK (
    public.is_emily() AND user_id = auth.uid()
  );

-- Emily can read only today's entries (for cooldown/limit checking)
CREATE POLICY "emily_read_today_mood" ON mood_logs
  FOR SELECT USING (
    public.is_emily() AND
    user_id = auth.uid() AND
    logged_at >= CURRENT_DATE AND logged_at < CURRENT_DATE + INTERVAL '1 day'
  );

-- =============================================================================
-- SEED DEFAULT MOOD VOCABULARY
-- Based on "How We Feel" app categories
-- =============================================================================

-- High Energy Pleasant
INSERT INTO mood_feelings (name, quadrant, sort_order) VALUES
  ('Excited', 'high_energy_pleasant', 1),
  ('Joyful', 'high_energy_pleasant', 2),
  ('Energized', 'high_energy_pleasant', 3),
  ('Hopeful', 'high_energy_pleasant', 4),
  ('Optimistic', 'high_energy_pleasant', 5),
  ('Playful', 'high_energy_pleasant', 6),
  ('Proud', 'high_energy_pleasant', 7),
  ('Confident', 'high_energy_pleasant', 8);

-- High Energy Unpleasant
INSERT INTO mood_feelings (name, quadrant, sort_order) VALUES
  ('Anxious', 'high_energy_unpleasant', 1),
  ('Stressed', 'high_energy_unpleasant', 2),
  ('Angry', 'high_energy_unpleasant', 3),
  ('Frustrated', 'high_energy_unpleasant', 4),
  ('Overwhelmed', 'high_energy_unpleasant', 5),
  ('Irritated', 'high_energy_unpleasant', 6),
  ('Worried', 'high_energy_unpleasant', 7),
  ('Restless', 'high_energy_unpleasant', 8);

-- Low Energy Pleasant
INSERT INTO mood_feelings (name, quadrant, sort_order) VALUES
  ('Calm', 'low_energy_pleasant', 1),
  ('Peaceful', 'low_energy_pleasant', 2),
  ('Content', 'low_energy_pleasant', 3),
  ('Relaxed', 'low_energy_pleasant', 4),
  ('Grateful', 'low_energy_pleasant', 5),
  ('Cozy', 'low_energy_pleasant', 6),
  ('Satisfied', 'low_energy_pleasant', 7),
  ('Thoughtful', 'low_energy_pleasant', 8);

-- Low Energy Unpleasant
INSERT INTO mood_feelings (name, quadrant, sort_order) VALUES
  ('Sad', 'low_energy_unpleasant', 1),
  ('Tired', 'low_energy_unpleasant', 2),
  ('Depleted', 'low_energy_unpleasant', 3),
  ('Lonely', 'low_energy_unpleasant', 4),
  ('Disconnected', 'low_energy_unpleasant', 5),
  ('Hopeless', 'low_energy_unpleasant', 6),
  ('Numb', 'low_energy_unpleasant', 7),
  ('Bored', 'low_energy_unpleasant', 8);
