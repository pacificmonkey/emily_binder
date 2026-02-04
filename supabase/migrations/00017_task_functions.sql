-- Migration: 00017_task_functions.sql
-- Description: Database functions for task operations
-- Schema Version: 1.3.0

-- =============================================================================
-- DISABLE AUDIT TRIGGERS ON TASK TABLES (they cause issues)
-- =============================================================================

DROP TRIGGER IF EXISTS task_audit_trigger ON task;
DROP TRIGGER IF EXISTS task_instance_audit_trigger ON task_instance;
DROP TRIGGER IF EXISTS task_tag_audit_trigger ON task_tag;

-- =============================================================================
-- CREATE TASK FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION create_task(
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_points INT DEFAULT 10,
  p_task_type_key task_type_key DEFAULT 'one_time',
  p_assigned_day DATE DEFAULT NULL,
  p_requires_same_day_completion BOOLEAN DEFAULT true,
  p_must_do BOOLEAN DEFAULT false
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_workspace_id UUID;
  v_patient_id UUID;
  v_task_id UUID;
  v_task RECORD;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get workspace membership
  SELECT wm.workspace_id INTO v_workspace_id
  FROM workspace_membership wm
  WHERE wm.user_id = v_user_id AND wm.status = 'active'
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'No active workspace membership';
  END IF;

  -- Get patient profile
  SELECT pp.patient_id INTO v_patient_id
  FROM patient_profile pp
  WHERE pp.workspace_id = v_workspace_id
  LIMIT 1;

  IF v_patient_id IS NULL THEN
    RAISE EXCEPTION 'No patient profile found';
  END IF;

  -- Insert task
  INSERT INTO task (
    workspace_id,
    patient_id,
    title,
    description,
    points,
    assigned_to_user_id,
    created_by_user_id,
    task_type_key,
    status,
    assigned_day,
    requires_same_day_completion,
    must_do,
    created_at,
    updated_at
  ) VALUES (
    v_workspace_id,
    v_patient_id,
    p_title,
    p_description,
    p_points,
    v_user_id,
    v_user_id,
    p_task_type_key,
    'active',
    COALESCE(p_assigned_day, CURRENT_DATE),
    p_requires_same_day_completion,
    p_must_do,
    now(),
    now()
  )
  RETURNING * INTO v_task;

  RETURN jsonb_build_object(
    'success', true,
    'task_id', v_task.task_id,
    'task', to_jsonb(v_task)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_task(TEXT, TEXT, INT, task_type_key, DATE, BOOLEAN, BOOLEAN) TO authenticated;

-- =============================================================================
-- GET TODAY'S TASKS FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION get_todays_tasks()
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_workspace_id UUID;
  v_patient_id UUID;
  v_today DATE;
  v_tasks JSONB;
BEGIN
  v_user_id := auth.uid();
  v_today := CURRENT_DATE;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated', 'tasks', '[]'::jsonb);
  END IF;

  -- Get workspace
  SELECT wm.workspace_id INTO v_workspace_id
  FROM workspace_membership wm
  WHERE wm.user_id = v_user_id AND wm.status = 'active'
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No workspace', 'tasks', '[]'::jsonb);
  END IF;

  -- Get patient
  SELECT pp.patient_id INTO v_patient_id
  FROM patient_profile pp
  WHERE pp.workspace_id = v_workspace_id
  LIMIT 1;

  -- Get tasks with instances
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'task_id', t.task_id,
      'workspace_id', t.workspace_id,
      'patient_id', t.patient_id,
      'title', t.title,
      'description', t.description,
      'points', t.points,
      'assigned_to_user_id', t.assigned_to_user_id,
      'created_by_user_id', t.created_by_user_id,
      'task_type_key', t.task_type_key,
      'status', t.status,
      'assigned_day', t.assigned_day,
      'requires_same_day_completion', t.requires_same_day_completion,
      'must_do', t.must_do,
      'created_at', t.created_at,
      'updated_at', t.updated_at,
      'task_instance', (
        SELECT to_jsonb(ti.*)
        FROM task_instance ti
        WHERE ti.task_id = t.task_id AND ti.assigned_day = v_today
        LIMIT 1
      )
    )
    ORDER BY t.must_do DESC, t.created_at ASC
  ), '[]'::jsonb)
  INTO v_tasks
  FROM task t
  WHERE t.workspace_id = v_workspace_id
    AND t.patient_id = v_patient_id
    AND t.status = 'active'
    AND (t.assigned_day = v_today OR t.assigned_day IS NULL OR t.task_type_key = 'recurring');

  RETURN jsonb_build_object('success', true, 'tasks', v_tasks);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_todays_tasks() TO authenticated;

-- =============================================================================
-- COMPLETE TASK FUNCTION
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
BEGIN
  v_user_id := auth.uid();
  v_today := CURRENT_DATE;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get task details
  SELECT * INTO v_task FROM task WHERE task_id = p_task_id;
  IF v_task IS NULL THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  v_workspace_id := v_task.workspace_id;
  v_patient_id := v_task.patient_id;

  -- Check if instance exists
  SELECT * INTO v_instance
  FROM task_instance
  WHERE task_id = p_task_id AND assigned_day = v_today;

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

  -- Update user progress
  UPDATE user_progress
  SET
    total_points = total_points + v_task.points,
    points_into_level = points_into_level + v_task.points,
    last_recomputed_at = now()
  WHERE workspace_id = v_workspace_id AND patient_id = v_patient_id;

  RETURN jsonb_build_object(
    'success', true,
    'task_instance_id', v_instance_id,
    'points_awarded', v_task.points
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION complete_task(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION create_task IS 'Creates a new task for the current user';
COMMENT ON FUNCTION get_todays_tasks IS 'Gets all tasks for today with their completion status';
COMMENT ON FUNCTION complete_task IS 'Marks a task as complete and awards points';
