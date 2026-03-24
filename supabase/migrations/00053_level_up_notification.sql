-- Add level-up in-app notification when user reaches a new level
CREATE OR REPLACE FUNCTION recompute_user_progress(p_patient_id UUID) RETURNS VOID AS $$
DECLARE
  v_total_points INTEGER;
  v_workspace_id UUID;
  v_curve_id UUID;
  v_max_level INTEGER;
  v_level_data RECORD;
  v_old_level INTEGER;
BEGIN
  -- Get patient's workspace and level system
  SELECT ls.workspace_id, ls.curve_id, ls.max_level
  INTO v_workspace_id, v_curve_id, v_max_level
  FROM level_system ls
  WHERE ls.patient_id = p_patient_id;

  IF v_curve_id IS NULL THEN
    RETURN;
  END IF;

  -- Get old level before update
  SELECT current_level INTO v_old_level
  FROM user_progress
  WHERE patient_id = p_patient_id;

  -- Sum all points from ledger
  SELECT COALESCE(SUM(delta), 0)
  INTO v_total_points
  FROM points_ledger_entry
  WHERE patient_id = p_patient_id;

  -- Calculate level info
  SELECT * INTO v_level_data
  FROM calculate_level_from_points(v_curve_id, v_total_points, v_max_level);

  -- Upsert user progress
  INSERT INTO user_progress (
    workspace_id, patient_id, total_points,
    current_level, points_into_level, points_to_next_level,
    last_recomputed_at
  ) VALUES (
    v_workspace_id, p_patient_id, v_total_points,
    v_level_data.current_level, v_level_data.points_into_level, v_level_data.points_to_next_level,
    now()
  )
  ON CONFLICT (patient_id) DO UPDATE SET
    total_points = EXCLUDED.total_points,
    current_level = EXCLUDED.current_level,
    points_into_level = EXCLUDED.points_into_level,
    points_to_next_level = EXCLUDED.points_to_next_level,
    last_recomputed_at = now();

  -- Fire level-up notification if level increased
  IF v_old_level IS NOT NULL AND v_level_data.current_level > v_old_level THEN
    INSERT INTO notification (
      workspace_id,
      patient_id,
      type,
      title,
      body,
      channel,
      status,
      created_at,
      updated_at
    ) VALUES (
      v_workspace_id,
      p_patient_id,
      'info',
      'Level Up! You reached Level ' || v_level_data.current_level,
      'Congratulations! Keep earning points to reach the next level.',
      'in_app',
      'delivered',
      now(),
      now()
    );
  END IF;
END;
$$ LANGUAGE plpgsql;
