-- ============================================================================
-- Migration: 00038_streaks_module.sql
-- Description: Streaks module - StreakDefinition, StreakState, StreakShieldUse
-- Schema Version: 1.3.0
-- ============================================================================

-- StreakDefinition: Admin-configured streaks with rewards
CREATE TABLE streak_definition (
  streak_definition_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status streak_status NOT NULL DEFAULT 'active',
  template_key streak_template_key NOT NULL,
  period streak_period NOT NULL,
  filter_config JSONB,  -- Task filters: {tags?, category_ids?, task_ids?, must_do_only?}
  count_threshold INTEGER,  -- For complete_n_filtered: how many tasks
  coin_reward INTEGER NOT NULL DEFAULT 0 CHECK (coin_reward >= 0),
  bonus_milestones JSONB,  -- [{days: 7, coins: 10}, {days: 30, coins: 50}]
  break_behavior streak_break_behavior NOT NULL DEFAULT 'break',
  shield_token_item_id UUID REFERENCES store_item(store_item_id) ON DELETE SET NULL,
  auto_use_token BOOLEAN NOT NULL DEFAULT true,
  max_token_uses_per_month INTEGER CHECK (max_token_uses_per_month >= 1),
  timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles',
  max_active_streaks_hint INTEGER,  -- Guardrail: recommend 3, cap 5
  created_by_user_id UUID NOT NULL REFERENCES "user"(user_id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for streak definition
CREATE INDEX idx_streak_definition_workspace_id ON streak_definition(workspace_id);
CREATE INDEX idx_streak_definition_patient_id ON streak_definition(patient_id);
CREATE INDEX idx_streak_definition_status ON streak_definition(status);
CREATE INDEX idx_streak_definition_period ON streak_definition(period);

-- StreakState: User's current progress for a streak
CREATE TABLE streak_state (
  streak_state_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  streak_definition_id UUID NOT NULL REFERENCES streak_definition(streak_definition_id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
  status streak_state_status NOT NULL DEFAULT 'ongoing',
  current_count INTEGER NOT NULL DEFAULT 0 CHECK (current_count >= 0),
  best_count INTEGER NOT NULL DEFAULT 0 CHECK (best_count >= 0),
  current_period_key TEXT NOT NULL,  -- Daily: YYYY-MM-DD, Weekly: YYYY-Www
  period_satisfied BOOLEAN NOT NULL DEFAULT false,
  last_incremented_at TIMESTAMPTZ,
  last_broken_at TIMESTAMPTZ,
  last_shielded_at TIMESTAMPTZ,
  tokens_used_this_month INTEGER NOT NULL DEFAULT 0 CHECK (tokens_used_this_month >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One state per streak definition per patient
  CONSTRAINT uq_streak_state_definition_patient UNIQUE (streak_definition_id, patient_id)
);

-- Indexes for streak state
CREATE INDEX idx_streak_state_workspace_id ON streak_state(workspace_id);
CREATE INDEX idx_streak_state_streak_definition_id ON streak_state(streak_definition_id);
CREATE INDEX idx_streak_state_patient_id ON streak_state(patient_id);
CREATE INDEX idx_streak_state_status ON streak_state(status);

-- StreakShieldUse: Record of token use to shield a broken streak
CREATE TABLE streak_shield_use (
  streak_shield_use_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
  streak_state_id UUID NOT NULL REFERENCES streak_state(streak_state_id) ON DELETE CASCADE,
  streak_definition_id UUID NOT NULL REFERENCES streak_definition(streak_definition_id) ON DELETE CASCADE,
  period_key TEXT NOT NULL,
  store_item_id UUID NOT NULL REFERENCES store_item(store_item_id) ON DELETE RESTRICT,
  inventory_id UUID REFERENCES user_inventory(user_inventory_id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

-- Indexes for streak shield use
CREATE INDEX idx_streak_shield_use_workspace_id ON streak_shield_use(workspace_id);
CREATE INDEX idx_streak_shield_use_patient_id ON streak_shield_use(patient_id);
CREATE INDEX idx_streak_shield_use_streak_state_id ON streak_shield_use(streak_state_id);
CREATE INDEX idx_streak_shield_use_used_at ON streak_shield_use(used_at);

-- Updated_at triggers
CREATE TRIGGER streak_definition_updated_at
  BEFORE UPDATE ON streak_definition
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER streak_state_updated_at
  BEFORE UPDATE ON streak_state
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE streak_definition IS 'Admin-configured streaks from templates + filters, awarding coins; supports token shielding.';
COMMENT ON TABLE streak_state IS 'User''s current progress for a streak.';
COMMENT ON TABLE streak_shield_use IS 'Record of token use to shield a broken streak (for explainability).';

-- RLS Policies for streak_definition
ALTER TABLE streak_definition ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own streak definitions" ON streak_definition
  FOR SELECT TO authenticated
  USING (
    patient_id IN (
      SELECT pp.patient_id FROM patient_profile pp
      JOIN workspace_membership wm ON wm.workspace_id = pp.workspace_id AND wm.user_id = pp.patient_id
      WHERE wm.user_id = auth.uid() AND wm.status = 'active'
    )
  );

CREATE POLICY "Admin can manage streak definitions" ON streak_definition
  FOR ALL TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND role_key = 'admin' AND status = 'active'
    )
  );

-- RLS Policies for streak_state
ALTER TABLE streak_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own streak state" ON streak_state
  FOR SELECT TO authenticated
  USING (
    patient_id IN (
      SELECT pp.patient_id FROM patient_profile pp
      JOIN workspace_membership wm ON wm.workspace_id = pp.workspace_id AND wm.user_id = pp.patient_id
      WHERE wm.user_id = auth.uid() AND wm.status = 'active'
    )
  );

CREATE POLICY "Admin can view all streak states" ON streak_state
  FOR SELECT TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND role_key = 'admin' AND status = 'active'
    )
  );

-- RLS Policies for streak_shield_use
ALTER TABLE streak_shield_use ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own shield uses" ON streak_shield_use
  FOR SELECT TO authenticated
  USING (
    patient_id IN (
      SELECT pp.patient_id FROM patient_profile pp
      JOIN workspace_membership wm ON wm.workspace_id = pp.workspace_id AND wm.user_id = pp.patient_id
      WHERE wm.user_id = auth.uid() AND wm.status = 'active'
    )
  );

-- Helper function to get current period key
CREATE OR REPLACE FUNCTION get_period_key(
  p_period streak_period,
  p_timezone TEXT DEFAULT 'America/Los_Angeles',
  p_date TIMESTAMPTZ DEFAULT now()
) RETURNS TEXT AS $$
BEGIN
  IF p_period = 'daily' THEN
    RETURN to_char(p_date AT TIME ZONE p_timezone, 'YYYY-MM-DD');
  ELSE
    RETURN to_char(p_date AT TIME ZONE p_timezone, 'IYYY-"W"IW');
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get all active streaks with their current state
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

-- Function to evaluate if a streak's requirements are met for current period
CREATE OR REPLACE FUNCTION check_streak_satisfied(
  p_streak_definition_id UUID,
  p_patient_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_definition RECORD;
  v_period_key TEXT;
  v_completed_count INTEGER;
  v_must_do_count INTEGER;
  v_must_do_completed INTEGER;
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
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Function to update streak state (called when tasks are completed)
CREATE OR REPLACE FUNCTION update_streak_progress(p_patient_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
  v_streak RECORD;
  v_period_key TEXT;
  v_satisfied BOOLEAN;
  v_state RECORD;
BEGIN
  -- Get workspace
  SELECT workspace_id INTO v_workspace_id
  FROM patient_profile
  WHERE patient_id = p_patient_id;

  IF v_workspace_id IS NULL THEN
    RETURN;
  END IF;

  -- Loop through active streak definitions for this patient
  FOR v_streak IN
    SELECT * FROM streak_definition
    WHERE patient_id = p_patient_id AND status = 'active'
  LOOP
    v_period_key := get_period_key(v_streak.period, v_streak.timezone);
    v_satisfied := check_streak_satisfied(v_streak.streak_definition_id, p_patient_id);

    -- Get or create streak state
    SELECT * INTO v_state
    FROM streak_state
    WHERE streak_definition_id = v_streak.streak_definition_id
      AND patient_id = p_patient_id;

    IF v_state IS NULL THEN
      -- Create new state
      INSERT INTO streak_state (
        workspace_id, streak_definition_id, patient_id,
        current_period_key, period_satisfied
      )
      VALUES (
        v_workspace_id, v_streak.streak_definition_id, p_patient_id,
        v_period_key, v_satisfied
      );
    ELSE
      -- Check if period has changed
      IF v_state.current_period_key != v_period_key THEN
        -- Period changed - evaluate previous period
        IF v_state.period_satisfied THEN
          -- Streak continues, increment count
          UPDATE streak_state SET
            current_count = current_count + 1,
            best_count = GREATEST(best_count, current_count + 1),
            current_period_key = v_period_key,
            period_satisfied = v_satisfied,
            last_incremented_at = now(),
            status = 'ongoing'
          WHERE streak_state_id = v_state.streak_state_id;

          -- Award coins for streak continuation
          IF v_streak.coin_reward > 0 THEN
            PERFORM add_coins(
              p_patient_id, v_streak.coin_reward, 'streak_reward',
              'streak_state', v_state.streak_state_id,
              'Streak: ' || v_streak.name
            );
          END IF;

          -- Check milestone bonuses
          IF v_streak.bonus_milestones IS NOT NULL THEN
            DECLARE
              v_new_count INTEGER;
              v_milestone RECORD;
            BEGIN
              SELECT current_count + 1 INTO v_new_count;
              FOR v_milestone IN SELECT * FROM jsonb_to_recordset(v_streak.bonus_milestones) AS x(days INT, coins INT)
              LOOP
                IF v_new_count = v_milestone.days THEN
                  PERFORM add_coins(
                    p_patient_id, v_milestone.coins, 'streak_milestone',
                    'streak_state', v_state.streak_state_id,
                    format('%s day streak milestone: %s', v_milestone.days, v_streak.name)
                  );
                END IF;
              END LOOP;
            END;
          END IF;
        ELSE
          -- Streak broken - check if we can shield
          IF v_streak.break_behavior IN ('use_token_if_available', 'prompt_to_use_token')
             AND v_streak.shield_token_item_id IS NOT NULL
             AND v_streak.auto_use_token = true
             AND (v_streak.max_token_uses_per_month IS NULL OR v_state.tokens_used_this_month < v_streak.max_token_uses_per_month)
          THEN
            -- Try to use shield token
            DECLARE
              v_inventory_id UUID;
              v_has_token BOOLEAN := false;
            BEGIN
              SELECT user_inventory_id INTO v_inventory_id
              FROM user_inventory
              WHERE patient_id = p_patient_id
                AND store_item_id = v_streak.shield_token_item_id
                AND quantity > 0
              LIMIT 1;

              IF v_inventory_id IS NOT NULL THEN
                v_has_token := true;
                -- Consume token
                UPDATE user_inventory SET quantity = quantity - 1
                WHERE user_inventory_id = v_inventory_id;

                -- Record shield use
                INSERT INTO streak_shield_use (
                  workspace_id, patient_id, streak_state_id, streak_definition_id,
                  period_key, store_item_id, inventory_id
                )
                VALUES (
                  v_workspace_id, p_patient_id, v_state.streak_state_id,
                  v_streak.streak_definition_id, v_state.current_period_key,
                  v_streak.shield_token_item_id, v_inventory_id
                );

                -- Update state as shielded
                UPDATE streak_state SET
                  current_period_key = v_period_key,
                  period_satisfied = v_satisfied,
                  last_shielded_at = now(),
                  tokens_used_this_month = tokens_used_this_month + 1,
                  status = 'shielded'
                WHERE streak_state_id = v_state.streak_state_id;
              END IF;

              IF NOT v_has_token THEN
                -- Break the streak
                UPDATE streak_state SET
                  current_count = 0,
                  current_period_key = v_period_key,
                  period_satisfied = v_satisfied,
                  last_broken_at = now(),
                  status = 'broken'
                WHERE streak_state_id = v_state.streak_state_id;
              END IF;
            END;
          ELSE
            -- Break the streak
            UPDATE streak_state SET
              current_count = 0,
              current_period_key = v_period_key,
              period_satisfied = v_satisfied,
              last_broken_at = now(),
              status = 'broken'
            WHERE streak_state_id = v_state.streak_state_id;
          END IF;
        END IF;
      ELSE
        -- Same period, just update satisfaction
        UPDATE streak_state SET
          period_satisfied = v_satisfied
        WHERE streak_state_id = v_state.streak_state_id;
      END IF;
    END IF;
  END LOOP;

  -- Reset tokens_used_this_month at start of new month
  UPDATE streak_state SET tokens_used_this_month = 0
  WHERE patient_id = p_patient_id
    AND date_trunc('month', updated_at) < date_trunc('month', now());
END;
$$;

-- Admin function to create a streak definition
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
  p_timezone TEXT DEFAULT 'America/Los_Angeles'
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
    timezone, created_by_user_id
  )
  VALUES (
    v_workspace_id, v_patient_id, p_name, p_template_key, p_period, p_coin_reward,
    p_count_threshold, p_filter_config, p_bonus_milestones, p_break_behavior,
    p_shield_token_item_id, p_auto_use_token, p_max_token_uses_per_month,
    p_timezone, auth.uid()
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

-- Function to manually use a shield token
CREATE OR REPLACE FUNCTION use_shield_token(
  p_streak_definition_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
  v_patient_id UUID;
  v_streak RECORD;
  v_state RECORD;
  v_inventory_id UUID;
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

  -- Get streak definition
  SELECT * INTO v_streak
  FROM streak_definition
  WHERE streak_definition_id = p_streak_definition_id
    AND patient_id = v_patient_id;

  IF v_streak IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Streak not found');
  END IF;

  IF v_streak.shield_token_item_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'This streak does not support shield tokens');
  END IF;

  -- Get streak state
  SELECT * INTO v_state
  FROM streak_state
  WHERE streak_definition_id = p_streak_definition_id
    AND patient_id = v_patient_id;

  IF v_state IS NULL OR v_state.status != 'broken' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Streak is not broken');
  END IF;

  -- Check monthly limit
  IF v_streak.max_token_uses_per_month IS NOT NULL
     AND v_state.tokens_used_this_month >= v_streak.max_token_uses_per_month THEN
    RETURN jsonb_build_object('success', false, 'error', 'Monthly token limit reached');
  END IF;

  -- Check for available token
  SELECT user_inventory_id INTO v_inventory_id
  FROM user_inventory
  WHERE patient_id = v_patient_id
    AND store_item_id = v_streak.shield_token_item_id
    AND quantity > 0
  LIMIT 1;

  IF v_inventory_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No shield tokens available');
  END IF;

  -- Consume token
  UPDATE user_inventory SET quantity = quantity - 1
  WHERE user_inventory_id = v_inventory_id;

  -- Record shield use
  INSERT INTO streak_shield_use (
    workspace_id, patient_id, streak_state_id, streak_definition_id,
    period_key, store_item_id, inventory_id
  )
  VALUES (
    v_workspace_id, v_patient_id, v_state.streak_state_id,
    p_streak_definition_id, v_state.current_period_key,
    v_streak.shield_token_item_id, v_inventory_id
  );

  -- Restore streak
  UPDATE streak_state SET
    status = 'shielded',
    last_shielded_at = now(),
    tokens_used_this_month = tokens_used_this_month + 1
  WHERE streak_state_id = v_state.streak_state_id;

  RETURN jsonb_build_object('success', true, 'message', 'Streak shielded successfully');
END;
$$;
