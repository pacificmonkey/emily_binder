-- Add recurrence support to events
-- A simple approach: store a recurrence_type on the event row and
-- let the client expand occurrences within the requested date range.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_recurrence_type') THEN
    CREATE TYPE event_recurrence_type AS ENUM ('none', 'daily', 'weekly', 'biweekly', 'monthly');
  END IF;
END $$;

ALTER TABLE event
  ADD COLUMN IF NOT EXISTS recurrence event_recurrence_type NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS recurrence_end_date date;

COMMENT ON COLUMN event.recurrence IS 'How often this event repeats (none = one-off)';
COMMENT ON COLUMN event.recurrence_end_date IS 'Optional end date for the recurrence series';

-- Update create_event to accept recurrence params
CREATE OR REPLACE FUNCTION create_event(
  p_title text,
  p_type event_type,
  p_starts_at timestamptz,
  p_ends_at timestamptz DEFAULT NULL,
  p_timezone text DEFAULT 'America/Los_Angeles',
  p_location text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_recurrence event_recurrence_type DEFAULT 'none',
  p_recurrence_end_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_workspace_id uuid;
  v_patient_id uuid;
  v_event_id uuid;
BEGIN
  SELECT wm.workspace_id INTO v_workspace_id
  FROM workspace_membership wm
  WHERE wm.user_id = auth.uid()
    AND wm.status = 'active'
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace');
  END IF;

  SELECT pp.patient_id INTO v_patient_id
  FROM patient_profile pp
  WHERE pp.workspace_id = v_workspace_id
  LIMIT 1;

  IF v_patient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No patient profile');
  END IF;

  INSERT INTO event (workspace_id, patient_id, type, title, starts_at, ends_at, timezone, location, notes, created_by_user_id, recurrence, recurrence_end_date)
  VALUES (v_workspace_id, v_patient_id, p_type, p_title, p_starts_at, p_ends_at, p_timezone, p_location, p_notes, auth.uid(), p_recurrence, p_recurrence_end_date)
  RETURNING event.event_id INTO v_event_id;

  RETURN jsonb_build_object('success', true, 'event_id', v_event_id);
END;
$fn$;
