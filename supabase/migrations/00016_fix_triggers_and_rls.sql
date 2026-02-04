-- Migration: 00016_fix_triggers_and_rls.sql
-- Description: Fix task triggers to use correct column names, ensure RLS works
-- Schema Version: 1.3.0

-- =============================================================================
-- DROP PROBLEMATIC TRIGGERS (they use wrong column names)
-- =============================================================================

DROP TRIGGER IF EXISTS task_instance_award_points ON task_instance;
DROP TRIGGER IF EXISTS task_instance_award_points_on_insert ON task_instance;
DROP FUNCTION IF EXISTS award_points_on_task_completion();
DROP FUNCTION IF EXISTS award_points_on_task_instance_insert();

-- =============================================================================
-- CREATE FIXED TRIGGERS
-- =============================================================================

-- Function to award points when task is completed (UPDATE)
CREATE OR REPLACE FUNCTION award_points_on_task_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_task_points INT;
BEGIN
  -- Only process when status changes to 'done'
  IF NEW.completion_status = 'done' AND (OLD.completion_status IS NULL OR OLD.completion_status = 'not_done') THEN
    -- Get the task's point value
    SELECT points INTO v_task_points FROM task WHERE task_id = NEW.task_id;

    -- Update the instance with points awarded
    NEW.points_awarded := COALESCE(v_task_points, 0);
    NEW.completed_at := COALESCE(NEW.completed_at, now());

    -- Write to points ledger (using correct columns: patient_id, not user_id)
    INSERT INTO points_ledger_entry (
      workspace_id,
      patient_id,
      delta,
      reason,
      link_type,
      link_id,
      occurred_at
    ) VALUES (
      NEW.workspace_id,
      NEW.patient_id,
      COALESCE(v_task_points, 0),
      'task_completion',
      'task_instance',
      NEW.task_instance_id,
      NEW.completed_at
    );

    -- Update user progress
    UPDATE user_progress
    SET
      total_points = total_points + COALESCE(v_task_points, 0),
      points_into_level = points_into_level + COALESCE(v_task_points, 0),
      last_recomputed_at = now()
    WHERE workspace_id = NEW.workspace_id AND patient_id = NEW.patient_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to award points when task instance is created with done status (INSERT)
CREATE OR REPLACE FUNCTION award_points_on_task_instance_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_task_points INT;
BEGIN
  IF NEW.completion_status = 'done' THEN
    SELECT points INTO v_task_points FROM task WHERE task_id = NEW.task_id;

    NEW.points_awarded := COALESCE(v_task_points, 0);
    NEW.completed_at := COALESCE(NEW.completed_at, now());

    -- Write to points ledger (using correct columns)
    INSERT INTO points_ledger_entry (
      workspace_id,
      patient_id,
      delta,
      reason,
      link_type,
      link_id,
      occurred_at
    ) VALUES (
      NEW.workspace_id,
      NEW.patient_id,
      COALESCE(v_task_points, 0),
      'task_completion',
      'task_instance',
      NEW.task_instance_id,
      NEW.completed_at
    );

    -- Update user progress
    UPDATE user_progress
    SET
      total_points = total_points + COALESCE(v_task_points, 0),
      points_into_level = points_into_level + COALESCE(v_task_points, 0),
      last_recomputed_at = now()
    WHERE workspace_id = NEW.workspace_id AND patient_id = NEW.patient_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create triggers
CREATE TRIGGER task_instance_award_points
  BEFORE UPDATE ON task_instance
  FOR EACH ROW EXECUTE FUNCTION award_points_on_task_completion();

CREATE TRIGGER task_instance_award_points_on_insert
  BEFORE INSERT ON task_instance
  FOR EACH ROW EXECUTE FUNCTION award_points_on_task_instance_insert();

-- =============================================================================
-- GRANT NECESSARY PERMISSIONS
-- =============================================================================

-- Make sure authenticated users can use these functions
GRANT EXECUTE ON FUNCTION award_points_on_task_completion() TO authenticated;
GRANT EXECUTE ON FUNCTION award_points_on_task_instance_insert() TO authenticated;
