-- Migration: 00030_wellbeing_module.sql
-- Description: Create Wellbeing module tables (SymptomEntry, ProviderDiscussionItem)
-- Schema Version: 1.3.0

-- =============================================================================
-- SYMPTOM ENTRY TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS symptom_entry (
  symptom_entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
  domain symptom_domain NOT NULL,
  label TEXT NOT NULL,
  severity symptom_severity_scale NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT CHECK (duration_minutes IS NULL OR duration_minutes >= 0),
  possible_trigger TEXT,
  what_helped TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_symptom_entry_workspace ON symptom_entry(workspace_id);
CREATE INDEX IF NOT EXISTS idx_symptom_entry_patient ON symptom_entry(patient_id);
CREATE INDEX IF NOT EXISTS idx_symptom_entry_occurred_at ON symptom_entry(occurred_at);
CREATE INDEX IF NOT EXISTS idx_symptom_entry_domain ON symptom_entry(domain);

ALTER TABLE symptom_entry ENABLE ROW LEVEL SECURITY;

CREATE POLICY symptom_entry_select ON symptom_entry
  FOR SELECT TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_membership
    WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY symptom_entry_insert ON symptom_entry
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM workspace_membership
    WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY symptom_entry_update ON symptom_entry
  FOR UPDATE TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_membership
    WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY symptom_entry_delete ON symptom_entry
  FOR DELETE TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_membership
    WHERE user_id = auth.uid() AND status = 'active'
  ));

-- =============================================================================
-- PROVIDER DISCUSSION ITEM TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS provider_discussion_item (
  discussion_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  details TEXT,
  status discussion_item_status NOT NULL DEFAULT 'open',
  linked_provider_id UUID REFERENCES provider(provider_id) ON DELETE SET NULL,
  linked_prescription_id UUID REFERENCES prescription(prescription_id) ON DELETE SET NULL,
  linked_symptom_entry_id UUID REFERENCES symptom_entry(symptom_entry_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_discussion_item_workspace ON provider_discussion_item(workspace_id);
CREATE INDEX IF NOT EXISTS idx_discussion_item_patient ON provider_discussion_item(patient_id);
CREATE INDEX IF NOT EXISTS idx_discussion_item_status ON provider_discussion_item(status);
CREATE INDEX IF NOT EXISTS idx_discussion_item_provider ON provider_discussion_item(linked_provider_id);

ALTER TABLE provider_discussion_item ENABLE ROW LEVEL SECURITY;

CREATE POLICY discussion_item_select ON provider_discussion_item
  FOR SELECT TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_membership
    WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY discussion_item_insert ON provider_discussion_item
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM workspace_membership
    WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY discussion_item_update ON provider_discussion_item
  FOR UPDATE TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_membership
    WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY discussion_item_delete ON provider_discussion_item
  FOR DELETE TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_membership
    WHERE user_id = auth.uid() AND status = 'active'
  ));

-- =============================================================================
-- RPC FUNCTIONS
-- =============================================================================

-- Create symptom entry
CREATE OR REPLACE FUNCTION create_symptom_entry(
  p_domain symptom_domain,
  p_label TEXT,
  p_severity symptom_severity_scale,
  p_occurred_at TIMESTAMPTZ DEFAULT NULL,
  p_duration_minutes INT DEFAULT NULL,
  p_possible_trigger TEXT DEFAULT NULL,
  p_what_helped TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_workspace_id UUID;
  v_patient_id UUID;
  v_entry_id UUID;
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

  INSERT INTO symptom_entry (
    workspace_id,
    patient_id,
    domain,
    label,
    severity,
    occurred_at,
    duration_minutes,
    possible_trigger,
    what_helped,
    notes
  ) VALUES (
    v_workspace_id,
    v_patient_id,
    p_domain,
    p_label,
    p_severity,
    COALESCE(p_occurred_at, now()),
    p_duration_minutes,
    p_possible_trigger,
    p_what_helped,
    p_notes
  )
  RETURNING symptom_entry_id INTO v_entry_id;

  RETURN jsonb_build_object(
    'success', true,
    'symptom_entry_id', v_entry_id
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get symptom entries
CREATE OR REPLACE FUNCTION get_symptom_entries(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_domain symptom_domain DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_workspace_id UUID;
  v_patient_id UUID;
  v_entries JSONB;
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
      'symptom_entry_id', se.symptom_entry_id,
      'domain', se.domain,
      'label', se.label,
      'severity', se.severity,
      'occurred_at', se.occurred_at,
      'duration_minutes', se.duration_minutes,
      'possible_trigger', se.possible_trigger,
      'what_helped', se.what_helped,
      'notes', se.notes,
      'created_at', se.created_at
    ) ORDER BY se.occurred_at DESC
  ), '[]'::jsonb)
  INTO v_entries
  FROM symptom_entry se
  WHERE se.workspace_id = v_workspace_id
    AND se.patient_id = v_patient_id
    AND (p_start_date IS NULL OR se.occurred_at >= p_start_date)
    AND (p_end_date IS NULL OR se.occurred_at <= p_end_date)
    AND (p_domain IS NULL OR se.domain = p_domain);

  RETURN jsonb_build_object(
    'success', true,
    'entries', v_entries
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create discussion item
CREATE OR REPLACE FUNCTION create_discussion_item(
  p_title TEXT,
  p_details TEXT DEFAULT NULL,
  p_linked_provider_id UUID DEFAULT NULL,
  p_linked_prescription_id UUID DEFAULT NULL,
  p_linked_symptom_entry_id UUID DEFAULT NULL
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
    linked_symptom_entry_id
  ) VALUES (
    v_workspace_id,
    v_patient_id,
    p_title,
    p_details,
    'open',
    p_linked_provider_id,
    p_linked_prescription_id,
    p_linked_symptom_entry_id
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

-- Get discussion items
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
      'provider_name', p.name,
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

-- Update discussion item status
CREATE OR REPLACE FUNCTION update_discussion_item_status(
  p_discussion_item_id UUID,
  p_status discussion_item_status
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  UPDATE provider_discussion_item
  SET
    status = p_status,
    updated_at = now()
  WHERE discussion_item_id = p_discussion_item_id
    AND workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = v_user_id AND status = 'active'
    );

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Discussion item not found or access denied');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'discussion_item_id', p_discussion_item_id
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Delete symptom entry
CREATE OR REPLACE FUNCTION delete_symptom_entry(
  p_symptom_entry_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  DELETE FROM symptom_entry
  WHERE symptom_entry_id = p_symptom_entry_id
    AND workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = v_user_id AND status = 'active'
    );

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Symptom entry not found or access denied');
  END IF;

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Delete discussion item
CREATE OR REPLACE FUNCTION delete_discussion_item(
  p_discussion_item_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  DELETE FROM provider_discussion_item
  WHERE discussion_item_id = p_discussion_item_id
    AND workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = v_user_id AND status = 'active'
    );

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Discussion item not found or access denied');
  END IF;

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_symptom_entry(symptom_domain, TEXT, symptom_severity_scale, TIMESTAMPTZ, INT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_symptom_entries(TIMESTAMPTZ, TIMESTAMPTZ, symptom_domain) TO authenticated;
GRANT EXECUTE ON FUNCTION create_discussion_item(TEXT, TEXT, UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_discussion_items(discussion_item_status, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_discussion_item_status(UUID, discussion_item_status) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_symptom_entry(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_discussion_item(UUID) TO authenticated;

-- Apply audit triggers
SELECT create_audit_trigger('symptom_entry');
SELECT create_audit_trigger('provider_discussion_item');
