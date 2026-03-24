-- Migration: 00055_medication_adherence.sql
-- Description: RPC to compute medication adherence percentage per prescription

CREATE OR REPLACE FUNCTION get_medication_adherence(
  p_days INT DEFAULT 7
) RETURNS JSONB AS $$
DECLARE
  v_patient_id UUID;
  v_workspace_id UUID;
  v_start_date DATE;
  v_result JSONB;
BEGIN
  SELECT pp.patient_id, pp.workspace_id
  INTO v_patient_id, v_workspace_id
  FROM patient_profile pp
  JOIN workspace_membership wm ON wm.workspace_id = pp.workspace_id
  WHERE wm.user_id = auth.uid() AND wm.status = 'active'
  LIMIT 1;

  IF v_patient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No patient profile found');
  END IF;

  v_start_date := CURRENT_DATE - p_days;

  SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'prescription_id', ie.prescription_id,
      'taken_count', COUNT(*) FILTER (WHERE ie.status = 'taken'),
      'skipped_count', COUNT(*) FILTER (WHERE ie.status = 'skipped'),
      'missed_count', COUNT(*) FILTER (WHERE ie.status = 'missed'),
      'total_count', COUNT(*),
      'adherence_pct', CASE
        WHEN COUNT(*) = 0 THEN NULL
        ELSE ROUND(
          (COUNT(*) FILTER (WHERE ie.status = 'taken'))::NUMERIC / COUNT(*)::NUMERIC * 100
        )
      END
    ) AS row_data
    FROM intake_event ie
    WHERE ie.patient_id = v_patient_id
      AND ie.canonical_date >= v_start_date
    GROUP BY ie.prescription_id
  ) sub;

  RETURN jsonb_build_object('success', true, 'adherence', v_result);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_medication_adherence(INT) TO authenticated;
