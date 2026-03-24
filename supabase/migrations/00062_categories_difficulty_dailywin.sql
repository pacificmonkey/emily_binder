-- Migration: 00062_categories_difficulty_dailywin.sql
-- Description: Mission categories, difficulty levels, workspace config for daily win

-- =============================================================================
-- 1. ENUM TYPE
-- =============================================================================

CREATE TYPE mission_difficulty AS ENUM ('easy', 'medium', 'hard');

-- =============================================================================
-- 2. MISSION CATEGORY TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS mission_category (
  mission_category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6B7280',
  icon TEXT NOT NULL DEFAULT 'tag',
  base_points INT NOT NULL DEFAULT 5 CHECK (base_points >= 1),
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, name)
);

CREATE INDEX IF NOT EXISTS idx_mission_category_workspace ON mission_category(workspace_id);

CREATE TRIGGER mission_category_updated_at
  BEFORE UPDATE ON mission_category
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE mission_category ENABLE ROW LEVEL SECURITY;

CREATE POLICY mission_category_select ON mission_category
  FOR SELECT TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_membership
    WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY mission_category_admin ON mission_category
  FOR ALL TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_membership
    WHERE user_id = auth.uid() AND status = 'active' AND role_key = 'admin'
  ))
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM workspace_membership
    WHERE user_id = auth.uid() AND status = 'active' AND role_key = 'admin'
  ));

-- =============================================================================
-- 3. WORKSPACE CONFIG TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS workspace_config (
  workspace_config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL UNIQUE REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  daily_win_vp_target INT NOT NULL DEFAULT 15 CHECK (daily_win_vp_target >= 1),
  daily_win_enabled BOOLEAN NOT NULL DEFAULT true,
  daily_win_streak_enabled BOOLEAN NOT NULL DEFAULT true,
  difficulty_multiplier_easy NUMERIC(4,2) NOT NULL DEFAULT 0.50,
  difficulty_multiplier_medium NUMERIC(4,2) NOT NULL DEFAULT 1.00,
  difficulty_multiplier_hard NUMERIC(4,2) NOT NULL DEFAULT 2.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER workspace_config_updated_at
  BEFORE UPDATE ON workspace_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE workspace_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY workspace_config_select ON workspace_config
  FOR SELECT TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_membership
    WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY workspace_config_admin ON workspace_config
  FOR ALL TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_membership
    WHERE user_id = auth.uid() AND status = 'active' AND role_key = 'admin'
  ))
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM workspace_membership
    WHERE user_id = auth.uid() AND status = 'active' AND role_key = 'admin'
  ));

-- =============================================================================
-- 4. ALTER EXISTING TABLES
-- =============================================================================

ALTER TABLE task ADD COLUMN IF NOT EXISTS mission_category_id UUID REFERENCES mission_category(mission_category_id) ON DELETE SET NULL;
ALTER TABLE task ADD COLUMN IF NOT EXISTS difficulty mission_difficulty NOT NULL DEFAULT 'medium';
ALTER TABLE recurrence_rule ADD COLUMN IF NOT EXISTS target_completions_per_period INT;

CREATE INDEX IF NOT EXISTS idx_task_mission_category ON task(mission_category_id);

-- =============================================================================
-- 5. SEED DATA
-- =============================================================================

-- Seed 5 categories per existing workspace
INSERT INTO mission_category (workspace_id, name, color, icon, base_points, sort_order)
SELECT w.workspace_id, cat.name, cat.color, cat.icon, cat.base_points, cat.sort_order
FROM workspace w
CROSS JOIN (VALUES
  ('Financial',  '#10B981', 'dollarsign.circle', 5, 0),
  ('Hygiene',    '#3B82F6', 'shower.fill',       5, 1),
  ('Health',     '#EF4444', 'heart.fill',        5, 2),
  ('Education',  '#8B5CF6', 'book.fill',         5, 3),
  ('Household',  '#F59E0B', 'house.fill',        5, 4)
) AS cat(name, color, icon, base_points, sort_order)
ON CONFLICT (workspace_id, name) DO NOTHING;

-- Seed workspace_config for existing workspaces
INSERT INTO workspace_config (workspace_id)
SELECT w.workspace_id FROM workspace w
ON CONFLICT (workspace_id) DO NOTHING;

-- =============================================================================
-- 6. RPC: GET MISSION CATEGORIES
-- =============================================================================

CREATE OR REPLACE FUNCTION get_mission_categories()
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
      'mission_category_id', mc.mission_category_id,
      'name', mc.name,
      'color', mc.color,
      'icon', mc.icon,
      'base_points', mc.base_points,
      'sort_order', mc.sort_order,
      'is_active', mc.is_active
    ) ORDER BY mc.sort_order, mc.name
  ), '[]'::jsonb)
  INTO v_result
  FROM mission_category mc
  WHERE mc.workspace_id = v_workspace_id AND mc.is_active = true;

  RETURN jsonb_build_object('success', true, 'categories', v_result);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 7. RPC: CREATE MISSION CATEGORY (admin only)
-- =============================================================================

CREATE OR REPLACE FUNCTION create_mission_category(
  p_name TEXT,
  p_color TEXT DEFAULT '#6B7280',
  p_icon TEXT DEFAULT 'tag',
  p_base_points INT DEFAULT 5,
  p_sort_order INT DEFAULT 0
) RETURNS JSONB AS $$
DECLARE
  v_workspace_id UUID;
  v_id UUID;
BEGIN
  SELECT wm.workspace_id INTO v_workspace_id
  FROM workspace_membership wm
  WHERE wm.user_id = auth.uid() AND wm.status = 'active' AND wm.role_key = 'admin'
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;

  INSERT INTO mission_category (workspace_id, name, color, icon, base_points, sort_order)
  VALUES (v_workspace_id, p_name, p_color, p_icon, p_base_points, p_sort_order)
  RETURNING mission_category_id INTO v_id;

  RETURN jsonb_build_object('success', true, 'mission_category_id', v_id);
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('success', false, 'error', 'Category with this name already exists');
WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 8. RPC: UPDATE MISSION CATEGORY (admin only)
-- =============================================================================

CREATE OR REPLACE FUNCTION update_mission_category(
  p_mission_category_id UUID,
  p_name TEXT DEFAULT NULL,
  p_color TEXT DEFAULT NULL,
  p_icon TEXT DEFAULT NULL,
  p_base_points INT DEFAULT NULL,
  p_sort_order INT DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_workspace_id UUID;
BEGIN
  SELECT wm.workspace_id INTO v_workspace_id
  FROM workspace_membership wm
  WHERE wm.user_id = auth.uid() AND wm.status = 'active' AND wm.role_key = 'admin'
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;

  UPDATE mission_category SET
    name = COALESCE(p_name, name),
    color = COALESCE(p_color, color),
    icon = COALESCE(p_icon, icon),
    base_points = COALESCE(p_base_points, base_points),
    sort_order = COALESCE(p_sort_order, sort_order),
    is_active = COALESCE(p_is_active, is_active)
  WHERE mission_category_id = p_mission_category_id
    AND workspace_id = v_workspace_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Category not found');
  END IF;

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('success', false, 'error', 'Category with this name already exists');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 9. RPC: DELETE MISSION CATEGORY (admin only)
-- =============================================================================

CREATE OR REPLACE FUNCTION delete_mission_category(
  p_mission_category_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_workspace_id UUID;
  v_has_tasks BOOLEAN;
BEGIN
  SELECT wm.workspace_id INTO v_workspace_id
  FROM workspace_membership wm
  WHERE wm.user_id = auth.uid() AND wm.status = 'active' AND wm.role_key = 'admin'
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;

  -- Check if active tasks reference this category
  SELECT EXISTS(
    SELECT 1 FROM task
    WHERE mission_category_id = p_mission_category_id AND status = 'active'
  ) INTO v_has_tasks;

  IF v_has_tasks THEN
    -- Soft delete: mark inactive
    UPDATE mission_category
    SET is_active = false
    WHERE mission_category_id = p_mission_category_id AND workspace_id = v_workspace_id;
  ELSE
    DELETE FROM mission_category
    WHERE mission_category_id = p_mission_category_id AND workspace_id = v_workspace_id;
  END IF;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Category not found');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 10. RPC: GET WORKSPACE CONFIG
-- =============================================================================

CREATE OR REPLACE FUNCTION get_workspace_config()
RETURNS JSONB AS $$
DECLARE
  v_workspace_id UUID;
  v_config RECORD;
BEGIN
  SELECT wm.workspace_id INTO v_workspace_id
  FROM workspace_membership wm
  WHERE wm.user_id = auth.uid() AND wm.status = 'active'
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace');
  END IF;

  -- Auto-create config if missing
  INSERT INTO workspace_config (workspace_id)
  VALUES (v_workspace_id)
  ON CONFLICT (workspace_id) DO NOTHING;

  SELECT * INTO v_config
  FROM workspace_config
  WHERE workspace_id = v_workspace_id;

  RETURN jsonb_build_object(
    'success', true,
    'config', jsonb_build_object(
      'workspace_config_id', v_config.workspace_config_id,
      'daily_win_vp_target', v_config.daily_win_vp_target,
      'daily_win_enabled', v_config.daily_win_enabled,
      'daily_win_streak_enabled', v_config.daily_win_streak_enabled,
      'difficulty_multiplier_easy', v_config.difficulty_multiplier_easy,
      'difficulty_multiplier_medium', v_config.difficulty_multiplier_medium,
      'difficulty_multiplier_hard', v_config.difficulty_multiplier_hard
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 11. RPC: UPDATE WORKSPACE CONFIG (admin only)
-- =============================================================================

CREATE OR REPLACE FUNCTION update_workspace_config(
  p_daily_win_vp_target INT DEFAULT NULL,
  p_daily_win_enabled BOOLEAN DEFAULT NULL,
  p_daily_win_streak_enabled BOOLEAN DEFAULT NULL,
  p_difficulty_multiplier_easy NUMERIC DEFAULT NULL,
  p_difficulty_multiplier_medium NUMERIC DEFAULT NULL,
  p_difficulty_multiplier_hard NUMERIC DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_workspace_id UUID;
BEGIN
  SELECT wm.workspace_id INTO v_workspace_id
  FROM workspace_membership wm
  WHERE wm.user_id = auth.uid() AND wm.status = 'active' AND wm.role_key = 'admin'
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;

  -- Auto-create config if missing
  INSERT INTO workspace_config (workspace_id)
  VALUES (v_workspace_id)
  ON CONFLICT (workspace_id) DO NOTHING;

  UPDATE workspace_config SET
    daily_win_vp_target = COALESCE(p_daily_win_vp_target, daily_win_vp_target),
    daily_win_enabled = COALESCE(p_daily_win_enabled, daily_win_enabled),
    daily_win_streak_enabled = COALESCE(p_daily_win_streak_enabled, daily_win_streak_enabled),
    difficulty_multiplier_easy = COALESCE(p_difficulty_multiplier_easy, difficulty_multiplier_easy),
    difficulty_multiplier_medium = COALESCE(p_difficulty_multiplier_medium, difficulty_multiplier_medium),
    difficulty_multiplier_hard = COALESCE(p_difficulty_multiplier_hard, difficulty_multiplier_hard)
  WHERE workspace_id = v_workspace_id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 12. RPC: GET DAILY WIN STATUS
-- =============================================================================

CREATE OR REPLACE FUNCTION get_daily_win_status()
RETURNS JSONB AS $$
DECLARE
  v_workspace_id UUID;
  v_patient_id UUID;
  v_vp_earned INT;
  v_config RECORD;
BEGIN
  SELECT wm.workspace_id INTO v_workspace_id
  FROM workspace_membership wm
  WHERE wm.user_id = auth.uid() AND wm.status = 'active'
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace');
  END IF;

  SELECT pp.patient_id INTO v_patient_id
  FROM patient_profile pp
  WHERE pp.workspace_id = v_workspace_id
  LIMIT 1;

  -- Get workspace config
  INSERT INTO workspace_config (workspace_id)
  VALUES (v_workspace_id)
  ON CONFLICT (workspace_id) DO NOTHING;

  SELECT * INTO v_config
  FROM workspace_config
  WHERE workspace_id = v_workspace_id;

  -- Sum today's points from completed task instances
  SELECT COALESCE(SUM(ti.points_awarded), 0) INTO v_vp_earned
  FROM task_instance ti
  WHERE ti.workspace_id = v_workspace_id
    AND ti.patient_id = v_patient_id
    AND ti.assigned_day = CURRENT_DATE
    AND ti.completion_status = 'done';

  RETURN jsonb_build_object(
    'success', true,
    'vp_earned_today', v_vp_earned,
    'threshold', v_config.daily_win_vp_target,
    'is_won', v_vp_earned >= v_config.daily_win_vp_target,
    'daily_win_enabled', v_config.daily_win_enabled
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 13. REPLACE CREATE_TASK with category/difficulty/recurrence support
-- =============================================================================

-- Drop old signature first to avoid ambiguity
DROP FUNCTION IF EXISTS create_task(TEXT, TEXT, INT, task_type_key, DATE, BOOLEAN, BOOLEAN);

CREATE OR REPLACE FUNCTION create_task(
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_points INT DEFAULT NULL,
  p_task_type_key task_type_key DEFAULT 'one_time',
  p_assigned_day DATE DEFAULT NULL,
  p_requires_same_day_completion BOOLEAN DEFAULT true,
  p_must_do BOOLEAN DEFAULT false,
  p_mission_category_id UUID DEFAULT NULL,
  p_difficulty mission_difficulty DEFAULT 'medium',
  p_frequency recurrence_frequency DEFAULT NULL,
  p_interval INT DEFAULT 1,
  p_days_of_week TEXT[] DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_time_window_label TEXT DEFAULT NULL,
  p_target_completions_per_period INT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_workspace_id UUID;
  v_patient_id UUID;
  v_task_id UUID;
  v_task RECORD;
  v_computed_points INT;
  v_cat_base_points INT;
  v_multiplier NUMERIC;
  v_config RECORD;
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

  -- Compute points: if p_points provided, use it; otherwise compute from category + difficulty
  IF p_points IS NOT NULL THEN
    v_computed_points := p_points;
  ELSIF p_mission_category_id IS NOT NULL THEN
    SELECT mc.base_points INTO v_cat_base_points
    FROM mission_category mc
    WHERE mc.mission_category_id = p_mission_category_id AND mc.workspace_id = v_workspace_id;

    IF v_cat_base_points IS NULL THEN
      v_computed_points := 5; -- fallback
    ELSE
      -- Get difficulty multiplier from workspace config
      INSERT INTO workspace_config (workspace_id)
      VALUES (v_workspace_id)
      ON CONFLICT (workspace_id) DO NOTHING;

      SELECT
        CASE p_difficulty
          WHEN 'easy' THEN wc.difficulty_multiplier_easy
          WHEN 'hard' THEN wc.difficulty_multiplier_hard
          ELSE wc.difficulty_multiplier_medium
        END INTO v_multiplier
      FROM workspace_config wc
      WHERE wc.workspace_id = v_workspace_id;

      v_computed_points := GREATEST(1, ROUND(v_cat_base_points * COALESCE(v_multiplier, 1.0)));
    END IF;
  ELSE
    v_computed_points := 10; -- default when no category
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
    mission_category_id,
    difficulty,
    created_at,
    updated_at
  ) VALUES (
    v_workspace_id,
    v_patient_id,
    p_title,
    p_description,
    v_computed_points,
    v_user_id,
    v_user_id,
    p_task_type_key,
    'active',
    COALESCE(p_assigned_day, CURRENT_DATE),
    p_requires_same_day_completion,
    p_must_do,
    p_mission_category_id,
    p_difficulty,
    now(),
    now()
  )
  RETURNING task_id INTO v_task_id;

  -- Create recurrence rule if recurring and frequency is set
  IF p_task_type_key = 'recurring' AND p_frequency IS NOT NULL THEN
    INSERT INTO recurrence_rule (
      workspace_id,
      task_id,
      frequency,
      interval,
      days_of_week,
      start_date,
      end_date,
      time_window_label,
      target_completions_per_period
    ) VALUES (
      v_workspace_id,
      v_task_id,
      p_frequency,
      COALESCE(p_interval, 1),
      p_days_of_week,
      COALESCE(p_start_date, CURRENT_DATE),
      p_end_date,
      p_time_window_label,
      p_target_completions_per_period
    );
  END IF;

  -- Fetch created task for response
  SELECT * INTO v_task FROM task WHERE task_id = v_task_id;

  RETURN jsonb_build_object(
    'success', true,
    'task_id', v_task_id,
    'task', to_jsonb(v_task)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_task(TEXT, TEXT, INT, task_type_key, DATE, BOOLEAN, BOOLEAN, UUID, mission_difficulty, recurrence_frequency, INT, TEXT[], DATE, DATE, TEXT, INT) TO authenticated;

-- =============================================================================
-- 14. REPLACE GET_TODAYS_TASKS with category data
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

  -- Get tasks with instances and category data
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
      'mission_category_id', t.mission_category_id,
      'difficulty', t.difficulty,
      'created_at', t.created_at,
      'updated_at', t.updated_at,
      'category', (
        SELECT jsonb_build_object(
          'mission_category_id', mc.mission_category_id,
          'name', mc.name,
          'color', mc.color,
          'icon', mc.icon,
          'base_points', mc.base_points
        )
        FROM mission_category mc
        WHERE mc.mission_category_id = t.mission_category_id
      ),
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
-- 15. GRANTS FOR NEW FUNCTIONS
-- =============================================================================

GRANT EXECUTE ON FUNCTION get_mission_categories() TO authenticated;
GRANT EXECUTE ON FUNCTION create_mission_category(TEXT, TEXT, TEXT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_mission_category(UUID, TEXT, TEXT, TEXT, INT, INT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_mission_category(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_workspace_config() TO authenticated;
GRANT EXECUTE ON FUNCTION update_workspace_config(INT, BOOLEAN, BOOLEAN, NUMERIC, NUMERIC, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_win_status() TO authenticated;
