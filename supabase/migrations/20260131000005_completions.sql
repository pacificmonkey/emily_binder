-- Migration 005: Completions
-- Emily Mission Log

-- =============================================================================
-- MISSION COMPLETIONS TABLE
-- Tracks when missions are completed (one entry per mission per day)
-- =============================================================================

CREATE TABLE mission_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  completion_date DATE NOT NULL,
  completed_by_user_id UUID NOT NULL REFERENCES profiles(id),
  vp_awarded INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Unique constraint: one completion per mission per day
  UNIQUE(mission_id, completion_date)
);

-- Indexes
CREATE INDEX idx_mission_completions_mission ON mission_completions(mission_id);
CREATE INDEX idx_mission_completions_date ON mission_completions(completion_date);
CREATE INDEX idx_mission_completions_user_date ON mission_completions(completed_by_user_id, completion_date);

-- =============================================================================
-- EVENT COMPLETIONS TABLE
-- Tracks when events are marked as attended/completed
-- =============================================================================

CREATE TABLE event_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  completed_by_user_id UUID NOT NULL REFERENCES profiles(id),
  vp_awarded INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Unique constraint: one completion per event
  UNIQUE(event_id)
);

-- Indexes
CREATE INDEX idx_event_completions_event ON event_completions(event_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE mission_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_completions ENABLE ROW LEVEL SECURITY;

-- Mission completions
CREATE POLICY "joey_full_mission_completions" ON mission_completions
  FOR ALL USING (public.is_joey());

-- Emily can read/insert completions for own missions
CREATE POLICY "emily_read_mission_completions" ON mission_completions
  FOR SELECT USING (
    public.is_emily() AND
    EXISTS (
      SELECT 1 FROM missions
      WHERE missions.id = mission_completions.mission_id
      AND missions.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "emily_insert_mission_completions" ON mission_completions
  FOR INSERT WITH CHECK (
    public.is_emily() AND
    completed_by_user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM missions
      WHERE missions.id = mission_completions.mission_id
      AND missions.owner_user_id = auth.uid()
    )
  );

-- Support can read completions for their Emily
CREATE POLICY "support_read_mission_completions" ON mission_completions
  FOR SELECT USING (
    public.get_user_role() = 'support' AND
    EXISTS (
      SELECT 1 FROM missions
      WHERE missions.id = mission_completions.mission_id
      AND public.is_support_of(missions.owner_user_id)
    )
  );

-- Event completions (similar pattern)
CREATE POLICY "joey_full_event_completions" ON event_completions
  FOR ALL USING (public.is_joey());

CREATE POLICY "emily_read_event_completions" ON event_completions
  FOR SELECT USING (
    public.is_emily() AND
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_completions.event_id
      AND events.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "emily_insert_event_completions" ON event_completions
  FOR INSERT WITH CHECK (
    public.is_emily() AND
    completed_by_user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_completions.event_id
      AND events.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "support_read_event_completions" ON event_completions
  FOR SELECT USING (
    public.get_user_role() = 'support' AND
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_completions.event_id
      AND public.is_support_of(events.owner_user_id)
    )
  );
