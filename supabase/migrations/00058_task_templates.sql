-- Migration: 00058_task_templates.sql
-- Description: Task templates for admin to create reusable task configurations

CREATE TABLE IF NOT EXISTS task_template (
  task_template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID,
  default_points INT NOT NULL DEFAULT 5,
  is_must_do BOOLEAN NOT NULL DEFAULT false,
  recurrence_rule TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_template_workspace ON task_template(workspace_id);
ALTER TABLE task_template ENABLE ROW LEVEL SECURITY;

CREATE POLICY task_template_select ON task_template
  FOR SELECT TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_membership
    WHERE user_id = auth.uid() AND status = 'active'
  ));

-- RPC: Get all task templates
CREATE OR REPLACE FUNCTION get_task_templates()
RETURNS JSONB AS $$
DECLARE
  v_workspace_id UUID;
  v_result JSONB;
BEGIN
  SELECT wm.workspace_id INTO v_workspace_id
  FROM workspace_membership wm
  WHERE wm.user_id = auth.uid() AND wm.status = 'active'
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace');
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'task_template_id', tt.task_template_id,
      'title', tt.title,
      'description', tt.description,
      'category_id', tt.category_id,
      'default_points', tt.default_points,
      'is_must_do', tt.is_must_do,
      'recurrence_rule', tt.recurrence_rule,
      'is_active', tt.is_active,
      'created_at', tt.created_at
    ) ORDER BY tt.sort_order, tt.title
  ), '[]'::jsonb)
  INTO v_result
  FROM task_template tt
  WHERE tt.workspace_id = v_workspace_id;

  RETURN jsonb_build_object('success', true, 'templates', v_result);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Create a task template
CREATE OR REPLACE FUNCTION create_task_template(
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_category_id UUID DEFAULT NULL,
  p_default_points INT DEFAULT 5,
  p_is_must_do BOOLEAN DEFAULT false,
  p_recurrence_rule TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_workspace_id UUID;
  v_template_id UUID;
BEGIN
  SELECT wm.workspace_id INTO v_workspace_id
  FROM workspace_membership wm
  WHERE wm.user_id = auth.uid() AND wm.status = 'active'
    AND wm.role_key = 'admin'
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;

  INSERT INTO task_template (workspace_id, title, description, category_id, default_points, is_must_do, recurrence_rule)
  VALUES (v_workspace_id, p_title, p_description, p_category_id, p_default_points, p_is_must_do, p_recurrence_rule)
  RETURNING task_template_id INTO v_template_id;

  RETURN jsonb_build_object('success', true, 'task_template_id', v_template_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Delete a task template
CREATE OR REPLACE FUNCTION delete_task_template(
  p_task_template_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_workspace_id UUID;
BEGIN
  SELECT wm.workspace_id INTO v_workspace_id
  FROM workspace_membership wm
  WHERE wm.user_id = auth.uid() AND wm.status = 'active'
    AND wm.role_key = 'admin'
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;

  DELETE FROM task_template
  WHERE task_template_id = p_task_template_id
    AND workspace_id = v_workspace_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Template not found');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_task_templates() TO authenticated;
GRANT EXECUTE ON FUNCTION create_task_template(TEXT, TEXT, UUID, INT, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_task_template(UUID) TO authenticated;
