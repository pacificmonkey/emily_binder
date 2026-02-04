-- Migration: 00027_transition_buffer_notification.sql
-- Description: Create TransitionBuffer and Notification tables with RLS
-- Schema Version: 1.3.0

-- =============================================================================
-- TRANSITION BUFFER TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS transition_buffer (
  transition_buffer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
  type transition_buffer_type NOT NULL DEFAULT 'before_event',
  title TEXT NOT NULL,
  minutes INT NOT NULL DEFAULT 30 CHECK (minutes >= 0),
  notes TEXT,
  applies_to JSONB, -- Rules for when this buffer applies (e.g., {"event_types": ["appointment", "therapy"]})
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transition_buffer_workspace ON transition_buffer(workspace_id);
CREATE INDEX IF NOT EXISTS idx_transition_buffer_patient ON transition_buffer(patient_id);
CREATE INDEX IF NOT EXISTS idx_transition_buffer_type ON transition_buffer(type);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_transition_buffer_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transition_buffer_updated_at
  BEFORE UPDATE ON transition_buffer
  FOR EACH ROW
  EXECUTE FUNCTION update_transition_buffer_updated_at();

-- RLS Policies
ALTER TABLE transition_buffer ENABLE ROW LEVEL SECURITY;

CREATE POLICY transition_buffer_select ON transition_buffer
  FOR SELECT TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY transition_buffer_insert ON transition_buffer
  FOR INSERT TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY transition_buffer_update ON transition_buffer
  FOR UPDATE TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY transition_buffer_delete ON transition_buffer
  FOR DELETE TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- =============================================================================
-- NOTIFICATION TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS notification (
  notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
  type notification_type NOT NULL DEFAULT 'reminder',
  title TEXT NOT NULL,
  body TEXT,
  channel notification_channel NOT NULL DEFAULT 'in_app',
  status notification_status NOT NULL DEFAULT 'scheduled',
  scheduled_for TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  snooze_until TIMESTAMPTZ,
  quiet_hours JSONB, -- e.g., {"start": "22:00", "end": "08:00"}
  link_type TEXT, -- 'event', 'task', 'prescription', etc.
  link_id UUID,
  payload JSONB, -- Extra data for the notification
  created_by_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_workspace ON notification(workspace_id);
CREATE INDEX IF NOT EXISTS idx_notification_patient ON notification(patient_id);
CREATE INDEX IF NOT EXISTS idx_notification_status ON notification(status);
CREATE INDEX IF NOT EXISTS idx_notification_scheduled ON notification(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notification_link ON notification(link_type, link_id);
CREATE INDEX IF NOT EXISTS idx_notification_patient_status ON notification(patient_id, status);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_notification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notification_updated_at
  BEFORE UPDATE ON notification
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_updated_at();

-- RLS Policies
ALTER TABLE notification ENABLE ROW LEVEL SECURITY;

CREATE POLICY notification_select ON notification
  FOR SELECT TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY notification_insert ON notification
  FOR INSERT TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY notification_update ON notification
  FOR UPDATE TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY notification_delete ON notification
  FOR DELETE TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- =============================================================================
-- NOTIFICATION FUNCTIONS
-- =============================================================================

-- Create a notification
CREATE OR REPLACE FUNCTION create_notification(
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_type notification_type DEFAULT 'reminder',
  p_channel notification_channel DEFAULT 'in_app',
  p_scheduled_for TIMESTAMPTZ DEFAULT NULL,
  p_link_type TEXT DEFAULT NULL,
  p_link_id UUID DEFAULT NULL,
  p_payload JSONB DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_workspace_id UUID;
  v_patient_id UUID;
  v_notification_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

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

  INSERT INTO notification (
    workspace_id,
    patient_id,
    type,
    title,
    body,
    channel,
    status,
    scheduled_for,
    link_type,
    link_id,
    payload,
    created_by_user_id
  ) VALUES (
    v_workspace_id,
    v_patient_id,
    p_type,
    p_title,
    p_body,
    p_channel,
    CASE WHEN p_scheduled_for IS NULL THEN 'delivered' ELSE 'scheduled' END,
    p_scheduled_for,
    p_link_type,
    p_link_id,
    p_payload,
    v_user_id
  )
  RETURNING notification_id INTO v_notification_id;

  RETURN jsonb_build_object(
    'success', true,
    'notification_id', v_notification_id
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Acknowledge a notification
CREATE OR REPLACE FUNCTION acknowledge_notification(
  p_notification_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  UPDATE notification
  SET
    status = 'acknowledged',
    acknowledged_at = now()
  WHERE notification_id = p_notification_id;

  RETURN jsonb_build_object(
    'success', true,
    'notification_id', p_notification_id
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dismiss a notification
CREATE OR REPLACE FUNCTION dismiss_notification(
  p_notification_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  UPDATE notification
  SET status = 'dismissed'
  WHERE notification_id = p_notification_id;

  RETURN jsonb_build_object(
    'success', true,
    'notification_id', p_notification_id
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Snooze a notification
CREATE OR REPLACE FUNCTION snooze_notification(
  p_notification_id UUID,
  p_snooze_minutes INT DEFAULT 15
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_snooze_until TIMESTAMPTZ;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  v_snooze_until := now() + (p_snooze_minutes || ' minutes')::INTERVAL;

  UPDATE notification
  SET
    snooze_until = v_snooze_until,
    status = 'scheduled',
    scheduled_for = v_snooze_until
  WHERE notification_id = p_notification_id;

  RETURN jsonb_build_object(
    'success', true,
    'notification_id', p_notification_id,
    'snooze_until', v_snooze_until
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get pending notifications
CREATE OR REPLACE FUNCTION get_pending_notifications() RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_workspace_id UUID;
  v_patient_id UUID;
  v_notifications JSONB;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

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

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'notification_id', n.notification_id,
      'type', n.type,
      'title', n.title,
      'body', n.body,
      'channel', n.channel,
      'status', n.status,
      'scheduled_for', n.scheduled_for,
      'link_type', n.link_type,
      'link_id', n.link_id,
      'payload', n.payload,
      'created_at', n.created_at
    ) ORDER BY n.scheduled_for, n.created_at
  ), '[]'::jsonb)
  INTO v_notifications
  FROM notification n
  WHERE n.workspace_id = v_workspace_id
    AND n.patient_id = v_patient_id
    AND n.status IN ('scheduled', 'delivered')
    AND (n.snooze_until IS NULL OR n.snooze_until <= now());

  RETURN jsonb_build_object(
    'success', true,
    'notifications', v_notifications
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_notification(TEXT, TEXT, notification_type, notification_channel, TIMESTAMPTZ, TEXT, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION acknowledge_notification(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION dismiss_notification(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION snooze_notification(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_notifications() TO authenticated;

-- =============================================================================
-- CREATE DEFAULT TRANSITION BUFFERS
-- =============================================================================

-- Create default buffers for existing patients
DO $$
DECLARE
  v_patient RECORD;
BEGIN
  FOR v_patient IN
    SELECT workspace_id, patient_id FROM patient_profile
  LOOP
    -- Default "Get Ready" buffer (before appointments/therapy)
    INSERT INTO transition_buffer (workspace_id, patient_id, type, title, minutes, applies_to, notes)
    VALUES (
      v_patient.workspace_id,
      v_patient.patient_id,
      'before_event',
      'Get Ready',
      30,
      '{"event_types": ["appointment", "therapy", "class", "work"]}'::jsonb,
      'Time to prepare and gather what you need'
    )
    ON CONFLICT DO NOTHING;

    -- Default "Wind Down" buffer (after social events)
    INSERT INTO transition_buffer (workspace_id, patient_id, type, title, minutes, applies_to, notes)
    VALUES (
      v_patient.workspace_id,
      v_patient.patient_id,
      'after_event',
      'Wind Down',
      15,
      '{"event_types": ["social", "class", "work"]}'::jsonb,
      'Time to decompress after the activity'
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;

-- Update onboarding to create default buffers for new users
CREATE OR REPLACE FUNCTION create_default_transition_buffers(
  p_workspace_id UUID,
  p_patient_id UUID
) RETURNS VOID AS $$
BEGIN
  -- Get Ready buffer
  INSERT INTO transition_buffer (workspace_id, patient_id, type, title, minutes, applies_to, notes)
  VALUES (
    p_workspace_id,
    p_patient_id,
    'before_event',
    'Get Ready',
    30,
    '{"event_types": ["appointment", "therapy", "class", "work"]}'::jsonb,
    'Time to prepare and gather what you need'
  );

  -- Wind Down buffer
  INSERT INTO transition_buffer (workspace_id, patient_id, type, title, minutes, applies_to, notes)
  VALUES (
    p_workspace_id,
    p_patient_id,
    'after_event',
    'Wind Down',
    15,
    '{"event_types": ["social", "class", "work"]}'::jsonb,
    'Time to decompress after the activity'
  );
END;
$$ LANGUAGE plpgsql;
