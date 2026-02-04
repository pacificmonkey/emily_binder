-- Migration: 00024_uncomplete_task_function.sql
-- Description: Add uncomplete_task RPC and fix complete_task to handle re-completion
-- Schema Version: 1.3.0

-- =============================================================================
-- UNCOMPLETE TASK FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION uncomplete_task(
  p_task_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_today DATE;
  v_instance RECORD;
  v_deleted_points INT;
BEGIN
  v_user_id := auth.uid();
  v_today := CURRENT_DATE;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Find today's instance
  SELECT * INTO v_instance
  FROM task_instance
  WHERE task_id = p_task_id AND assigned_day = v_today;

  IF v_instance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No task instance found for today');
  END IF;

  IF v_instance.completion_status = 'not_done' THEN
    RETURN jsonb_build_object('success', true, 'already_uncompleted', true);
  END IF;

  -- Store points for response
  v_deleted_points := v_instance.points_awarded;

  -- Update instance to not_done
  UPDATE task_instance
  SET
    completion_status = 'not_done',
    completed_at = NULL,
    points_awarded = 0
  WHERE task_instance_id = v_instance.task_instance_id;

  -- Remove the ledger entry for this task instance
  -- This will trigger recompute_user_progress via the DELETE trigger
  DELETE FROM points_ledger_entry
  WHERE link_type = 'task_instance'
    AND link_id = v_instance.task_instance_id;

  RETURN jsonb_build_object(
    'success', true,
    'task_instance_id', v_instance.task_instance_id,
    'points_removed', v_deleted_points
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION uncomplete_task(UUID) TO authenticated;

-- =============================================================================
-- FIX COMPLETE TASK TO HANDLE RE-COMPLETION
-- =============================================================================

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

  -- Check if instance already exists
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
    -- Update existing instance (was uncompleted, now re-completing)
    UPDATE task_instance
    SET
      completion_status = 'done',
      completed_at = now(),
      completion_notes = p_completion_notes,
      points_awarded = v_task.points
    WHERE task_instance_id = v_instance.task_instance_id;

    v_instance_id := v_instance.task_instance_id;

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

    -- Write to points ledger for new instance
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

-- =============================================================================
-- CLEAN UP ORPHANED LEDGER ENTRIES
-- =============================================================================

-- Delete ledger entries for task instances that are marked as not_done
DELETE FROM points_ledger_entry
WHERE link_type = 'task_instance'
  AND link_id IN (
    SELECT task_instance_id FROM task_instance WHERE completion_status = 'not_done'
  );

-- Recompute progress after cleanup
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
