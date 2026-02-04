-- Migration: 00023_fix_complete_task_double_update.sql
-- Description: Remove direct user_progress update from complete_task (trigger handles it)
-- Schema Version: 1.3.0

-- The complete_task function was:
-- 1. Inserting into points_ledger_entry
-- 2. Directly updating user_progress
-- But the trigger on points_ledger_entry already calls recompute_user_progress()
-- which recalculates from the ledger. So we were double-counting.

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
  v_instance RECORD;
  v_instance_id UUID;
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

  -- Check if instance already exists and is done
  SELECT * INTO v_instance
  FROM task_instance
  WHERE task_id = p_task_id AND assigned_day = v_today;

  IF v_instance IS NOT NULL AND v_instance.completion_status = 'done' THEN
    -- Already completed, just return success
    RETURN jsonb_build_object(
      'success', true,
      'task_instance_id', v_instance.task_instance_id,
      'points_awarded', v_instance.points_awarded,
      'already_completed', true
    );
  END IF;

  IF v_instance IS NOT NULL THEN
    -- Update existing instance
    UPDATE task_instance
    SET
      completion_status = 'done',
      completed_at = now(),
      completion_notes = p_completion_notes,
      points_awarded = v_task.points
    WHERE task_instance_id = v_instance.task_instance_id
    RETURNING task_instance_id INTO v_instance_id;
  ELSE
    -- Create new instance
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
    RETURNING task_instance_id INTO v_instance_id;
  END IF;

  -- Write to points ledger
  -- NOTE: The trigger on points_ledger_entry will call recompute_user_progress()
  -- which updates user_progress automatically. We do NOT update user_progress directly.
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

  -- user_progress is updated by the trigger on points_ledger_entry
  -- No direct update needed here!

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

-- Also fix the current points by recomputing from ledger
DO $$
DECLARE
  v_patient RECORD;
BEGIN
  FOR v_patient IN SELECT patient_id FROM patient_profile
  LOOP
    PERFORM recompute_user_progress(v_patient.patient_id);
  END LOOP;
END;
$$;
