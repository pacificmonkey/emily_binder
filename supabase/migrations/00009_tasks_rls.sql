-- Migration: 00009_tasks_rls.sql
-- Description: RLS policies for Task module tables
-- Schema Version: 1.3.0

-- =============================================================================
-- ENABLE RLS ON ALL TASK TABLES
-- =============================================================================

ALTER TABLE task_type_label ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_tag ENABLE ROW LEVEL SECURITY;
ALTER TABLE task ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_tag_link ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_instance ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurrence_rule ENABLE ROW LEVEL SECURITY;
ALTER TABLE bonus_availability_setting ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_group ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_group_task_link ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_group_daily_result ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- TASK TYPE LABEL POLICIES (App-scoped, visible to all authenticated users)
-- =============================================================================

CREATE POLICY task_type_label_select ON task_type_label
  FOR SELECT
  TO authenticated
  USING (
    scope_type = 'app'
    OR (scope_type = 'workspace' AND scope_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND status = 'active'
    ))
  );

CREATE POLICY task_type_label_insert ON task_type_label
  FOR INSERT
  TO authenticated
  WITH CHECK (
    scope_type = 'workspace'
    AND scope_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND status = 'active' AND role_key = 'admin'
    )
  );

CREATE POLICY task_type_label_update ON task_type_label
  FOR UPDATE
  TO authenticated
  USING (
    scope_type = 'workspace'
    AND scope_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND status = 'active' AND role_key = 'admin'
    )
  );

CREATE POLICY task_type_label_delete ON task_type_label
  FOR DELETE
  TO authenticated
  USING (
    scope_type = 'workspace'
    AND scope_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND status = 'active' AND role_key = 'admin'
    )
  );

-- =============================================================================
-- TASK TAG POLICIES
-- =============================================================================

CREATE POLICY task_tag_select ON task_tag
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY task_tag_insert ON task_tag
  FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY task_tag_update ON task_tag
  FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY task_tag_delete ON task_tag
  FOR DELETE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- =============================================================================
-- TASK POLICIES
-- =============================================================================

-- All workspace members can view tasks
CREATE POLICY task_select ON task
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Members can create tasks (assigned to themselves or with manage_tasks permission)
CREATE POLICY task_insert ON task
  FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND status = 'active'
    )
    AND (
      assigned_to_user_id = auth.uid()
      OR user_has_permission(auth.uid(), workspace_id, 'manage_tasks')
    )
  );

-- Users can update their own tasks, or admins with manage_tasks
CREATE POLICY task_update ON task
  FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND status = 'active'
    )
    AND (
      assigned_to_user_id = auth.uid()
      OR user_has_permission(auth.uid(), workspace_id, 'manage_tasks')
    )
  );

-- Only admins with manage_tasks can delete tasks
CREATE POLICY task_delete ON task
  FOR DELETE
  TO authenticated
  USING (
    user_has_permission(auth.uid(), workspace_id, 'manage_tasks')
  );

-- =============================================================================
-- TASK TAG LINK POLICIES
-- =============================================================================

CREATE POLICY task_tag_link_select ON task_tag_link
  FOR SELECT
  TO authenticated
  USING (
    task_id IN (
      SELECT task_id FROM task
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_membership
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

CREATE POLICY task_tag_link_insert ON task_tag_link
  FOR INSERT
  TO authenticated
  WITH CHECK (
    task_id IN (
      SELECT task_id FROM task
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_membership
        WHERE user_id = auth.uid() AND status = 'active'
      )
      AND (assigned_to_user_id = auth.uid() OR user_has_permission(auth.uid(), workspace_id, 'manage_tasks'))
    )
  );

CREATE POLICY task_tag_link_delete ON task_tag_link
  FOR DELETE
  TO authenticated
  USING (
    task_id IN (
      SELECT task_id FROM task
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_membership
        WHERE user_id = auth.uid() AND status = 'active'
      )
      AND (assigned_to_user_id = auth.uid() OR user_has_permission(auth.uid(), workspace_id, 'manage_tasks'))
    )
  );

-- =============================================================================
-- TASK INSTANCE POLICIES
-- =============================================================================

CREATE POLICY task_instance_select ON task_instance
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Users can create instances for their own tasks
CREATE POLICY task_instance_insert ON task_instance
  FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND status = 'active'
    )
    AND task_id IN (
      SELECT task_id FROM task
      WHERE assigned_to_user_id = auth.uid()
         OR user_has_permission(auth.uid(), workspace_id, 'manage_tasks')
    )
  );

-- Users can update their own task instances (complete tasks)
CREATE POLICY task_instance_update ON task_instance
  FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND status = 'active'
    )
    AND task_id IN (
      SELECT task_id FROM task
      WHERE assigned_to_user_id = auth.uid()
         OR user_has_permission(auth.uid(), workspace_id, 'manage_tasks')
    )
  );

CREATE POLICY task_instance_delete ON task_instance
  FOR DELETE
  TO authenticated
  USING (
    user_has_permission(auth.uid(), workspace_id, 'manage_tasks')
  );

-- =============================================================================
-- RECURRENCE RULE POLICIES
-- =============================================================================

CREATE POLICY recurrence_rule_select ON recurrence_rule
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY recurrence_rule_insert ON recurrence_rule
  FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND status = 'active'
    )
    AND task_id IN (
      SELECT task_id FROM task
      WHERE assigned_to_user_id = auth.uid()
         OR user_has_permission(auth.uid(), workspace_id, 'manage_tasks')
    )
  );

CREATE POLICY recurrence_rule_update ON recurrence_rule
  FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND status = 'active'
    )
    AND task_id IN (
      SELECT task_id FROM task
      WHERE assigned_to_user_id = auth.uid()
         OR user_has_permission(auth.uid(), workspace_id, 'manage_tasks')
    )
  );

CREATE POLICY recurrence_rule_delete ON recurrence_rule
  FOR DELETE
  TO authenticated
  USING (
    user_has_permission(auth.uid(), workspace_id, 'manage_tasks')
  );

-- =============================================================================
-- BONUS AVAILABILITY SETTING POLICIES
-- =============================================================================

CREATE POLICY bonus_availability_select ON bonus_availability_setting
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY bonus_availability_insert ON bonus_availability_setting
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_permission(auth.uid(), workspace_id, 'manage_tasks')
  );

CREATE POLICY bonus_availability_update ON bonus_availability_setting
  FOR UPDATE
  TO authenticated
  USING (
    user_has_permission(auth.uid(), workspace_id, 'manage_tasks')
  );

CREATE POLICY bonus_availability_delete ON bonus_availability_setting
  FOR DELETE
  TO authenticated
  USING (
    user_has_permission(auth.uid(), workspace_id, 'manage_tasks')
  );

-- =============================================================================
-- TASK GROUP POLICIES
-- =============================================================================

CREATE POLICY task_group_select ON task_group
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY task_group_insert ON task_group
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_permission(auth.uid(), workspace_id, 'manage_tasks')
  );

CREATE POLICY task_group_update ON task_group
  FOR UPDATE
  TO authenticated
  USING (
    user_has_permission(auth.uid(), workspace_id, 'manage_tasks')
  );

CREATE POLICY task_group_delete ON task_group
  FOR DELETE
  TO authenticated
  USING (
    user_has_permission(auth.uid(), workspace_id, 'manage_tasks')
  );

-- =============================================================================
-- TASK GROUP TASK LINK POLICIES
-- =============================================================================

CREATE POLICY task_group_task_link_select ON task_group_task_link
  FOR SELECT
  TO authenticated
  USING (
    task_group_id IN (
      SELECT task_group_id FROM task_group
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_membership
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

CREATE POLICY task_group_task_link_insert ON task_group_task_link
  FOR INSERT
  TO authenticated
  WITH CHECK (
    task_group_id IN (
      SELECT task_group_id FROM task_group
      WHERE user_has_permission(auth.uid(), workspace_id, 'manage_tasks')
    )
  );

CREATE POLICY task_group_task_link_delete ON task_group_task_link
  FOR DELETE
  TO authenticated
  USING (
    task_group_id IN (
      SELECT task_group_id FROM task_group
      WHERE user_has_permission(auth.uid(), workspace_id, 'manage_tasks')
    )
  );

-- =============================================================================
-- TASK GROUP DAILY RESULT POLICIES
-- =============================================================================

CREATE POLICY task_group_daily_result_select ON task_group_daily_result
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Daily results are typically created by triggers/functions, not directly
CREATE POLICY task_group_daily_result_insert ON task_group_daily_result
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_permission(auth.uid(), workspace_id, 'manage_tasks')
  );

CREATE POLICY task_group_daily_result_update ON task_group_daily_result
  FOR UPDATE
  TO authenticated
  USING (
    user_has_permission(auth.uid(), workspace_id, 'manage_tasks')
  );
