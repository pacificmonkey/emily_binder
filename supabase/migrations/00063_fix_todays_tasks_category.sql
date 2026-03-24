-- =============================================================================
-- Fix get_todays_tasks category subquery and get_daily_win_status error response
-- =============================================================================

-- 1. Fix get_todays_tasks: include sort_order and is_active in category subquery
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
          'base_points', mc.base_points,
          'sort_order', mc.sort_order,
          'is_active', mc.is_active
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

-- 2. Fix get_daily_win_status: always return all fields even on error
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
    RETURN jsonb_build_object(
      'success', true,
      'vp_earned_today', 0,
      'threshold', 15,
      'is_won', false,
      'daily_win_enabled', false
    );
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

-- 3. Fix get_workspace_config: always return all fields even on error
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
    RETURN jsonb_build_object(
      'success', true,
      'config', jsonb_build_object(
        'daily_win_vp_target', 15,
        'daily_win_enabled', true,
        'daily_win_streak_enabled', true,
        'difficulty_multiplier_easy', 0.50,
        'difficulty_multiplier_medium', 1.00,
        'difficulty_multiplier_hard', 2.00
      )
    );
  END IF;

  -- Ensure config row exists
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

-- 4. Fix get_mission_categories: return safe default on error
CREATE OR REPLACE FUNCTION get_mission_categories()
RETURNS JSONB AS $$
DECLARE
  v_workspace_id UUID;
  v_categories JSONB;
BEGIN
  SELECT wm.workspace_id INTO v_workspace_id
  FROM workspace_membership wm
  WHERE wm.user_id = auth.uid() AND wm.status = 'active'
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', true, 'categories', '[]'::jsonb);
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
    )
    ORDER BY mc.sort_order, mc.name
  ), '[]'::jsonb)
  INTO v_categories
  FROM mission_category mc
  WHERE mc.workspace_id = v_workspace_id AND mc.is_active = true;

  RETURN jsonb_build_object('success', true, 'categories', v_categories);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
