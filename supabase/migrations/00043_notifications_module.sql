-- ============================================================================
-- Migration: 00043_notifications_module.sql
-- Description: Unified notification system for reminders, alerts, and info
-- ============================================================================

-- ============================================================================
-- 1. Notification Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification (
  notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  channel notification_channel NOT NULL DEFAULT 'in_app',
  status notification_status NOT NULL DEFAULT 'scheduled',
  scheduled_for TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  snooze_until TIMESTAMPTZ,
  quiet_hours JSONB,
  link_type TEXT,
  link_id UUID,
  payload JSONB,
  created_by_user_id UUID REFERENCES "user"(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_notification_patient ON notification(patient_id);
CREATE INDEX IF NOT EXISTS idx_notification_status ON notification(status);
CREATE INDEX IF NOT EXISTS idx_notification_scheduled ON notification(scheduled_for) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_notification_patient_unread ON notification(patient_id)
  WHERE status IN ('scheduled', 'delivered');

-- ============================================================================
-- 2. RLS Policies
-- ============================================================================

ALTER TABLE notification ENABLE ROW LEVEL SECURITY;

-- Patients can view their own notifications
DROP POLICY IF EXISTS "notification_select_own" ON notification;
CREATE POLICY "notification_select_own" ON notification
  FOR SELECT TO authenticated
  USING (
    -- Patient can see their own (patient_id = user_id in patient_profile)
    patient_id = auth.uid()
    OR
    -- Admin can view all in their workspace
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND role_key = 'admin' AND status = 'active'
    )
  );

-- Patients can update their own notifications (dismiss, acknowledge, snooze)
DROP POLICY IF EXISTS "notification_update_own" ON notification;
CREATE POLICY "notification_update_own" ON notification
  FOR UPDATE TO authenticated
  USING (
    patient_id = auth.uid()
    OR
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND role_key = 'admin' AND status = 'active'
    )
  );

-- Only admins or system can create notifications
DROP POLICY IF EXISTS "notification_insert" ON notification;
CREATE POLICY "notification_insert" ON notification
  FOR INSERT TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND role_key = 'admin' AND status = 'active'
    )
    OR
    -- Allow patient to create their own custom notifications (reminders)
    (
      patient_id = auth.uid()
      AND type IN ('reminder', 'custom')
    )
  );

-- ============================================================================
-- 3. Helper Functions
-- ============================================================================

-- Get notifications for current user (or impersonated patient)
CREATE OR REPLACE FUNCTION get_notifications(
  p_limit INTEGER DEFAULT 50,
  p_include_dismissed BOOLEAN DEFAULT false
)
RETURNS TABLE (
  notification_id UUID,
  type notification_type,
  title TEXT,
  body TEXT,
  channel notification_channel,
  status notification_status,
  scheduled_for TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  snooze_until TIMESTAMPTZ,
  link_type TEXT,
  link_id UUID,
  payload JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id UUID;
BEGIN
  v_patient_id := get_effective_patient_id();

  IF v_patient_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    n.notification_id,
    n.type,
    n.title,
    n.body,
    n.channel,
    n.status,
    n.scheduled_for,
    n.delivered_at,
    n.acknowledged_at,
    n.snooze_until,
    n.link_type,
    n.link_id,
    n.payload,
    n.created_at
  FROM notification n
  WHERE n.patient_id = v_patient_id
    AND (
      p_include_dismissed = true
      OR n.status NOT IN ('dismissed', 'acknowledged')
    )
    AND (n.snooze_until IS NULL OR n.snooze_until <= now())
  ORDER BY
    CASE WHEN n.status = 'scheduled' AND n.scheduled_for <= now() THEN 0 ELSE 1 END,
    n.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Get unread notification count
CREATE OR REPLACE FUNCTION get_notification_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id UUID;
  v_count INTEGER;
BEGIN
  v_patient_id := get_effective_patient_id();

  IF v_patient_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT COUNT(*)::INTEGER INTO v_count
  FROM notification
  WHERE patient_id = v_patient_id
    AND status IN ('scheduled', 'delivered')
    AND (snooze_until IS NULL OR snooze_until <= now());

  RETURN v_count;
END;
$$;

-- Dismiss a notification
CREATE OR REPLACE FUNCTION dismiss_notification(p_notification_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id UUID;
BEGIN
  v_patient_id := get_effective_patient_id();

  IF v_patient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active patient');
  END IF;

  UPDATE notification
  SET status = 'dismissed', updated_at = now()
  WHERE notification_id = p_notification_id
    AND patient_id = v_patient_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Notification not found');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Acknowledge a notification
CREATE OR REPLACE FUNCTION acknowledge_notification(p_notification_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id UUID;
BEGIN
  v_patient_id := get_effective_patient_id();

  IF v_patient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active patient');
  END IF;

  UPDATE notification
  SET
    status = 'acknowledged',
    acknowledged_at = now(),
    updated_at = now()
  WHERE notification_id = p_notification_id
    AND patient_id = v_patient_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Notification not found');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Snooze a notification
CREATE OR REPLACE FUNCTION snooze_notification(
  p_notification_id UUID,
  p_snooze_minutes INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id UUID;
  v_snooze_until TIMESTAMPTZ;
BEGIN
  v_patient_id := get_effective_patient_id();

  IF v_patient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active patient');
  END IF;

  v_snooze_until := now() + (p_snooze_minutes || ' minutes')::INTERVAL;

  UPDATE notification
  SET
    snooze_until = v_snooze_until,
    updated_at = now()
  WHERE notification_id = p_notification_id
    AND patient_id = v_patient_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Notification not found');
  END IF;

  RETURN jsonb_build_object('success', true, 'snooze_until', v_snooze_until);
END;
$$;

-- Create a custom notification/reminder
CREATE OR REPLACE FUNCTION create_notification(
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_type notification_type DEFAULT 'reminder',
  p_scheduled_for TIMESTAMPTZ DEFAULT NULL,
  p_link_type TEXT DEFAULT NULL,
  p_link_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id UUID;
  v_workspace_id UUID;
  v_notification_id UUID;
BEGIN
  v_patient_id := get_effective_patient_id();
  v_workspace_id := get_effective_workspace_id();

  IF v_patient_id IS NULL OR v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active patient');
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
    created_by_user_id
  )
  VALUES (
    v_workspace_id,
    v_patient_id,
    p_type,
    p_title,
    p_body,
    'in_app',
    CASE WHEN p_scheduled_for IS NOT NULL AND p_scheduled_for > now()
         THEN 'scheduled'::notification_status
         ELSE 'delivered'::notification_status
    END,
    p_scheduled_for,
    p_link_type,
    p_link_id,
    auth.uid()
  )
  RETURNING notification_id INTO v_notification_id;

  RETURN jsonb_build_object(
    'success', true,
    'notification_id', v_notification_id
  );
END;
$$;

-- Dismiss all notifications
CREATE OR REPLACE FUNCTION dismiss_all_notifications()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id UUID;
  v_count INTEGER;
BEGIN
  v_patient_id := get_effective_patient_id();

  IF v_patient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active patient');
  END IF;

  WITH updated AS (
    UPDATE notification
    SET status = 'dismissed', updated_at = now()
    WHERE patient_id = v_patient_id
      AND status IN ('scheduled', 'delivered')
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_count FROM updated;

  RETURN jsonb_build_object('success', true, 'dismissed_count', v_count);
END;
$$;

-- ============================================================================
-- 4. Audit Trigger
-- ============================================================================

DROP TRIGGER IF EXISTS notification_audit_trigger ON notification;
CREATE TRIGGER notification_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON notification
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
