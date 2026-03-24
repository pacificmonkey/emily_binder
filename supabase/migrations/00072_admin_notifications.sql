-- Migration: 00072_admin_notifications.sql
-- Description: Admin RPC to send notification to a specific patient via impersonation

-- Admin: Send notification to impersonated patient
CREATE OR REPLACE FUNCTION admin_create_notification(
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_type TEXT DEFAULT 'info'
)
RETURNS JSONB AS $$
DECLARE
  v_patient_id UUID;
  v_workspace_id UUID;
  v_user_id UUID;
  v_notification_id UUID;
BEGIN
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;

  v_patient_id := get_effective_patient_id();
  IF v_patient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Must be impersonating a patient to send notifications');
  END IF;

  -- Get workspace and user_id for the patient
  SELECT pp.workspace_id, wm.user_id
  INTO v_workspace_id, v_user_id
  FROM patient_profile pp
  JOIN workspace_membership wm ON wm.workspace_id = pp.workspace_id AND wm.status = 'active'
  WHERE pp.patient_id = v_patient_id
  AND wm.user_id = (
    SELECT wm2.user_id FROM workspace_membership wm2
    WHERE wm2.workspace_id = pp.workspace_id AND wm2.status = 'active'
    AND EXISTS (SELECT 1 FROM patient_profile pp2 WHERE pp2.patient_id = v_patient_id AND pp2.workspace_id = wm2.workspace_id)
    LIMIT 1
  )
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Patient workspace not found');
  END IF;

  INSERT INTO notification (
    workspace_id,
    patient_id,
    type,
    title,
    body,
    channel,
    status,
    created_by_user_id
  ) VALUES (
    v_workspace_id,
    v_patient_id,
    p_type::notification_type,
    p_title,
    p_body,
    'in_app',
    'delivered',
    auth.uid()
  )
  RETURNING notification_id INTO v_notification_id;

  RETURN jsonb_build_object(
    'success', true,
    'notification_id', v_notification_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION admin_create_notification(TEXT, TEXT, TEXT) TO authenticated;
