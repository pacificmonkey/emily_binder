-- Fix get_admin_dashboard_stats: wrong column names
--   coin_ledger_entry.created_at → occurred_at
--   task_instance.canonical_date → assigned_day

CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coins_this_week int;
  v_active_streaks int;
  v_tasks_today int;
  v_tasks_completed_today int;
BEGIN
  -- Must be admin
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT COALESCE(SUM(delta), 0) INTO v_coins_this_week
  FROM coin_ledger_entry
  WHERE delta > 0 AND occurred_at >= date_trunc('week', now());

  SELECT COUNT(*) INTO v_active_streaks
  FROM streak_state WHERE status = 'ongoing';

  SELECT COUNT(*) INTO v_tasks_completed_today
  FROM task_instance WHERE assigned_day = CURRENT_DATE AND completion_status = 'done';

  SELECT COUNT(*) INTO v_tasks_today
  FROM task_instance WHERE assigned_day = CURRENT_DATE;

  RETURN jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'coins_awarded_this_week', v_coins_this_week,
      'active_streak_count', v_active_streaks,
      'tasks_completed_today', v_tasks_completed_today,
      'tasks_total_today', v_tasks_today
    )
  );
END;
$$;
