-- Migration: 00020_debug_points.sql
-- Description: Diagnostic function to debug points issues
-- Schema Version: 1.3.0

CREATE OR REPLACE FUNCTION debug_points_system()
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_workspace_id UUID;
  v_patient_id UUID;
  v_progress RECORD;
  v_level_system RECORD;
  v_ledger_entries JSONB;
  v_task_instances JSONB;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  -- Get workspace
  SELECT wm.workspace_id INTO v_workspace_id
  FROM workspace_membership wm
  WHERE wm.user_id = v_user_id AND wm.status = 'active'
  LIMIT 1;

  -- Get patient
  SELECT pp.patient_id INTO v_patient_id
  FROM patient_profile pp
  WHERE pp.workspace_id = v_workspace_id
  LIMIT 1;

  -- Get user_progress
  SELECT * INTO v_progress
  FROM user_progress
  WHERE patient_id = v_patient_id;

  -- Get level_system
  SELECT * INTO v_level_system
  FROM level_system
  WHERE patient_id = v_patient_id;

  -- Get recent ledger entries
  SELECT COALESCE(jsonb_agg(to_jsonb(ple.*) ORDER BY ple.occurred_at DESC), '[]'::jsonb)
  INTO v_ledger_entries
  FROM (
    SELECT * FROM points_ledger_entry
    WHERE patient_id = v_patient_id
    ORDER BY occurred_at DESC
    LIMIT 10
  ) ple;

  -- Get recent task instances
  SELECT COALESCE(jsonb_agg(to_jsonb(ti.*) ORDER BY ti.created_at DESC), '[]'::jsonb)
  INTO v_task_instances
  FROM (
    SELECT * FROM task_instance
    WHERE patient_id = v_patient_id
    ORDER BY created_at DESC
    LIMIT 10
  ) ti;

  RETURN jsonb_build_object(
    'user_id', v_user_id,
    'workspace_id', v_workspace_id,
    'patient_id', v_patient_id,
    'user_progress', to_jsonb(v_progress),
    'level_system', to_jsonb(v_level_system),
    'ledger_entries_count', jsonb_array_length(v_ledger_entries),
    'ledger_entries', v_ledger_entries,
    'task_instances_count', jsonb_array_length(v_task_instances),
    'task_instances', v_task_instances
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION debug_points_system() TO authenticated;
