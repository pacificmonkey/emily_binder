-- Migration 003: Missions
-- Emily Mission Log

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE mission_type AS ENUM ('one_time', 'recurring');
CREATE TYPE recurrence_pattern AS ENUM ('daily', 'weekly', 'specific_weekdays');
CREATE TYPE one_time_assignment AS ENUM ('day_assigned', 'week_assigned');

-- =============================================================================
-- MISSIONS TABLE
-- =============================================================================

CREATE TABLE missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_by_user_id UUID NOT NULL REFERENCES profiles(id),

  -- Basic info
  title TEXT NOT NULL,
  instructions_md TEXT,
  steps JSONB DEFAULT '[]'::jsonb,

  -- Category (determines VP and policy)
  category_id UUID NOT NULL REFERENCES categories(id),

  -- Mission type
  mission_type mission_type NOT NULL,

  -- One-time mission fields
  one_time_assignment one_time_assignment,
  due_date DATE,                    -- For day-assigned
  week_start_date DATE,             -- Monday of the week for week-assigned
  deadline DATE,                    -- Optional hard deadline

  -- Recurring mission fields
  recurrence_pattern recurrence_pattern,
  weekdays INTEGER[],               -- 0=Mon, 6=Sun for specific_weekdays

  -- State
  snoozed_until TIMESTAMPTZ,
  archived BOOLEAN NOT NULL DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT valid_one_time CHECK (
    mission_type != 'one_time' OR (
      one_time_assignment IS NOT NULL AND
      (one_time_assignment = 'day_assigned' AND due_date IS NOT NULL) OR
      (one_time_assignment = 'week_assigned' AND week_start_date IS NOT NULL)
    )
  ),
  CONSTRAINT valid_recurring CHECK (
    mission_type != 'recurring' OR recurrence_pattern IS NOT NULL
  ),
  CONSTRAINT valid_weekdays CHECK (
    recurrence_pattern != 'specific_weekdays' OR (
      weekdays IS NOT NULL AND array_length(weekdays, 1) > 0
    )
  )
);

-- Indexes
CREATE INDEX idx_missions_owner ON missions(owner_user_id) WHERE archived = false;
CREATE INDEX idx_missions_due_date ON missions(due_date)
  WHERE mission_type = 'one_time' AND archived = false;
CREATE INDEX idx_missions_week ON missions(week_start_date)
  WHERE mission_type = 'one_time' AND one_time_assignment = 'week_assigned' AND archived = false;
CREATE INDEX idx_missions_recurring ON missions(owner_user_id, recurrence_pattern)
  WHERE mission_type = 'recurring' AND archived = false;

-- Trigger for updated_at
CREATE TRIGGER missions_updated_at
  BEFORE UPDATE ON missions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE missions ENABLE ROW LEVEL SECURITY;

-- Joey: full access
CREATE POLICY "joey_full_missions" ON missions
  FOR ALL USING (public.is_joey());

-- Emily: full access to own missions
CREATE POLICY "emily_own_missions" ON missions
  FOR ALL USING (
    public.is_emily() AND owner_user_id = auth.uid()
  );

-- Support: read missions for their Emily
CREATE POLICY "support_read_missions" ON missions
  FOR SELECT USING (
    public.get_user_role() = 'support' AND
    public.is_support_of(owner_user_id)
  );

-- Support: insert one-time missions only
CREATE POLICY "support_insert_onetime" ON missions
  FOR INSERT WITH CHECK (
    public.get_user_role() = 'support' AND
    public.is_support_of(owner_user_id) AND
    mission_type = 'one_time'
  );
