-- Migration: 00025_fix_complete_task_upsert.sql
-- Description: Fix complete_task to use UPSERT pattern to avoid duplicate key errors
-- Schema Version: 1.3.0

CREATE OR REPLACE FUNCTION complete_task(
  p_task_id UUID,
  p_completion_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_workspace_id UUID;
  v_patient_id UUID;
  v_today DATE;
  v_task RECORD;
  v_instance_id UUID;
  v_was_already_done BOOLEAN := false;
  v_existing_ledger_count INT;
BEGIN
  v_user_id := auth.uid();
  v_today := CURRENT_DATE;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get task details
  SELECT * INTO v_task FROM task WHERE task_id = p_task_id;
  IF v_task IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task not found');
  END IF;

  v_workspace_id := v_task.workspace_id;
  v_patient_id := v_task.patient_id;

  -- Check if already completed today
  SELECT task_instance_id, (completion_status = 'done') INTO v_instance_id, v_was_already_done
  FROM task_instance
  WHERE task_id = p_task_id AND assigned_day = v_today;

  IF v_was_already_done THEN
    RETURN jsonb_build_object(
      'success', true,
      'task_instance_id', v_instance_id,
      'points_awarded', v_task.points,
      'already_completed', true
    );
  END IF;

  -- Use UPSERT to either update existing or insert new
  INSERT INTO task_instance (
    workspace_id,
    patient_id,
    task_id,
    assigned_day,
    completion_status,
    completed_at,
    points_awarded,
    completion_notes,
    created_at
  ) VALUES (
    v_workspace_id,
    v_patient_id,
    p_task_id,
    v_today,
    'done',
    now(),
    v_task.points,
    p_completion_notes,
    now()
  )
  ON CONFLICT (task_id, assigned_day) DO UPDATE SET
    completion_status = 'done',
    completed_at = now(),
    points_awarded = v_task.points,
    completion_notes = p_completion_notes
  RETURNING task_instance_id INTO v_instance_id;

  -- Check if ledger entry already exists for this instance
  SELECT COUNT(*) INTO v_existing_ledger_count
  FROM points_ledger_entry
  WHERE link_type = 'task_instance' AND link_id = v_instance_id;

  -- Only write to ledger if no entry exists
  IF v_existing_ledger_count = 0 THEN
    INSERT INTO points_ledger_entry (
      workspace_id,
      patient_id,
      delta,
      reason,
      link_type,
      link_id,
      occurred_at
    ) VALUES (
      v_workspace_id,
      v_patient_id,
      v_task.points,
      'task_completion',
      'task_instance',
      v_instance_id,
      now()
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'task_instance_id', v_instance_id,
    'points_awarded', v_task.points
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
