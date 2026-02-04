-- Migration: 00005_gamification_base.sql
-- Description: Base gamification tables: PointsSystem, CurrencyLabel, LevelSystem, LevelCurve, UserProgress, PointsLedgerEntry
-- Schema Version: 1.3.0

-- PointsSystem: Renameable labels for points (e.g., 'Points' vs 'Victory Points')
CREATE TABLE points_system (
  points_system_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type scope_type NOT NULL,
  scope_id UUID,  -- If scope_type=workspace, scope_id=workspace_id
  key TEXT NOT NULL DEFAULT 'points',
  singular_label TEXT NOT NULL DEFAULT 'Point',
  plural_label TEXT NOT NULL DEFAULT 'Points',
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Unique constraint: one points system per scope
  CONSTRAINT uq_points_system_scope UNIQUE (scope_type, scope_id, key)
);

-- Index for points system
CREATE INDEX idx_points_system_scope ON points_system(scope_type, scope_id);

-- CurrencyLabel: Renameable labels for currencies (coins, grace tokens)
CREATE TABLE currency_label (
  currency_label_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type scope_type NOT NULL,
  scope_id UUID,
  currency_key currency_key NOT NULL,
  singular_label TEXT NOT NULL,
  plural_label TEXT NOT NULL,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Unique constraint: one label per currency per scope
  CONSTRAINT uq_currency_label_scope_currency UNIQUE (scope_type, scope_id, currency_key)
);

-- Index for currency label
CREATE INDEX idx_currency_label_scope ON currency_label(scope_type, scope_id);

-- LevelCurve: Defines required cumulative points per level
CREATE TABLE level_curve (
  curve_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  mode level_curve_mode NOT NULL DEFAULT 'explicit_table',
  formula_config JSONB,  -- If formula: {base, growth, exponent, rounding}
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- LevelCurveStep: Explicit table: required cumulative points to reach each level
CREATE TABLE level_curve_step (
  curve_id UUID NOT NULL REFERENCES level_curve(curve_id) ON DELETE CASCADE,
  level INTEGER NOT NULL CHECK (level >= 1),
  required_cumulative_points INTEGER NOT NULL CHECK (required_cumulative_points >= 0),

  PRIMARY KEY (curve_id, level)
);

-- Index for level curve steps
CREATE INDEX idx_level_curve_step_curve_id ON level_curve_step(curve_id);

-- LevelSystem: Points accumulate into levels. Curve can be explicit table or formula.
CREATE TABLE level_system (
  level_system_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
  points_currency_key currency_key NOT NULL DEFAULT 'points',
  curve_id UUID NOT NULL REFERENCES level_curve(curve_id) ON DELETE RESTRICT,
  max_level INTEGER NOT NULL DEFAULT 10 CHECK (max_level >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Unique constraint: one level system per patient
  CONSTRAINT uq_level_system_patient UNIQUE (patient_id)
);

-- Indexes for level system
CREATE INDEX idx_level_system_workspace_id ON level_system(workspace_id);
CREATE INDEX idx_level_system_patient_id ON level_system(patient_id);

-- UserProgress: Cached progress for fast UI: derived from PointsLedgerEntry + LevelCurve
CREATE TABLE user_progress (
  user_progress_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
  total_points INTEGER NOT NULL DEFAULT 0 CHECK (total_points >= 0),
  current_level INTEGER NOT NULL DEFAULT 1 CHECK (current_level >= 1),
  points_into_level INTEGER NOT NULL DEFAULT 0 CHECK (points_into_level >= 0),
  points_to_next_level INTEGER NOT NULL DEFAULT 100 CHECK (points_to_next_level >= 0),
  last_recomputed_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Unique constraint: one progress record per patient
  CONSTRAINT uq_user_progress_patient UNIQUE (patient_id)
);

-- Indexes for user progress
CREATE INDEX idx_user_progress_workspace_id ON user_progress(workspace_id);
CREATE INDEX idx_user_progress_patient_id ON user_progress(patient_id);

-- PointsLedgerEntry: Append-only ledger of points earned/spent/adjusted
CREATE TABLE points_ledger_entry (
  points_ledger_entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,  -- +earn / -deduct (rare; typically 0+)
  reason TEXT NOT NULL,  -- task_completion, task_group_bonus, admin_adjustment, migration_fix, other
  link_type TEXT,  -- task_instance, task_group_daily_result, goal, other
  link_id UUID,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_user_id UUID REFERENCES "user"(user_id) ON DELETE SET NULL,  -- Null if system-generated
  notes TEXT
);

-- Indexes for points ledger
CREATE INDEX idx_points_ledger_workspace_id ON points_ledger_entry(workspace_id);
CREATE INDEX idx_points_ledger_patient_id ON points_ledger_entry(patient_id);
CREATE INDEX idx_points_ledger_occurred_at ON points_ledger_entry(occurred_at);
CREATE INDEX idx_points_ledger_reason ON points_ledger_entry(reason);
CREATE INDEX idx_points_ledger_link ON points_ledger_entry(link_type, link_id);

-- Apply updated_at triggers
CREATE TRIGGER points_system_updated_at
  BEFORE UPDATE ON points_system
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER currency_label_updated_at
  BEFORE UPDATE ON currency_label
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER level_system_updated_at
  BEFORE UPDATE ON level_system
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE points_system IS 'Renameable labels for points (e.g., Points vs Victory Points).';
COMMENT ON TABLE currency_label IS 'Renameable labels for currencies (coins, grace tokens).';
COMMENT ON TABLE level_curve IS 'Defines required cumulative points per level.';
COMMENT ON TABLE level_curve_step IS 'Explicit table: required cumulative points to reach each level.';
COMMENT ON TABLE level_system IS 'Points accumulate into levels. Curve can be explicit table or formula.';
COMMENT ON TABLE user_progress IS 'Cached progress for fast UI: derived from PointsLedgerEntry + LevelCurve.';
COMMENT ON TABLE points_ledger_entry IS 'Append-only ledger of points earned/spent/adjusted. TaskInstances and bonuses write to this.';

-- Function to calculate level from total points
CREATE OR REPLACE FUNCTION calculate_level_from_points(
  p_curve_id UUID,
  p_total_points INTEGER,
  p_max_level INTEGER DEFAULT 10
) RETURNS TABLE(
  current_level INTEGER,
  points_into_level INTEGER,
  points_to_next_level INTEGER
) AS $$
DECLARE
  v_level INTEGER := 1;
  v_prev_threshold INTEGER := 0;
  v_curr_threshold INTEGER;
  v_next_threshold INTEGER;
BEGIN
  -- Find the highest level achieved
  SELECT lcs.level, lcs.required_cumulative_points
  INTO v_level, v_prev_threshold
  FROM level_curve_step lcs
  WHERE lcs.curve_id = p_curve_id
    AND lcs.required_cumulative_points <= p_total_points
    AND lcs.level <= p_max_level
  ORDER BY lcs.level DESC
  LIMIT 1;

  IF v_level IS NULL THEN
    v_level := 1;
    v_prev_threshold := 0;
  END IF;

  -- Get threshold for next level
  SELECT lcs.required_cumulative_points
  INTO v_next_threshold
  FROM level_curve_step lcs
  WHERE lcs.curve_id = p_curve_id
    AND lcs.level = v_level + 1
    AND lcs.level <= p_max_level;

  IF v_next_threshold IS NULL THEN
    -- At max level
    v_next_threshold := v_prev_threshold;
  END IF;

  RETURN QUERY SELECT
    v_level,
    p_total_points - v_prev_threshold,
    v_next_threshold - v_prev_threshold;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to recompute user progress from ledger
CREATE OR REPLACE FUNCTION recompute_user_progress(p_patient_id UUID) RETURNS VOID AS $$
DECLARE
  v_total_points INTEGER;
  v_workspace_id UUID;
  v_curve_id UUID;
  v_max_level INTEGER;
  v_level_data RECORD;
BEGIN
  -- Get patient's workspace and level system
  SELECT ls.workspace_id, ls.curve_id, ls.max_level
  INTO v_workspace_id, v_curve_id, v_max_level
  FROM level_system ls
  WHERE ls.patient_id = p_patient_id;

  IF v_curve_id IS NULL THEN
    RETURN;  -- No level system configured
  END IF;

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
END;
$$ LANGUAGE plpgsql;

-- Trigger to update user progress when points ledger changes
CREATE OR REPLACE FUNCTION trigger_update_user_progress()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM recompute_user_progress(COALESCE(NEW.patient_id, OLD.patient_id));
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER points_ledger_update_progress
  AFTER INSERT OR UPDATE OR DELETE ON points_ledger_entry
  FOR EACH ROW EXECUTE FUNCTION trigger_update_user_progress();
