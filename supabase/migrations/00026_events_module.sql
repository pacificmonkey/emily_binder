-- Migration: 00026_events_module.sql
-- Description: Create Event table, RLS policies, and RPC functions
-- Schema Version: 1.3.0

-- =============================================================================
-- EVENT TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS event (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
  type event_type NOT NULL DEFAULT 'other',
  title TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles',
  location TEXT,
  status event_status NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_by_user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_event_workspace ON event(workspace_id);
CREATE INDEX IF NOT EXISTS idx_event_patient ON event(patient_id);
CREATE INDEX IF NOT EXISTS idx_event_starts_at ON event(starts_at);
CREATE INDEX IF NOT EXISTS idx_event_status ON event(status);
CREATE INDEX IF NOT EXISTS idx_event_patient_starts ON event(patient_id, starts_at);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_event_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER event_updated_at
  BEFORE UPDATE ON event
  FOR EACH ROW
  EXECUTE FUNCTION update_event_updated_at();

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE event ENABLE ROW LEVEL SECURITY;

-- Users can view events in their workspace
CREATE POLICY event_select ON event
  FOR SELECT TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Users can insert events in their workspace
CREATE POLICY event_insert ON event
  FOR INSERT TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Users can update events in their workspace
CREATE POLICY event_update ON event
  FOR UPDATE TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Users can delete events in their workspace
CREATE POLICY event_delete ON event
  FOR DELETE TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- =============================================================================
-- AUDIT TRIGGER
-- =============================================================================

CREATE OR REPLACE FUNCTION audit_event_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_action audit_action;
  v_old_data JSONB;
  v_new_data JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_new_data := to_jsonb(NEW);
    INSERT INTO audit_event (
      workspace_id, actor_user_id, object_type, object_id, action, new_data, occurred_at
    ) VALUES (
      NEW.workspace_id, auth.uid(), 'event', NEW.event_id, v_action, v_new_data, now()
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
    INSERT INTO audit_event (
      workspace_id, actor_user_id, object_type, object_id, action, old_data, new_data, occurred_at
    ) VALUES (
      NEW.workspace_id, auth.uid(), 'event', NEW.event_id, v_action, v_old_data, v_new_data, now()
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_old_data := to_jsonb(OLD);
    INSERT INTO audit_event (
      workspace_id, actor_user_id, object_type, object_id, action, old_data, occurred_at
    ) VALUES (
      OLD.workspace_id, auth.uid(), 'event', OLD.event_id, v_action, v_old_data, now()
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER event_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON event
  FOR EACH ROW
  EXECUTE FUNCTION audit_event_changes();

-- =============================================================================
-- RPC FUNCTIONS
-- =============================================================================

-- Create event
CREATE OR REPLACE FUNCTION create_event(
  p_title TEXT,
  p_type event_type DEFAULT 'other',
  p_starts_at TIMESTAMPTZ DEFAULT NULL,
  p_ends_at TIMESTAMPTZ DEFAULT NULL,
  p_timezone TEXT DEFAULT 'America/Los_Angeles',
  p_location TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_workspace_id UUID;
  v_patient_id UUID;
  v_event_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get user context
  SELECT wm.workspace_id INTO v_workspace_id
  FROM workspace_membership wm
  WHERE wm.user_id = v_user_id AND wm.status = 'active'
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace membership');
  END IF;

  SELECT patient_id INTO v_patient_id
  FROM patient_profile
  WHERE workspace_id = v_workspace_id
  LIMIT 1;

  IF v_patient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No patient profile found');
  END IF;

  -- Create the event
  INSERT INTO event (
    workspace_id,
    patient_id,
    type,
    title,
    starts_at,
    ends_at,
    timezone,
    location,
    notes,
    status,
    created_by_user_id
  ) VALUES (
    v_workspace_id,
    v_patient_id,
    p_type,
    p_title,
    COALESCE(p_starts_at, now()),
    p_ends_at,
    p_timezone,
    p_location,
    p_notes,
    'scheduled',
    v_user_id
  )
  RETURNING event_id INTO v_event_id;

  RETURN jsonb_build_object(
    'success', true,
    'event_id', v_event_id
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update event
CREATE OR REPLACE FUNCTION update_event(
  p_event_id UUID,
  p_title TEXT DEFAULT NULL,
  p_type event_type DEFAULT NULL,
  p_starts_at TIMESTAMPTZ DEFAULT NULL,
  p_ends_at TIMESTAMPTZ DEFAULT NULL,
  p_timezone TEXT DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_status event_status DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_event RECORD;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check event exists and user has access
  SELECT * INTO v_event FROM event WHERE event_id = p_event_id;

  IF v_event IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Event not found');
  END IF;

  -- Update the event with provided values
  UPDATE event SET
    title = COALESCE(p_title, title),
    type = COALESCE(p_type, type),
    starts_at = COALESCE(p_starts_at, starts_at),
    ends_at = COALESCE(p_ends_at, ends_at),
    timezone = COALESCE(p_timezone, timezone),
    location = COALESCE(p_location, location),
    notes = COALESCE(p_notes, notes),
    status = COALESCE(p_status, status)
  WHERE event_id = p_event_id;

  RETURN jsonb_build_object(
    'success', true,
    'event_id', p_event_id
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Delete event
CREATE OR REPLACE FUNCTION delete_event(
  p_event_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_event RECORD;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check event exists
  SELECT * INTO v_event FROM event WHERE event_id = p_event_id;

  IF v_event IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Event not found');
  END IF;

  -- Delete the event
  DELETE FROM event WHERE event_id = p_event_id;

  RETURN jsonb_build_object(
    'success', true,
    'event_id', p_event_id
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get events for a date range
CREATE OR REPLACE FUNCTION get_events(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_workspace_id UUID;
  v_patient_id UUID;
  v_events JSONB;
  v_start TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get user context
  SELECT wm.workspace_id INTO v_workspace_id
  FROM workspace_membership wm
  WHERE wm.user_id = v_user_id AND wm.status = 'active'
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace membership');
  END IF;

  SELECT patient_id INTO v_patient_id
  FROM patient_profile
  WHERE workspace_id = v_workspace_id
  LIMIT 1;

  IF v_patient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No patient profile found');
  END IF;

  -- Set date range (default to current month if not provided)
  v_start := COALESCE(p_start_date, date_trunc('month', CURRENT_DATE))::TIMESTAMPTZ;
  v_end := COALESCE(p_end_date, (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day'))::TIMESTAMPTZ + INTERVAL '1 day' - INTERVAL '1 second';

  -- Get events in range
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'event_id', e.event_id,
      'type', e.type,
      'title', e.title,
      'starts_at', e.starts_at,
      'ends_at', e.ends_at,
      'timezone', e.timezone,
      'location', e.location,
      'status', e.status,
      'notes', e.notes,
      'created_at', e.created_at
    ) ORDER BY e.starts_at
  ), '[]'::jsonb)
  INTO v_events
  FROM event e
  WHERE e.workspace_id = v_workspace_id
    AND e.patient_id = v_patient_id
    AND e.starts_at >= v_start
    AND e.starts_at <= v_end;

  RETURN jsonb_build_object(
    'success', true,
    'events', v_events
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get today's events
CREATE OR REPLACE FUNCTION get_todays_events() RETURNS JSONB AS $$
BEGIN
  RETURN get_events(CURRENT_DATE, CURRENT_DATE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_event(TEXT, event_type, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_event(UUID, TEXT, event_type, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, event_status) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_event(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_events(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_todays_events() TO authenticated;
