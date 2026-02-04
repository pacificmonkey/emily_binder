-- Migration 004: Events
-- Emily Mission Log

-- =============================================================================
-- EVENTS TABLE
-- Calendar events that also appear as tasks in Mission Log
-- =============================================================================

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_by_user_id UUID NOT NULL REFERENCES profiles(id),

  -- Event info
  title TEXT NOT NULL,
  description_md TEXT,
  location TEXT,

  -- Date/time
  event_date DATE NOT NULL,
  event_time TIME,
  end_time TIME,
  all_day BOOLEAN NOT NULL DEFAULT false,

  -- Settings
  is_mandatory BOOLEAN NOT NULL DEFAULT false,

  -- State
  archived BOOLEAN NOT NULL DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_events_owner_date ON events(owner_user_id, event_date)
  WHERE archived = false;
CREATE INDEX idx_events_date ON events(event_date)
  WHERE archived = false;

-- Trigger for updated_at
CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Joey: full access
CREATE POLICY "joey_full_events" ON events
  FOR ALL USING (public.is_joey());

-- Emily: full access to own events
CREATE POLICY "emily_own_events" ON events
  FOR ALL USING (
    public.is_emily() AND owner_user_id = auth.uid()
  );

-- Support: read events for their Emily
CREATE POLICY "support_read_events" ON events
  FOR SELECT USING (
    public.get_user_role() = 'support' AND
    public.is_support_of(owner_user_id)
  );

-- Support: create events for their Emily
CREATE POLICY "support_insert_events" ON events
  FOR INSERT WITH CHECK (
    public.get_user_role() = 'support' AND
    public.is_support_of(owner_user_id)
  );

-- Support: update/delete only events they created
CREATE POLICY "support_update_own_events" ON events
  FOR UPDATE USING (
    public.get_user_role() = 'support' AND
    created_by_user_id = auth.uid()
  );

CREATE POLICY "support_delete_own_events" ON events
  FOR DELETE USING (
    public.get_user_role() = 'support' AND
    created_by_user_id = auth.uid()
  );
