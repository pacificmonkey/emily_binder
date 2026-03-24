-- Get intake events for a date range
CREATE OR REPLACE FUNCTION get_intakes_for_range(
  p_start_date date DEFAULT (CURRENT_DATE - interval '7 days')::date,
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id uuid;
  v_workspace_id uuid;
  v_result jsonb;
BEGIN
  SELECT get_effective_patient_id() INTO v_patient_id;

  SELECT workspace_id INTO v_workspace_id
  FROM patient_profile
  WHERE patient_id = v_patient_id;

  SELECT jsonb_build_object(
    'success', true,
    'intakes', COALESCE(jsonb_agg(
      jsonb_build_object(
        'intake_event_id', ie.intake_event_id,
        'prescription_id', ie.prescription_id,
        'medication_name', m.display_name,
        'status', ie.status,
        'taken_time', ie.taken_time,
        'scheduled_time', ie.scheduled_time,
        'dose_quantity', ie.dose_quantity,
        'dose_unit', ie.dose_unit,
        'reason', ie.reason,
        'notes', ie.notes,
        'created_at', ie.created_at
      ) ORDER BY ie.created_at DESC
    ), '[]'::jsonb)
  ) INTO v_result
  FROM intake_event ie
  JOIN prescription p ON p.prescription_id = ie.prescription_id
  JOIN medication m ON m.medication_id = p.medication_id
  WHERE ie.patient_id = v_patient_id
    AND ie.workspace_id = v_workspace_id
    AND ie.created_at::date BETWEEN p_start_date AND p_end_date;

  RETURN v_result;
END;
$$;
