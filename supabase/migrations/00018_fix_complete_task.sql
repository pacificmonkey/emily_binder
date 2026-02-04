-- Migration: 00018_fix_complete_task.sql
-- Description: Fix complete_task function to properly update points
-- Schema Version: 1.3.0

-- Drop and recreate with better error handling and debugging
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
  v_progress_updated INT;
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

  -- Update user progress and count affected rows
  UPDATE user_progress
  SET
    total_points = total_points + v_task.points,
    points_into_level = points_into_level + v_task.points,
    last_recomputed_at = now()
  WHERE workspace_id = v_workspace_id AND patient_id = v_patient_id;

  GET DIAGNOSTICS v_progress_updated = ROW_COUNT;

  -- If no progress record was updated, create one
  IF v_progress_updated = 0 THEN
    INSERT INTO user_progress (
      workspace_id,
      patient_id,
      total_points,
      current_level,
      points_into_level,
      points_to_next_level,
      last_recomputed_at
    ) VALUES (
      v_workspace_id,
      v_patient_id,
      v_task.points,
      1,
      v_task.points,
      100 - v_task.points,
      now()
    )
    ON CONFLICT (patient_id) DO UPDATE SET
      total_points = user_progress.total_points + v_task.points,
      points_into_level = user_progress.points_into_level + v_task.points,
      last_recomputed_at = now();
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'task_instance_id', v_instance_id,
    'points_awarded', v_task.points,
    'progress_rows_updated', v_progress_updated
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
