-- ============================================================================
-- Migration: 00070_fix_impersonation_rpcs.sql
-- Description: Fix all RPC functions to use get_effective_patient_id() and
--              get_effective_workspace_id() instead of auth.uid() for patient/
--              workspace resolution. This enables admin impersonation to work
--              correctly across all modules.
-- ============================================================================

-- ============================================================================
-- 1. HEALTH MODULE: get_prescriptions
-- ============================================================================

CREATE OR REPLACE FUNCTION get_prescriptions() RETURNS JSONB AS $$
DECLARE
  v_workspace_id UUID;
  v_patient_id UUID;
  v_prescriptions JSONB;
BEGIN
  v_workspace_id := get_effective_workspace_id();
  v_patient_id := get_effective_patient_id();

  IF v_workspace_id IS NULL OR v_patient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace or patient');
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
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'detail', SQLSTATE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- 2. HEALTH MODULE: create_medication_prescription
-- ============================================================================

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

  v_workspace_id := get_effective_workspace_id();
  v_patient_id := get_effective_patient_id();

  IF v_workspace_id IS NULL OR v_patient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace or patient');
  END IF;

  -- Create medication
  INSERT INTO medication (
    workspace_id, display_name, strength_value, strength_unit,
    dosage_form, route, is_prn_capable, notes
  ) VALUES (
    v_workspace_id, p_display_name, p_strength_value, p_strength_unit,
    p_dosage_form, p_route, p_is_prn, p_notes
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
    workspace_id, patient_id, medication_id, status, start_date,
    instructions_sig, dose_quantity, dose_unit, frequency_type,
    frequency_description, times_per_day, with_food, prn_reason, notes
  ) VALUES (
    v_workspace_id, v_patient_id, v_medication_id, 'active', CURRENT_DATE,
    p_instructions_sig, p_dose_quantity, p_dose_unit,
    CASE WHEN p_is_prn THEN 'prn' ELSE p_frequency_type END,
    p_frequency_description, p_times_per_day, p_with_food, p_prn_reason, p_notes
  )
  RETURNING prescription_id INTO v_prescription_id;

  -- Create inventory if initial amount provided
  IF p_initial_inventory IS NOT NULL AND p_initial_inventory > 0 THEN
    INSERT INTO inventory (
      workspace_id, prescription_id, current_on_hand, source, confidence
    ) VALUES (
      v_workspace_id, v_prescription_id, p_initial_inventory, 'manual_set', 'high'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'medication_id', v_medication_id,
    'prescription_id', v_prescription_id
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'detail', SQLSTATE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- 3. HEALTH MODULE: get_todays_intakes
-- ============================================================================

CREATE OR REPLACE FUNCTION get_todays_intakes() RETURNS JSONB AS $$
DECLARE
  v_workspace_id UUID;
  v_patient_id UUID;
  v_intakes JSONB;
BEGIN
  v_workspace_id := get_effective_workspace_id();
  v_patient_id := get_effective_patient_id();

  IF v_workspace_id IS NULL OR v_patient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace or patient');
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

  RETURN jsonb_build_object('success', true, 'intakes', v_intakes);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'detail', SQLSTATE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- 4. EVENTS MODULE: get_events (also fixes get_todays_events via delegation)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_events(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_workspace_id UUID;
  v_patient_id UUID;
  v_events JSONB;
  v_start TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
BEGIN
  v_workspace_id := get_effective_workspace_id();
  v_patient_id := get_effective_patient_id();

  IF v_workspace_id IS NULL OR v_patient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace or patient');
  END IF;

  v_start := COALESCE(p_start_date, date_trunc('month', CURRENT_DATE))::TIMESTAMPTZ;
  v_end := COALESCE(p_end_date, (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day'))::TIMESTAMPTZ + INTERVAL '1 day' - INTERVAL '1 second';

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

  RETURN jsonb_build_object('success', true, 'events', v_events);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'detail', SQLSTATE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- 5. WELLBEING MODULE: create_discussion_item
-- ============================================================================

CREATE OR REPLACE FUNCTION create_discussion_item(
  p_title TEXT,
  p_details TEXT DEFAULT NULL,
  p_linked_provider_id UUID DEFAULT NULL,
  p_linked_prescription_id UUID DEFAULT NULL,
  p_linked_symptom_entry_id UUID DEFAULT NULL,
  p_linked_event_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_workspace_id UUID;
  v_patient_id UUID;
  v_item_id UUID;
BEGIN
  v_workspace_id := get_effective_workspace_id();
  v_patient_id := get_effective_patient_id();

  IF v_workspace_id IS NULL OR v_patient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace or patient');
  END IF;

  INSERT INTO provider_discussion_item (
    workspace_id, patient_id, title, details, status,
    linked_provider_id, linked_prescription_id,
    linked_symptom_entry_id, linked_event_id
  ) VALUES (
    v_workspace_id, v_patient_id, p_title, p_details, 'open',
    p_linked_provider_id, p_linked_prescription_id,
    p_linked_symptom_entry_id, p_linked_event_id
  )
  RETURNING discussion_item_id INTO v_item_id;

  RETURN jsonb_build_object('success', true, 'discussion_item_id', v_item_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'detail', SQLSTATE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- 6. WELLBEING MODULE: get_discussion_items
-- ============================================================================

CREATE OR REPLACE FUNCTION get_discussion_items(
  p_status discussion_item_status DEFAULT NULL,
  p_provider_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_workspace_id UUID;
  v_patient_id UUID;
  v_items JSONB;
BEGIN
  v_workspace_id := get_effective_workspace_id();
  v_patient_id := get_effective_patient_id();

  IF v_workspace_id IS NULL OR v_patient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace or patient');
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

  RETURN jsonb_build_object('success', true, 'items', v_items);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'detail', SQLSTATE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- 7. GOALS MODULE: create_goal_with_missions
-- ============================================================================

CREATE OR REPLACE FUNCTION create_goal_with_missions(
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_goal_type TEXT DEFAULT 'quest',
  p_missions JSONB DEFAULT '[]'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_workspace_id UUID;
  v_patient_id UUID;
  v_goal_id UUID;
  v_mission JSONB;
  v_task_id UUID;
  v_sort_order INTEGER := 0;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  v_workspace_id := get_effective_workspace_id();
  v_patient_id := get_effective_patient_id();

  IF v_workspace_id IS NULL OR v_patient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace or patient');
  END IF;

  IF p_goal_type NOT IN ('destiny', 'quest') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid goal type');
  END IF;

  INSERT INTO goal (
    workspace_id, patient_id, created_by_user_id,
    title, description, goal_type
  ) VALUES (
    v_workspace_id, v_patient_id, v_user_id,
    p_title, p_description, p_goal_type
  )
  RETURNING goal_id INTO v_goal_id;

  FOR v_mission IN SELECT * FROM jsonb_array_elements(p_missions)
  LOOP
    v_sort_order := v_sort_order + 1;

    INSERT INTO task (
      workspace_id, patient_id,
      title, description, points,
      assigned_to_user_id, created_by_user_id,
      task_type_key, status,
      assigned_day, requires_same_day_completion, must_do
    ) VALUES (
      v_workspace_id, v_patient_id,
      v_mission->>'title',
      v_mission->>'description',
      COALESCE((v_mission->>'points')::INT, 10),
      v_patient_id, v_user_id,
      'one_time', 'active',
      CURRENT_DATE, true,
      COALESCE((v_mission->>'must_do')::BOOLEAN, false)
    )
    RETURNING task_id INTO v_task_id;

    INSERT INTO goal_item (goal_id, task_id, sort_order)
    VALUES (v_goal_id, v_task_id, v_sort_order);
  END LOOP;

  RETURN jsonb_build_object('success', true, 'goal_id', v_goal_id);
END;
$$;

-- ============================================================================
-- 8. GOALS MODULE: get_goals_by_type
-- ============================================================================

CREATE OR REPLACE FUNCTION get_goals_by_type(
  p_goal_type TEXT DEFAULT 'quest'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
  v_patient_id UUID;
  v_goals JSONB;
BEGIN
  v_workspace_id := get_effective_workspace_id();
  v_patient_id := get_effective_patient_id();

  IF v_workspace_id IS NULL OR v_patient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace or patient', 'goals', '[]'::jsonb);
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'goal_id', g.goal_id,
      'workspace_id', g.workspace_id,
      'patient_id', g.patient_id,
      'created_by_user_id', g.created_by_user_id,
      'title', g.title,
      'description', g.description,
      'goal_type', g.goal_type,
      'status', g.status,
      'completed_at', g.completed_at,
      'created_at', g.created_at,
      'updated_at', g.updated_at,
      'missions', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'task_id', t.task_id,
            'title', t.title,
            'description', t.description,
            'points', t.points,
            'must_do', t.must_do,
            'status', t.status,
            'task_type_key', t.task_type_key,
            'task_instance', (
              SELECT jsonb_build_object(
                'task_instance_id', ti.task_instance_id,
                'completion_status', ti.completion_status,
                'completed_at', ti.completed_at,
                'points_awarded', ti.points_awarded
              )
              FROM task_instance ti
              WHERE ti.task_id = t.task_id
                AND ti.completion_status = 'done'
              ORDER BY ti.completed_at DESC
              LIMIT 1
            )
          )
          ORDER BY gi.sort_order
        )
        FROM goal_item gi
        JOIN task t ON t.task_id = gi.task_id
        WHERE gi.goal_id = g.goal_id
      ), '[]'::jsonb)
    )
    ORDER BY g.created_at DESC
  ), '[]'::jsonb)
  INTO v_goals
  FROM goal g
  WHERE g.workspace_id = v_workspace_id
    AND g.patient_id = v_patient_id
    AND g.goal_type = p_goal_type
    AND g.status = 'active';

  RETURN jsonb_build_object('success', true, 'goals', v_goals);
END;
$$;

-- ============================================================================
-- 9. GOALS MODULE: delete_goal
-- ============================================================================

CREATE OR REPLACE FUNCTION delete_goal(
  p_goal_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_workspace_id UUID;
  v_goal RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  v_workspace_id := get_effective_workspace_id();

  SELECT g.* INTO v_goal
  FROM goal g
  WHERE g.goal_id = p_goal_id
    AND g.workspace_id = v_workspace_id;

  IF v_goal IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Goal not found');
  END IF;

  DELETE FROM goal WHERE goal_id = p_goal_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================================
-- 10. GOAL RLS POLICIES: Fix for admin impersonation
-- ============================================================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view own goals" ON goal;
DROP POLICY IF EXISTS "Users can manage own goals" ON goal;
DROP POLICY IF EXISTS "Users can view own goal items" ON goal_item;
DROP POLICY IF EXISTS "Users can manage own goal items" ON goal_item;

-- Goal: Allow workspace members full access (SECURITY DEFINER RPCs handle patient scoping)
CREATE POLICY "Workspace members can access goals" ON goal
  FOR ALL TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND status = 'active'
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Goal items: Allow access if the parent goal is accessible
CREATE POLICY "Workspace members can access goal items" ON goal_item
  FOR ALL TO authenticated
  USING (
    goal_id IN (
      SELECT g.goal_id FROM goal g
      JOIN workspace_membership wm ON wm.workspace_id = g.workspace_id
      WHERE wm.user_id = auth.uid() AND wm.status = 'active'
    )
  )
  WITH CHECK (
    goal_id IN (
      SELECT g.goal_id FROM goal g
      JOIN workspace_membership wm ON wm.workspace_id = g.workspace_id
      WHERE wm.user_id = auth.uid() AND wm.status = 'active'
    )
  );
