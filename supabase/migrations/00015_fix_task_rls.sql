-- Migration: 00015_fix_task_rls.sql
-- Description: Fix task RLS policies to work correctly
-- Schema Version: 1.3.0

-- Drop existing task policies
DROP POLICY IF EXISTS task_select ON task;
DROP POLICY IF EXISTS task_insert ON task;
DROP POLICY IF EXISTS task_update ON task;
DROP POLICY IF EXISTS task_delete ON task;

DROP POLICY IF EXISTS task_instance_select ON task_instance;
DROP POLICY IF EXISTS task_instance_insert ON task_instance;
DROP POLICY IF EXISTS task_instance_update ON task_instance;
DROP POLICY IF EXISTS task_instance_delete ON task_instance;

-- =============================================================================
-- SIMPLIFIED TASK POLICIES
-- =============================================================================

-- All workspace members can view tasks
CREATE POLICY task_select ON task
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_membership wm
      WHERE wm.workspace_id = task.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
  );

-- Members can create tasks in their workspace
CREATE POLICY task_insert ON task
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_membership wm
      WHERE wm.workspace_id = task.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
  );

-- Members can update tasks in their workspace
CREATE POLICY task_update ON task
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_membership wm
      WHERE wm.workspace_id = task.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
  );

-- Members can delete tasks in their workspace
CREATE POLICY task_delete ON task
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_membership wm
      WHERE wm.workspace_id = task.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
  );

-- =============================================================================
-- SIMPLIFIED TASK INSTANCE POLICIES
-- =============================================================================

CREATE POLICY task_instance_select ON task_instance
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_membership wm
      WHERE wm.workspace_id = task_instance.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
  );

CREATE POLICY task_instance_insert ON task_instance
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_membership wm
      WHERE wm.workspace_id = task_instance.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
  );

CREATE POLICY task_instance_update ON task_instance
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_membership wm
      WHERE wm.workspace_id = task_instance.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
  );

CREATE POLICY task_instance_delete ON task_instance
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_membership wm
      WHERE wm.workspace_id = task_instance.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
  );

-- =============================================================================
-- FIX USER_PROGRESS POLICIES (add insert/update for triggers)
-- =============================================================================

DROP POLICY IF EXISTS user_progress_select ON user_progress;
DROP POLICY IF EXISTS user_progress_insert ON user_progress;
DROP POLICY IF EXISTS user_progress_update ON user_progress;

CREATE POLICY user_progress_select ON user_progress
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_membership wm
      WHERE wm.workspace_id = user_progress.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
  );

CREATE POLICY user_progress_insert ON user_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_membership wm
      WHERE wm.workspace_id = user_progress.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
  );

CREATE POLICY user_progress_update ON user_progress
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_membership wm
      WHERE wm.workspace_id = user_progress.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
  );

-- =============================================================================
-- FIX POINTS LEDGER POLICIES
-- =============================================================================

DROP POLICY IF EXISTS points_ledger_entry_select ON points_ledger_entry;
DROP POLICY IF EXISTS points_ledger_entry_insert ON points_ledger_entry;

CREATE POLICY points_ledger_entry_select ON points_ledger_entry
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_membership wm
      WHERE wm.workspace_id = points_ledger_entry.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
  );

CREATE POLICY points_ledger_entry_insert ON points_ledger_entry
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_membership wm
      WHERE wm.workspace_id = points_ledger_entry.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
  );
