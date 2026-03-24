-- ============================================================================
-- Migration: 00060_goals_module.sql
-- Description: Goals module - Destinies (long-term) and Quests (short-term)
--              with inline mission creation
-- ============================================================================

-- =============================================================================
-- GOAL TABLE
-- =============================================================================

CREATE TABLE goal (
  goal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
  created_by_user_id UUID NOT NULL REFERENCES "user"(user_id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('destiny', 'quest')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_goal_workspace_id ON goal(workspace_id);
CREATE INDEX idx_goal_patient_id ON goal(patient_id);
CREATE INDEX idx_goal_goal_type ON goal(goal_type);
CREATE INDEX idx_goal_status ON goal(status);

CREATE TRIGGER goal_updated_at
  BEFORE UPDATE ON goal
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE goal IS 'Long-term goals: Destinies (aspirations) and Quests (objectives) containing linked missions.';

-- =============================================================================
-- GOAL ITEM TABLE (links goals to tasks/missions)
-- =============================================================================

CREATE TABLE goal_item (
  goal_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goal(goal_id) ON DELETE CASCADE,
  task_id UUID REFERENCES task(task_id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_goal_item_goal_id ON goal_item(goal_id);
CREATE INDEX idx_goal_item_task_id ON goal_item(task_id);

COMMENT ON TABLE goal_item IS 'Junction table linking goals to their missions (tasks).';

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE goal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own goals" ON goal
  FOR SELECT TO authenticated
  USING (
    patient_id IN (
      SELECT pp.patient_id FROM patient_profile pp
      JOIN workspace_membership wm ON wm.workspace_id = pp.workspace_id AND wm.user_id = pp.patient_id
      WHERE wm.user_id = auth.uid() AND wm.status = 'active'
    )
  );

CREATE POLICY "Users can manage own goals" ON goal
  FOR ALL TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

ALTER TABLE goal_item ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own goal items" ON goal_item
  FOR SELECT TO authenticated
  USING (
    goal_id IN (
      SELECT g.goal_id FROM goal g
      JOIN workspace_membership wm ON wm.workspace_id = g.workspace_id
      WHERE wm.user_id = auth.uid() AND wm.status = 'active'
    )
  );

CREATE POLICY "Users can manage own goal items" ON goal_item
  FOR ALL TO authenticated
  USING (
    goal_id IN (
      SELECT g.goal_id FROM goal g
      JOIN workspace_membership wm ON wm.workspace_id = g.workspace_id
      WHERE wm.user_id = auth.uid() AND wm.status = 'active'
    )
  );

-- =============================================================================
-- RPC: create_goal_with_missions
-- Creates a goal and optionally creates new tasks linked to it
-- =============================================================================

CREATE OR REPLACE FUNCTION create_goal_with_missions(
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_goal_type TEXT DEFAULT 'quest',
  p_missions JSONB DEFAULT '[]'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_workspace_id UUID;
  v_patient_id UUID;
  v_goal_id UUID;
  v_mission JSONB;
  v_task_id UUID;
  v_sort_order INTEGER := 0;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get workspace
  SELECT wm.workspace_id INTO v_workspace_id
  FROM workspace_membership wm
  WHERE wm.user_id = v_user_id AND wm.status = 'active'
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace');
  END IF;

  -- Get patient profile
  SELECT pp.patient_id INTO v_patient_id
  FROM patient_profile pp
  WHERE pp.workspace_id = v_workspace_id
  LIMIT 1;

  IF v_patient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No patient profile');
  END IF;

  -- Validate goal_type
  IF p_goal_type NOT IN ('destiny', 'quest') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid goal type');
  END IF;

  -- Create goal
  INSERT INTO goal (
    workspace_id, patient_id, created_by_user_id,
    title, description, goal_type
  ) VALUES (
    v_workspace_id, v_patient_id, v_user_id,
    p_title, p_description, p_goal_type
  )
  RETURNING goal_id INTO v_goal_id;

  -- Create missions and link them
  FOR v_mission IN SELECT * FROM jsonb_array_elements(p_missions)
  LOOP
    v_sort_order := v_sort_order + 1;

    -- Create task for this mission
    INSERT INTO task (
      workspace_id, patient_id,
      title, description, points,
      assigned_to_user_id, created_by_user_id,
      task_type_key, status,
      assigned_day, requires_same_day_completion, must_do
    ) VALUES (
      v_workspace_id, v_patient_id,
      v_mission->>'title',
      v_mission->>'description',
      COALESCE((v_mission->>'points')::INT, 10),
      v_user_id, v_user_id,
      'one_time', 'active',
      CURRENT_DATE, true,
      COALESCE((v_mission->>'must_do')::BOOLEAN, false)
    )
    RETURNING task_id INTO v_task_id;

    -- Link task to goal
    INSERT INTO goal_item (goal_id, task_id, sort_order)
    VALUES (v_goal_id, v_task_id, v_sort_order);
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'goal_id', v_goal_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION create_goal_with_missions(TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- =============================================================================
-- RPC: get_goals_by_type
-- Returns goals of a given type with their linked missions
-- =============================================================================

CREATE OR REPLACE FUNCTION get_goals_by_type(
  p_goal_type TEXT DEFAULT 'quest'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_workspace_id UUID;
  v_patient_id UUID;
  v_goals JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated', 'goals', '[]'::jsonb);
  END IF;

  SELECT wm.workspace_id INTO v_workspace_id
  FROM workspace_membership wm
  WHERE wm.user_id = v_user_id AND wm.status = 'active'
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No workspace', 'goals', '[]'::jsonb);
  END IF;

  SELECT pp.patient_id INTO v_patient_id
  FROM patient_profile pp
  WHERE pp.workspace_id = v_workspace_id
  LIMIT 1;

  -- Build goals with linked missions
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'goal_id', g.goal_id,
      'workspace_id', g.workspace_id,
      'patient_id', g.patient_id,
      'created_by_user_id', g.created_by_user_id,
      'title', g.title,
      'description', g.description,
      'goal_type', g.goal_type,
      'status', g.status,
      'completed_at', g.completed_at,
      'created_at', g.created_at,
      'updated_at', g.updated_at,
      'missions', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'task_id', t.task_id,
            'title', t.title,
            'description', t.description,
            'points', t.points,
            'must_do', t.must_do,
            'status', t.status,
            'task_type_key', t.task_type_key,
            'task_instance', (
              SELECT jsonb_build_object(
                'task_instance_id', ti.task_instance_id,
                'completion_status', ti.completion_status,
                'completed_at', ti.completed_at,
                'points_awarded', ti.points_awarded
              )
              FROM task_instance ti
              WHERE ti.task_id = t.task_id
                AND ti.completion_status = 'done'
              ORDER BY ti.completed_at DESC
              LIMIT 1
            )
          )
          ORDER BY gi.sort_order
        )
        FROM goal_item gi
        JOIN task t ON t.task_id = gi.task_id
        WHERE gi.goal_id = g.goal_id
      ), '[]'::jsonb)
    )
    ORDER BY g.created_at DESC
  ), '[]'::jsonb)
  INTO v_goals
  FROM goal g
  WHERE g.workspace_id = v_workspace_id
    AND g.patient_id = v_patient_id
    AND g.goal_type = p_goal_type
    AND g.status = 'active';

  RETURN jsonb_build_object('success', true, 'goals', v_goals);
END;
$$;

GRANT EXECUTE ON FUNCTION get_goals_by_type(TEXT) TO authenticated;

-- =============================================================================
-- RPC: delete_goal
-- Deletes a goal (cascade handles goal_items)
-- =============================================================================

CREATE OR REPLACE FUNCTION delete_goal(
  p_goal_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_workspace_id UUID;
  v_goal RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Verify goal exists and belongs to user's workspace
  SELECT g.* INTO v_goal
  FROM goal g
  JOIN workspace_membership wm ON wm.workspace_id = g.workspace_id
  WHERE g.goal_id = p_goal_id
    AND wm.user_id = v_user_id
    AND wm.status = 'active';

  IF v_goal IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Goal not found');
  END IF;

  DELETE FROM goal WHERE goal_id = p_goal_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION delete_goal(UUID) TO authenticated;

COMMENT ON FUNCTION create_goal_with_missions IS 'Creates a goal with inline mission creation';
COMMENT ON FUNCTION get_goals_by_type IS 'Gets goals by type (destiny/quest) with linked missions';
COMMENT ON FUNCTION delete_goal IS 'Deletes a goal and its linked items';
