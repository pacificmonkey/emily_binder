-- ============================================================================
-- Migration: 00046_data_integrity.sql
-- Description: Phase 2 data integrity fixes — contradictory FK constraints,
--   streak column references, CHECK constraints, period key volatility
-- Fixes: DB-01, DB-05, DB-06, DB-10, DB-11
-- ============================================================================

-- ============================================================================
-- DB-01: Fix contradictory NOT NULL + ON DELETE SET NULL constraints
-- sensitive_access_event.actor_user_id and role_permission.set_by_user_id
-- are NOT NULL with ON DELETE SET NULL — deleting a user blocks the cascade.
-- ============================================================================

-- Fix sensitive_access_event.actor_user_id: allow NULL for deleted actors
ALTER TABLE sensitive_access_event ALTER COLUMN actor_user_id DROP NOT NULL;

-- Fix role_permission.set_by_user_id: allow NULL for deleted actors
ALTER TABLE role_permission ALTER COLUMN set_by_user_id DROP NOT NULL;

-- ============================================================================
-- DB-05: Fix check_streak_satisfied() column references
-- Uses ti.scheduled_date (should be ti.assigned_day) and
-- t.is_must_do (should be t.must_do)
-- ============================================================================

CREATE OR REPLACE FUNCTION check_streak_satisfied(
  p_streak_definition_id UUID,
  p_patient_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
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
        (v_definition.period = 'daily' AND ti.assigned_day = v_period_key::date)
        OR (v_definition.period = 'weekly' AND ti.assigned_day >= date_trunc('week', now() AT TIME ZONE v_definition.timezone)::date)
      )
      -- Apply filters from filter_config if present
      AND (
        v_definition.filter_config IS NULL
        OR v_definition.filter_config->>'must_do_only' IS NULL
        OR v_definition.filter_config->>'must_do_only' = 'false'
        OR t.must_do = true
      );

    RETURN v_completed_count >= COALESCE(v_definition.count_threshold, 1);

  ELSIF v_definition.template_key = 'complete_any_filtered' THEN
    -- At least one task completed
    SELECT COUNT(*) INTO v_completed_count
    FROM task_instance ti
    WHERE ti.patient_id = p_patient_id
      AND ti.completion_status = 'done'
      AND (
        (v_definition.period = 'daily' AND ti.assigned_day = v_period_key::date)
        OR (v_definition.period = 'weekly' AND ti.assigned_day >= date_trunc('week', now() AT TIME ZONE v_definition.timezone)::date)
      );

    RETURN v_completed_count >= 1;

  ELSIF v_definition.template_key = 'perfect_must_do' THEN
    -- All must-do tasks completed
    SELECT COUNT(*), SUM(CASE WHEN ti.completion_status = 'done' THEN 1 ELSE 0 END)
    INTO v_must_do_count, v_must_do_completed
    FROM task_instance ti
    JOIN task t ON t.task_id = ti.task_id
    WHERE ti.patient_id = p_patient_id
      AND t.must_do = true
      AND (
        (v_definition.period = 'daily' AND ti.assigned_day = v_period_key::date)
        OR (v_definition.period = 'weekly' AND ti.assigned_day >= date_trunc('week', now() AT TIME ZONE v_definition.timezone)::date)
      );

    RETURN v_must_do_count > 0 AND v_must_do_count = v_must_do_completed;
  END IF;

  RETURN false;
END;
$$;

-- ============================================================================
-- DB-06: Fix get_period_key() volatility
-- Marked IMMUTABLE but default parameter uses now(), which is mutable.
-- PostgreSQL may cache IMMUTABLE function results, causing stale timestamps.
-- ============================================================================

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
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- DB-10: Add CHECK constraints on budget amounts
-- budget_plan_item.amount and budget_transaction.amount allow negative values.
-- ============================================================================

ALTER TABLE budget_plan_item ADD CONSTRAINT chk_budget_plan_item_amount_positive CHECK (amount > 0);
ALTER TABLE budget_transaction ADD CONSTRAINT chk_budget_transaction_amount_positive CHECK (amount > 0);

-- ============================================================================
-- DB-11: Add CHECK constraints on health module numerics
-- Prevent negative/zero values for dose quantities, refill counts, etc.
-- ============================================================================

ALTER TABLE prescription ADD CONSTRAINT chk_prescription_dose_quantity_positive CHECK (dose_quantity > 0);
ALTER TABLE prescription ADD CONSTRAINT chk_prescription_refills_total_nonneg CHECK (refills_total >= 0);
ALTER TABLE prescription ADD CONSTRAINT chk_prescription_refills_remaining_nonneg CHECK (refills_remaining >= 0);
ALTER TABLE intake_event ADD CONSTRAINT chk_intake_dose_quantity_positive CHECK (dose_quantity > 0);
ALTER TABLE inventory ADD CONSTRAINT chk_inventory_on_hand_nonneg CHECK (current_on_hand >= 0);
ALTER TABLE medication ADD CONSTRAINT chk_medication_strength_positive CHECK (strength_value IS NULL OR strength_value > 0);
