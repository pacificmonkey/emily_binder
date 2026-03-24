-- ============================================================================
-- Migration: 00059_streak_enhancements.sql
-- Description: Add new streak templates, emoji/description columns, and
--              update RPCs for enhanced streak customization
-- ============================================================================

-- 1. Add new enum values to streak_template_key
ALTER TYPE streak_template_key ADD VALUE IF NOT EXISTS 'complete_all_tasks';
ALTER TYPE streak_template_key ADD VALUE IF NOT EXISTS 'earn_vp_target';

-- 2. Add new columns to streak_definition
ALTER TABLE streak_definition
  ADD COLUMN IF NOT EXISTS emoji TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN streak_definition.emoji IS 'Custom emoji icon for streak display (e.g. 🏆). Falls back to status-based emoji if null.';
COMMENT ON COLUMN streak_definition.description IS 'Optional short description shown in streak detail view.';

-- 3. Update check_streak_satisfied() to handle new templates
CREATE OR REPLACE FUNCTION check_streak_satisfied(
  p_streak_definition_id UUID,
  p_patient_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_definition RECORD;
  v_period_key TEXT;
  v_completed_count INTEGER;
  v_total_count INTEGER;
  v_must_do_count INTEGER;
  v_must_do_completed INTEGER;
  v_vp_earned INTEGER;
BEGIN
  -- Get streak definition
  SELECT * INTO v_definition
  FROM streak_definition
  WHERE streak_definition_id = p_streak_definition_id;

  IF v_definition IS NULL THEN
    RETURN false;
  END IF;

  -- Get current period key
  v_period_key := get_period_key(v_definition.period, v_definition.timezone);

  -- Check based on template
  IF v_definition.template_key = 'complete_n_filtered' THEN
    -- Count completed tasks matching filter in current period
    SELECT COUNT(*) INTO v_completed_count
    FROM task_instance ti
    JOIN task t ON t.task_id = ti.task_id
    WHERE ti.patient_id = p_patient_id
      AND ti.completion_status = 'done'
      AND (
        (v_definition.period = 'daily' AND ti.scheduled_date = v_period_key::date)
        OR (v_definition.period = 'weekly' AND ti.scheduled_date >= date_trunc('week', now() AT TIME ZONE v_definition.timezone)::date)
      )
      -- Apply filters from filter_config if present
      AND (
        v_definition.filter_config IS NULL
        OR v_definition.filter_config->>'must_do_only' IS NULL
        OR v_definition.filter_config->>'must_do_only' = 'false'
        OR t.is_must_do = true
      );

    RETURN v_completed_count >= COALESCE(v_definition.count_threshold, 1);

  ELSIF v_definition.template_key = 'complete_any_filtered' THEN
    -- At least one task completed
    SELECT COUNT(*) INTO v_completed_count
    FROM task_instance ti
    WHERE ti.patient_id = p_patient_id
      AND ti.completion_status = 'done'
      AND (
        (v_definition.period = 'daily' AND ti.scheduled_date = v_period_key::date)
        OR (v_definition.period = 'weekly' AND ti.scheduled_date >= date_trunc('week', now() AT TIME ZONE v_definition.timezone)::date)
      );

    RETURN v_completed_count >= 1;

  ELSIF v_definition.template_key = 'perfect_must_do' THEN
    -- All must-do tasks completed
    SELECT COUNT(*), SUM(CASE WHEN ti.completion_status = 'done' THEN 1 ELSE 0 END)
    INTO v_must_do_count, v_must_do_completed
    FROM task_instance ti
    JOIN task t ON t.task_id = ti.task_id
    WHERE ti.patient_id = p_patient_id
      AND t.is_must_do = true
      AND (
        (v_definition.period = 'daily' AND ti.scheduled_date = v_period_key::date)
        OR (v_definition.period = 'weekly' AND ti.scheduled_date >= date_trunc('week', now() AT TIME ZONE v_definition.timezone)::date)
      );

    RETURN v_must_do_count > 0 AND v_must_do_count = v_must_do_completed;

  ELSIF v_definition.template_key = 'complete_all_tasks' THEN
    -- ALL scheduled tasks completed (not just must-do)
    SELECT COUNT(*), SUM(CASE WHEN ti.completion_status = 'done' THEN 1 ELSE 0 END)
    INTO v_total_count, v_completed_count
    FROM task_instance ti
    WHERE ti.patient_id = p_patient_id
      AND (
        (v_definition.period = 'daily' AND ti.scheduled_date = v_period_key::date)
        OR (v_definition.period = 'weekly' AND ti.scheduled_date >= date_trunc('week', now() AT TIME ZONE v_definition.timezone)::date)
      );

    RETURN v_total_count > 0 AND v_total_count = v_completed_count;

  ELSIF v_definition.template_key = 'earn_vp_target' THEN
    -- Earn at least count_threshold VP from completed tasks in the period
    SELECT COALESCE(SUM(t.points), 0) INTO v_vp_earned
    FROM task_instance ti
    JOIN task t ON t.task_id = ti.task_id
    WHERE ti.patient_id = p_patient_id
      AND ti.completion_status = 'done'
      AND (
        (v_definition.period = 'daily' AND ti.scheduled_date = v_period_key::date)
        OR (v_definition.period = 'weekly' AND ti.scheduled_date >= date_trunc('week', now() AT TIME ZONE v_definition.timezone)::date)
      );

    RETURN v_vp_earned >= COALESCE(v_definition.count_threshold, 10);

  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql;

-- 4. Update get_streaks() to return emoji and description
CREATE OR REPLACE FUNCTION get_streaks()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
  v_patient_id UUID;
  v_streaks JSONB;
BEGIN
  -- Get workspace and patient from membership
  SELECT wm.workspace_id, pp.patient_id
  INTO v_workspace_id, v_patient_id
  FROM workspace_membership wm
  JOIN patient_profile pp ON pp.workspace_id = wm.workspace_id AND pp.patient_id = wm.user_id
  WHERE wm.user_id = auth.uid() AND wm.status = 'active'
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace membership');
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'streak_definition_id', sd.streak_definition_id,
      'name', sd.name,
      'status', sd.status,
      'template_key', sd.template_key,
      'period', sd.period,
      'filter_config', sd.filter_config,
      'count_threshold', sd.count_threshold,
      'coin_reward', sd.coin_reward,
      'bonus_milestones', sd.bonus_milestones,
      'break_behavior', sd.break_behavior,
      'emoji', sd.emoji,
      'description', sd.description,
      'state', CASE WHEN ss.streak_state_id IS NOT NULL THEN
        jsonb_build_object(
          'streak_state_id', ss.streak_state_id,
          'status', ss.status,
          'current_count', ss.current_count,
          'best_count', ss.best_count,
          'current_period_key', ss.current_period_key,
          'period_satisfied', ss.period_satisfied,
          'last_incremented_at', ss.last_incremented_at,
          'tokens_used_this_month', ss.tokens_used_this_month
        )
      ELSE NULL END
    ) ORDER BY sd.name
  ), '[]'::jsonb)
  INTO v_streaks
  FROM streak_definition sd
  LEFT JOIN streak_state ss ON ss.streak_definition_id = sd.streak_definition_id
    AND ss.patient_id = v_patient_id
  WHERE sd.patient_id = v_patient_id
    AND sd.status = 'active';

  RETURN jsonb_build_object('success', true, 'streaks', v_streaks);
END;
$$;

-- 5. Update create_streak_definition() to accept emoji and description
CREATE OR REPLACE FUNCTION create_streak_definition(
  p_name TEXT,
  p_template_key streak_template_key,
  p_period streak_period,
  p_coin_reward INTEGER DEFAULT 0,
  p_count_threshold INTEGER DEFAULT NULL,
  p_filter_config JSONB DEFAULT NULL,
  p_bonus_milestones JSONB DEFAULT NULL,
  p_break_behavior streak_break_behavior DEFAULT 'break',
  p_shield_token_item_id UUID DEFAULT NULL,
  p_auto_use_token BOOLEAN DEFAULT true,
  p_max_token_uses_per_month INTEGER DEFAULT NULL,
  p_timezone TEXT DEFAULT 'America/Los_Angeles',
  p_emoji TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
  v_patient_id UUID;
  v_streak_definition_id UUID;
  v_streak_state_id UUID;
  v_period_key TEXT;
BEGIN
  -- Verify admin role
  SELECT wm.workspace_id, pp.patient_id
  INTO v_workspace_id, v_patient_id
  FROM workspace_membership wm
  JOIN patient_profile pp ON pp.workspace_id = wm.workspace_id AND pp.patient_id = wm.user_id
  WHERE wm.user_id = auth.uid() AND wm.status = 'active' AND wm.role_key = 'admin'
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;

  -- Create streak definition
  INSERT INTO streak_definition (
    workspace_id, patient_id, name, template_key, period, coin_reward,
    count_threshold, filter_config, bonus_milestones, break_behavior,
    shield_token_item_id, auto_use_token, max_token_uses_per_month,
    timezone, emoji, description, created_by_user_id
  )
  VALUES (
    v_workspace_id, v_patient_id, p_name, p_template_key, p_period, p_coin_reward,
    p_count_threshold, p_filter_config, p_bonus_milestones, p_break_behavior,
    p_shield_token_item_id, p_auto_use_token, p_max_token_uses_per_month,
    p_timezone, p_emoji, p_description, auth.uid()
  )
  RETURNING streak_definition_id INTO v_streak_definition_id;

  -- Initialize streak state
  v_period_key := get_period_key(p_period, p_timezone);

  INSERT INTO streak_state (
    workspace_id, streak_definition_id, patient_id, current_period_key
  )
  VALUES (
    v_workspace_id, v_streak_definition_id, v_patient_id, v_period_key
  )
  RETURNING streak_state_id INTO v_streak_state_id;

  RETURN jsonb_build_object(
    'success', true,
    'streak_definition_id', v_streak_definition_id,
    'streak_state_id', v_streak_state_id
  );
END;
$$;
