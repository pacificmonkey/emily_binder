-- Migration: 00054_discussion_event_link.sql
-- Description: Add linked_event_id column to provider_discussion_item table
-- and update create/get RPC functions to support it

-- Add column
ALTER TABLE provider_discussion_item
  ADD COLUMN IF NOT EXISTS linked_event_id UUID REFERENCES event(event_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_discussion_item_event ON provider_discussion_item(linked_event_id);

-- Update create_discussion_item to accept linked_event_id
CREATE OR REPLACE FUNCTION create_discussion_item(
  p_title TEXT,
  p_details TEXT DEFAULT NULL,
  p_linked_provider_id UUID DEFAULT NULL,
  p_linked_prescription_id UUID DEFAULT NULL,
  p_linked_symptom_entry_id UUID DEFAULT NULL,
  p_linked_event_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_workspace_id UUID;
  v_patient_id UUID;
  v_item_id UUID;
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

  INSERT INTO provider_discussion_item (
    workspace_id,
    patient_id,
    title,
    details,
    status,
    linked_provider_id,
    linked_prescription_id,
    linked_symptom_entry_id,
    linked_event_id
  ) VALUES (
    v_workspace_id,
    v_patient_id,
    p_title,
    p_details,
    'open',
    p_linked_provider_id,
    p_linked_prescription_id,
    p_linked_symptom_entry_id,
    p_linked_event_id
  )
  RETURNING discussion_item_id INTO v_item_id;

  RETURN jsonb_build_object(
    'success', true,
    'discussion_item_id', v_item_id
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_discussion_items to return linked_event_id and event title
CREATE OR REPLACE FUNCTION get_discussion_items(
  p_status discussion_item_status DEFAULT NULL,
  p_provider_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_workspace_id UUID;
  v_patient_id UUID;
  v_items JSONB;
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
      'discussion_item_id', di.discussion_item_id,
      'title', di.title,
      'details', di.details,
      'status', di.status,
      'linked_provider_id', di.linked_provider_id,
      'linked_prescription_id', di.linked_prescription_id,
      'linked_symptom_entry_id', di.linked_symptom_entry_id,
      'linked_event_id', di.linked_event_id,
      'provider_name', p.name,
      'event_title', e.title,
      'event_starts_at', e.starts_at,
      'created_at', di.created_at,
      'updated_at', di.updated_at
    ) ORDER BY
      CASE di.status
        WHEN 'open' THEN 0
        WHEN 'discussed' THEN 1
        WHEN 'resolved' THEN 2
        ELSE 3
      END,
      di.created_at DESC
  ), '[]'::jsonb)
  INTO v_items
  FROM provider_discussion_item di
  LEFT JOIN provider p ON p.provider_id = di.linked_provider_id
  LEFT JOIN event e ON e.event_id = di.linked_event_id
  WHERE di.workspace_id = v_workspace_id
    AND di.patient_id = v_patient_id
    AND (p_status IS NULL OR di.status = p_status)
    AND (p_provider_id IS NULL OR di.linked_provider_id = p_provider_id);

  RETURN jsonb_build_object(
    'success', true,
    'items', v_items
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-grant with new signature
GRANT EXECUTE ON FUNCTION create_discussion_item(TEXT, TEXT, UUID, UUID, UUID, UUID) TO authenticated;
