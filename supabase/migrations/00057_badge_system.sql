-- Migration: 00057_badge_system.sql
-- Description: Badge definitions and user_badge tracking table + RPC

CREATE TABLE IF NOT EXISTS badge_definition (
  badge_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  emoji TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_badge (
  user_badge_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badge_definition(badge_id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(patient_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_badge_patient ON user_badge(patient_id);
ALTER TABLE user_badge ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_badge_select ON user_badge
  FOR SELECT TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_membership
    WHERE user_id = auth.uid() AND status = 'active'
  ));

-- Seed badge definitions
INSERT INTO badge_definition (slug, name, description, emoji, category, sort_order) VALUES
  ('first_step', 'First Step', 'Complete your first task', '🌱', 'tasks', 1),
  ('week_warrior', 'Week Warrior', 'Maintain a 7-day streak', '🔥', 'streaks', 2),
  ('month_master', 'Month Master', 'Maintain a 30-day streak', '👑', 'streaks', 3),
  ('half_century', 'Half Century', 'Complete 50 tasks', '⭐', 'tasks', 4),
  ('centurion', 'Centurion', 'Complete 100 tasks', '🏆', 'tasks', 5),
  ('first_purchase', 'First Purchase', 'Buy your first store item', '🛍️', 'economy', 6),
  ('level_five', 'Level 5', 'Reach level 5', '🎯', 'progress', 7),
  ('shopaholic', 'Shopaholic', 'Purchase 10 store items', '💎', 'economy', 8)
ON CONFLICT (slug) DO NOTHING;

-- RPC to get user badges with definitions
CREATE OR REPLACE FUNCTION get_user_badges()
RETURNS JSONB AS $$
DECLARE
  v_patient_id UUID;
  v_workspace_id UUID;
  v_result JSONB;
BEGIN
  SELECT pp.patient_id, pp.workspace_id
  INTO v_patient_id, v_workspace_id
  FROM patient_profile pp
  JOIN workspace_membership wm ON wm.workspace_id = pp.workspace_id
  WHERE wm.user_id = auth.uid() AND wm.status = 'active'
  LIMIT 1;

  IF v_patient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No patient profile found');
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'badge_id', bd.badge_id,
      'slug', bd.slug,
      'name', bd.name,
      'description', bd.description,
      'emoji', bd.emoji,
      'category', bd.category,
      'earned', ub.earned_at IS NOT NULL,
      'earned_at', ub.earned_at
    ) ORDER BY bd.sort_order
  ), '[]'::jsonb)
  INTO v_result
  FROM badge_definition bd
  LEFT JOIN user_badge ub ON ub.badge_id = bd.badge_id AND ub.patient_id = v_patient_id;

  RETURN jsonb_build_object('success', true, 'badges', v_result);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC to check and award badges (called after task completion, purchase, etc.)
CREATE OR REPLACE FUNCTION check_and_award_badges(p_patient_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_workspace_id UUID;
  v_tasks_completed INT;
  v_max_streak INT;
  v_items_purchased INT;
  v_current_level INT;
  v_awarded TEXT[] := '{}';
  v_badge RECORD;
BEGIN
  SELECT workspace_id INTO v_workspace_id
  FROM patient_profile WHERE patient_id = p_patient_id;

  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Patient not found');
  END IF;

  -- Gather stats
  SELECT COUNT(*) INTO v_tasks_completed
  FROM task_instance WHERE patient_id = p_patient_id AND completion_status = 'done';

  SELECT COALESCE(MAX(ss.best_count), 0) INTO v_max_streak
  FROM streak_state ss
  JOIN streak s ON s.streak_id = ss.streak_id
  WHERE s.patient_id = p_patient_id;

  SELECT COUNT(*) INTO v_items_purchased
  FROM user_inventory WHERE patient_id = p_patient_id;

  SELECT COALESCE(current_level, 0) INTO v_current_level
  FROM user_progress WHERE patient_id = p_patient_id;

  -- Check each badge
  FOR v_badge IN
    SELECT badge_id, slug FROM badge_definition
    WHERE badge_id NOT IN (SELECT badge_id FROM user_badge WHERE patient_id = p_patient_id)
  LOOP
    IF (v_badge.slug = 'first_step' AND v_tasks_completed >= 1)
      OR (v_badge.slug = 'week_warrior' AND v_max_streak >= 7)
      OR (v_badge.slug = 'month_master' AND v_max_streak >= 30)
      OR (v_badge.slug = 'half_century' AND v_tasks_completed >= 50)
      OR (v_badge.slug = 'centurion' AND v_tasks_completed >= 100)
      OR (v_badge.slug = 'first_purchase' AND v_items_purchased >= 1)
      OR (v_badge.slug = 'level_five' AND v_current_level >= 5)
      OR (v_badge.slug = 'shopaholic' AND v_items_purchased >= 10)
    THEN
      INSERT INTO user_badge (workspace_id, patient_id, badge_id)
      VALUES (v_workspace_id, p_patient_id, v_badge.badge_id)
      ON CONFLICT DO NOTHING;
      v_awarded := array_append(v_awarded, v_badge.slug);
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'newly_awarded', to_jsonb(v_awarded));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_badges() TO authenticated;
GRANT EXECUTE ON FUNCTION check_and_award_badges(UUID) TO authenticated;
