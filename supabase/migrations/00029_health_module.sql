-- Migration: 00029_health_module.sql
-- Description: Create Health module tables (Medication, Prescription, IntakeEvent, Inventory)
-- Schema Version: 1.3.0

-- =============================================================================
-- PROVIDER TABLE (for prescribers)
-- =============================================================================

CREATE TABLE IF NOT EXISTS provider (
  provider_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  specialty TEXT,
  phone TEXT,
  fax TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_provider_workspace ON provider(workspace_id);

ALTER TABLE provider ENABLE ROW LEVEL SECURITY;

CREATE POLICY provider_select ON provider
  FOR SELECT TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_membership
    WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY provider_insert ON provider
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM workspace_membership
    WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY provider_update ON provider
  FOR UPDATE TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_membership
    WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY provider_delete ON provider
  FOR DELETE TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_membership
    WHERE user_id = auth.uid() AND status = 'active'
  ));

-- =============================================================================
-- PHARMACY TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS pharmacy (
  pharmacy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  fax TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pharmacy_workspace ON pharmacy(workspace_id);

ALTER TABLE pharmacy ENABLE ROW LEVEL SECURITY;

CREATE POLICY pharmacy_select ON pharmacy
  FOR SELECT TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_membership
    WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY pharmacy_insert ON pharmacy
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM workspace_membership
    WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY pharmacy_update ON pharmacy
  FOR UPDATE TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_membership
    WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY pharmacy_delete ON pharmacy
  FOR DELETE TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_membership
    WHERE user_id = auth.uid() AND status = 'active'
  ));

-- =============================================================================
-- MEDICATION TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS medication (
  medication_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  generic_name TEXT,
  brand_name TEXT,
  strength_value NUMERIC,
  strength_unit medication_strength_unit NOT NULL DEFAULT 'mg',
  dosage_form dosage_form NOT NULL DEFAULT 'tablet',
  route route NOT NULL DEFAULT 'oral',
  notes TEXT,
  is_prn_capable BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medication_workspace ON medication(workspace_id);
CREATE INDEX IF NOT EXISTS idx_medication_display_name ON medication(display_name);

ALTER TABLE medication ENABLE ROW LEVEL SECURITY;

CREATE POLICY medication_select ON medication
  FOR SELECT TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_membership
    WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY medication_insert ON medication
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM workspace_membership
    WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY medication_update ON medication
  FOR UPDATE TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_membership
    WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY medication_delete ON medication
  FOR DELETE TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_membership
    WHERE user_id = auth.uid() AND status = 'active'
  ));

-- =============================================================================
-- PRESCRIPTION TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS prescription (
  prescription_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
  medication_id UUID NOT NULL REFERENCES medication(medication_id) ON DELETE CASCADE,
  status prescription_status NOT NULL DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  instructions_sig TEXT NOT NULL,
  indication TEXT,
  dose_quantity NUMERIC NOT NULL,
  dose_unit TEXT NOT NULL,
  frequency_type frequency_type NOT NULL DEFAULT 'scheduled',
  frequency_description TEXT, -- e.g., "twice daily", "every 8 hours"
  times_per_day INT,
  prn_reason TEXT,
  max_doses_per_day INT,
  with_food with_food DEFAULT 'none',
  prescriber_id UUID REFERENCES provider(provider_id),
  pharmacy_id UUID REFERENCES pharmacy(pharmacy_id),
  refills_total INT DEFAULT 0,
  refills_remaining INT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prescription_workspace ON prescription(workspace_id);
CREATE INDEX IF NOT EXISTS idx_prescription_patient ON prescription(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescription_medication ON prescription(medication_id);
CREATE INDEX IF NOT EXISTS idx_prescription_status ON prescription(status);

ALTER TABLE prescription ENABLE ROW LEVEL SECURITY;

CREATE POLICY prescription_select ON prescription
  FOR SELECT TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_membership
    WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY prescription_insert ON prescription
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM workspace_membership
    WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY prescription_update ON prescription
  FOR UPDATE TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_membership
    WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY prescription_delete ON prescription
  FOR DELETE TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_membership
    WHERE user_id = auth.uid() AND status = 'active'
  ));

-- =============================================================================
-- INTAKE EVENT TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS intake_event (
  intake_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
  prescription_id UUID NOT NULL REFERENCES prescription(prescription_id) ON DELETE CASCADE,
  scheduled_time TIMESTAMPTZ,
  taken_time TIMESTAMPTZ,
  status intake_status NOT NULL,
  dose_quantity NUMERIC NOT NULL,
  dose_unit TEXT NOT NULL,
  reason TEXT,
  side_effects TEXT,
  notes TEXT,
  recorded_by recorded_by NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intake_event_workspace ON intake_event(workspace_id);
CREATE INDEX IF NOT EXISTS idx_intake_event_patient ON intake_event(patient_id);
CREATE INDEX IF NOT EXISTS idx_intake_event_prescription ON intake_event(prescription_id);
CREATE INDEX IF NOT EXISTS idx_intake_event_taken_time ON intake_event(taken_time);
CREATE INDEX IF NOT EXISTS idx_intake_event_status ON intake_event(status);

ALTER TABLE intake_event ENABLE ROW LEVEL SECURITY;

CREATE POLICY intake_event_select ON intake_event
  FOR SELECT TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_membership
    WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY intake_event_insert ON intake_event
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM workspace_membership
    WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY intake_event_update ON intake_event
  FOR UPDATE TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_membership
    WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY intake_event_delete ON intake_event
  FOR DELETE TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_membership
    WHERE user_id = auth.uid() AND status = 'active'
  ));

-- =============================================================================
-- INVENTORY TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS inventory (
  inventory_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  prescription_id UUID NOT NULL REFERENCES prescription(prescription_id) ON DELETE CASCADE,
  current_on_hand NUMERIC NOT NULL DEFAULT 0,
  as_of TIMESTAMPTZ NOT NULL DEFAULT now(),
  source inventory_source NOT NULL DEFAULT 'manual_set',
  confidence inventory_confidence NOT NULL DEFAULT 'high',
  low_stock_threshold NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(prescription_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_workspace ON inventory(workspace_id);
CREATE INDEX IF NOT EXISTS idx_inventory_prescription ON inventory(prescription_id);

ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY inventory_select ON inventory
  FOR SELECT TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_membership
    WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY inventory_insert ON inventory
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM workspace_membership
    WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY inventory_update ON inventory
  FOR UPDATE TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_membership
    WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY inventory_delete ON inventory
  FOR DELETE TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_membership
    WHERE user_id = auth.uid() AND status = 'active'
  ));

-- =============================================================================
-- RPC FUNCTIONS
-- =============================================================================

-- Get active prescriptions with medication info
CREATE OR REPLACE FUNCTION get_prescriptions() RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_workspace_id UUID;
  v_patient_id UUID;
  v_prescriptions JSONB;
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
      'prescription_id', p.prescription_id,
      'medication_id', p.medication_id,
      'status', p.status,
      'instructions_sig', p.instructions_sig,
      'dose_quantity', p.dose_quantity,
      'dose_unit', p.dose_unit,
      'frequency_type', p.frequency_type,
      'frequency_description', p.frequency_description,
      'times_per_day', p.times_per_day,
      'with_food', p.with_food,
      'prn_reason', p.prn_reason,
      'notes', p.notes,
      'medication', jsonb_build_object(
        'medication_id', m.medication_id,
        'display_name', m.display_name,
        'generic_name', m.generic_name,
        'strength_value', m.strength_value,
        'strength_unit', m.strength_unit,
        'dosage_form', m.dosage_form,
        'route', m.route,
        'is_prn_capable', m.is_prn_capable
      ),
      'inventory', (
        SELECT jsonb_build_object(
          'current_on_hand', i.current_on_hand,
          'low_stock_threshold', i.low_stock_threshold,
          'confidence', i.confidence
        )
        FROM inventory i
        WHERE i.prescription_id = p.prescription_id
      )
    ) ORDER BY m.display_name
  ), '[]'::jsonb)
  INTO v_prescriptions
  FROM prescription p
  JOIN medication m ON m.medication_id = p.medication_id
  WHERE p.workspace_id = v_workspace_id
    AND p.patient_id = v_patient_id
    AND p.status = 'active';

  RETURN jsonb_build_object(
    'success', true,
    'prescriptions', v_prescriptions
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log medication intake
CREATE OR REPLACE FUNCTION log_intake(
  p_prescription_id UUID,
  p_status intake_status,
  p_taken_time TIMESTAMPTZ DEFAULT NULL,
  p_scheduled_time TIMESTAMPTZ DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_workspace_id UUID;
  v_patient_id UUID;
  v_prescription RECORD;
  v_intake_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get prescription details
  SELECT * INTO v_prescription
  FROM prescription
  WHERE prescription_id = p_prescription_id;

  IF v_prescription IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Prescription not found');
  END IF;

  v_workspace_id := v_prescription.workspace_id;
  v_patient_id := v_prescription.patient_id;

  -- Create intake event
  INSERT INTO intake_event (
    workspace_id,
    patient_id,
    prescription_id,
    scheduled_time,
    taken_time,
    status,
    dose_quantity,
    dose_unit,
    reason,
    notes,
    recorded_by
  ) VALUES (
    v_workspace_id,
    v_patient_id,
    p_prescription_id,
    p_scheduled_time,
    COALESCE(p_taken_time, now()),
    p_status,
    v_prescription.dose_quantity,
    v_prescription.dose_unit,
    p_reason,
    p_notes,
    'user'
  )
  RETURNING intake_event_id INTO v_intake_id;

  -- Update inventory if taken
  IF p_status = 'taken' THEN
    UPDATE inventory
    SET
      current_on_hand = GREATEST(0, current_on_hand - v_prescription.dose_quantity),
      as_of = now(),
      source = 'computed',
      updated_at = now()
    WHERE prescription_id = p_prescription_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'intake_event_id', v_intake_id
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create medication and prescription together (simplified)
CREATE OR REPLACE FUNCTION create_medication_prescription(
  p_display_name TEXT,
  p_strength_value NUMERIC DEFAULT NULL,
  p_strength_unit medication_strength_unit DEFAULT 'mg',
  p_dosage_form dosage_form DEFAULT 'tablet',
  p_route route DEFAULT 'oral',
  p_dose_quantity NUMERIC DEFAULT 1,
  p_dose_unit TEXT DEFAULT 'tablet',
  p_frequency_type frequency_type DEFAULT 'scheduled',
  p_frequency_description TEXT DEFAULT NULL,
  p_times_per_day INT DEFAULT NULL,
  p_instructions_sig TEXT DEFAULT NULL,
  p_with_food with_food DEFAULT 'none',
  p_is_prn BOOLEAN DEFAULT false,
  p_prn_reason TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_initial_inventory NUMERIC DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_workspace_id UUID;
  v_patient_id UUID;
  v_medication_id UUID;
  v_prescription_id UUID;
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

  -- Create medication
  INSERT INTO medication (
    workspace_id,
    display_name,
    strength_value,
    strength_unit,
    dosage_form,
    route,
    is_prn_capable,
    notes
  ) VALUES (
    v_workspace_id,
    p_display_name,
    p_strength_value,
    p_strength_unit,
    p_dosage_form,
    p_route,
    p_is_prn,
    p_notes
  )
  RETURNING medication_id INTO v_medication_id;

  -- Build instructions if not provided
  IF p_instructions_sig IS NULL THEN
    p_instructions_sig := 'Take ' || p_dose_quantity || ' ' || p_dose_unit ||
      CASE
        WHEN p_frequency_description IS NOT NULL THEN ' ' || p_frequency_description
        WHEN p_times_per_day IS NOT NULL THEN ' ' || p_times_per_day || ' time(s) per day'
        ELSE ''
      END;
  END IF;

  -- Create prescription
  INSERT INTO prescription (
    workspace_id,
    patient_id,
    medication_id,
    status,
    start_date,
    instructions_sig,
    dose_quantity,
    dose_unit,
    frequency_type,
    frequency_description,
    times_per_day,
    with_food,
    prn_reason,
    notes
  ) VALUES (
    v_workspace_id,
    v_patient_id,
    v_medication_id,
    'active',
    CURRENT_DATE,
    p_instructions_sig,
    p_dose_quantity,
    p_dose_unit,
    CASE WHEN p_is_prn THEN 'prn' ELSE p_frequency_type END,
    p_frequency_description,
    p_times_per_day,
    p_with_food,
    p_prn_reason,
    p_notes
  )
  RETURNING prescription_id INTO v_prescription_id;

  -- Create inventory if initial amount provided
  IF p_initial_inventory IS NOT NULL AND p_initial_inventory > 0 THEN
    INSERT INTO inventory (
      workspace_id,
      prescription_id,
      current_on_hand,
      source,
      confidence
    ) VALUES (
      v_workspace_id,
      v_prescription_id,
      p_initial_inventory,
      'manual_set',
      'high'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'medication_id', v_medication_id,
    'prescription_id', v_prescription_id
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get today's intake history
CREATE OR REPLACE FUNCTION get_todays_intakes() RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_workspace_id UUID;
  v_patient_id UUID;
  v_intakes JSONB;
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
      'intake_event_id', ie.intake_event_id,
      'prescription_id', ie.prescription_id,
      'taken_time', ie.taken_time,
      'status', ie.status,
      'dose_quantity', ie.dose_quantity,
      'dose_unit', ie.dose_unit,
      'notes', ie.notes,
      'medication_name', m.display_name
    ) ORDER BY ie.taken_time DESC
  ), '[]'::jsonb)
  INTO v_intakes
  FROM intake_event ie
  JOIN prescription p ON p.prescription_id = ie.prescription_id
  JOIN medication m ON m.medication_id = p.medication_id
  WHERE ie.workspace_id = v_workspace_id
    AND ie.patient_id = v_patient_id
    AND ie.taken_time >= CURRENT_DATE
    AND ie.taken_time < CURRENT_DATE + INTERVAL '1 day';

  RETURN jsonb_build_object(
    'success', true,
    'intakes', v_intakes
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
GRANT EXECUTE ON FUNCTION get_prescriptions() TO authenticated;
GRANT EXECUTE ON FUNCTION log_intake(UUID, intake_status, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_medication_prescription(TEXT, NUMERIC, medication_strength_unit, dosage_form, route, NUMERIC, TEXT, frequency_type, TEXT, INT, TEXT, with_food, BOOLEAN, TEXT, TEXT, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION get_todays_intakes() TO authenticated;

-- Apply audit triggers
SELECT create_audit_trigger('medication');
SELECT create_audit_trigger('prescription');
SELECT create_audit_trigger('intake_event');
SELECT create_audit_trigger('inventory');
SELECT create_audit_trigger('provider');
SELECT create_audit_trigger('pharmacy');
