-- ============================================================================
-- Migration: 00049_feature_toggle_rls.sql
-- Description: Enforce is_feature_enabled() in RLS policies
-- Fixes: AUTH-10
-- ============================================================================
-- Currently, disabling a feature module in the admin panel only hides UI.
-- Users can still read/write data via direct table access (PostgREST).
-- This migration adds RESTRICTIVE policies that enforce the feature toggle
-- at the database level. When a module is disabled, all table access for
-- that module returns empty / is denied.
-- ============================================================================

-- ============================================================================
-- Helper: resolve patient_id from workspace for tables without patient_id
-- ============================================================================

CREATE OR REPLACE FUNCTION get_patient_for_workspace(p_workspace_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_patient_id UUID;
BEGIN
  SELECT patient_id INTO v_patient_id
  FROM patient_profile
  WHERE workspace_id = p_workspace_id
  LIMIT 1;
  RETURN v_patient_id;
END;
$$;

-- ============================================================================
-- 1. Tasks module ('tasks')
-- Tables: task, task_instance, user_progress, points_ledger_entry
-- ============================================================================

-- task (has workspace_id, no patient_id)
CREATE POLICY task_feature_gate ON task
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (
    is_feature_enabled(
      get_patient_for_workspace(workspace_id),
      'tasks'
    )
  )
  WITH CHECK (
    is_feature_enabled(
      get_patient_for_workspace(workspace_id),
      'tasks'
    )
  );

-- task_instance (has workspace_id, no patient_id)
CREATE POLICY task_instance_feature_gate ON task_instance
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (
    is_feature_enabled(
      get_patient_for_workspace(workspace_id),
      'tasks'
    )
  )
  WITH CHECK (
    is_feature_enabled(
      get_patient_for_workspace(workspace_id),
      'tasks'
    )
  );

-- ============================================================================
-- 2. Goals module ('goals')
-- ============================================================================

-- goal (has workspace_id + patient_id) — table may not exist yet
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'goal') THEN
    EXECUTE 'CREATE POLICY goal_feature_gate ON goal
      AS RESTRICTIVE FOR ALL TO authenticated
      USING (is_feature_enabled(patient_id, ''goals''))
      WITH CHECK (is_feature_enabled(patient_id, ''goals''))';
  END IF;
END;
$$;

-- ============================================================================
-- 3. Health/Medications module ('medications')
-- Tables: medication, prescription, intake_event, inventory, provider, pharmacy
-- ============================================================================

-- medication (workspace_id only)
CREATE POLICY medication_feature_gate ON medication
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (
    is_feature_enabled(
      get_patient_for_workspace(workspace_id),
      'medications'
    )
  )
  WITH CHECK (
    is_feature_enabled(
      get_patient_for_workspace(workspace_id),
      'medications'
    )
  );

-- prescription (has patient_id)
CREATE POLICY prescription_feature_gate ON prescription
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (is_feature_enabled(patient_id, 'medications'))
  WITH CHECK (is_feature_enabled(patient_id, 'medications'));

-- intake_event (has patient_id)
CREATE POLICY intake_event_feature_gate ON intake_event
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (is_feature_enabled(patient_id, 'medications'))
  WITH CHECK (is_feature_enabled(patient_id, 'medications'));

-- inventory (workspace_id, resolve patient via prescription)
CREATE POLICY inventory_feature_gate ON inventory
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (
    is_feature_enabled(
      get_patient_for_workspace(workspace_id),
      'medications'
    )
  )
  WITH CHECK (
    is_feature_enabled(
      get_patient_for_workspace(workspace_id),
      'medications'
    )
  );

-- provider (workspace_id only)
CREATE POLICY provider_feature_gate ON provider
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (
    is_feature_enabled(
      get_patient_for_workspace(workspace_id),
      'medications'
    )
  )
  WITH CHECK (
    is_feature_enabled(
      get_patient_for_workspace(workspace_id),
      'medications'
    )
  );

-- pharmacy (workspace_id only)
CREATE POLICY pharmacy_feature_gate ON pharmacy
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (
    is_feature_enabled(
      get_patient_for_workspace(workspace_id),
      'medications'
    )
  )
  WITH CHECK (
    is_feature_enabled(
      get_patient_for_workspace(workspace_id),
      'medications'
    )
  );

-- ============================================================================
-- 4. Wellbeing module ('wellbeing')
-- Tables: symptom_entry, provider_discussion_item
-- ============================================================================

-- symptom_entry (has patient_id)
CREATE POLICY symptom_entry_feature_gate ON symptom_entry
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (is_feature_enabled(patient_id, 'wellbeing'))
  WITH CHECK (is_feature_enabled(patient_id, 'wellbeing'));

-- provider_discussion_item (has patient_id)
CREATE POLICY discussion_item_feature_gate ON provider_discussion_item
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (is_feature_enabled(patient_id, 'wellbeing'))
  WITH CHECK (is_feature_enabled(patient_id, 'wellbeing'));

-- ============================================================================
-- 5. Budget module ('budget')
-- Tables: budget_account, budget_category, budget_plan_item, budget_transaction
-- ============================================================================

-- budget_account (has patient_id)
CREATE POLICY budget_account_feature_gate ON budget_account
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (is_feature_enabled(patient_id, 'budget'))
  WITH CHECK (is_feature_enabled(patient_id, 'budget'));

-- budget_category (has patient_id)
CREATE POLICY budget_category_feature_gate ON budget_category
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (is_feature_enabled(patient_id, 'budget'))
  WITH CHECK (is_feature_enabled(patient_id, 'budget'));

-- budget_plan_item (has patient_id)
CREATE POLICY budget_plan_item_feature_gate ON budget_plan_item
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (is_feature_enabled(patient_id, 'budget'))
  WITH CHECK (is_feature_enabled(patient_id, 'budget'));

-- budget_transaction (has patient_id)
CREATE POLICY budget_transaction_feature_gate ON budget_transaction
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (is_feature_enabled(patient_id, 'budget'))
  WITH CHECK (is_feature_enabled(patient_id, 'budget'));

-- ============================================================================
-- 6. Store/Gamification module ('store', 'gamification')
-- Tables: store_item, purchase, user_inventory, sticker, home_decoration
--         coin_wallet, coin_ledger_entry, streak_definition, streak_state
-- ============================================================================

-- store_item (has workspace_id)
CREATE POLICY store_item_feature_gate ON store_item
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (
    is_feature_enabled(
      get_patient_for_workspace(workspace_id),
      'store'
    )
  )
  WITH CHECK (
    is_feature_enabled(
      get_patient_for_workspace(workspace_id),
      'store'
    )
  );

-- purchase (has patient_id)
CREATE POLICY purchase_feature_gate ON purchase
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (is_feature_enabled(patient_id, 'store'))
  WITH CHECK (is_feature_enabled(patient_id, 'store'));

-- user_inventory (has patient_id)
CREATE POLICY user_inventory_feature_gate ON user_inventory
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (is_feature_enabled(patient_id, 'store'))
  WITH CHECK (is_feature_enabled(patient_id, 'store'));

-- home_decoration (has patient_id)
CREATE POLICY home_decoration_feature_gate ON home_decoration
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (is_feature_enabled(patient_id, 'store'))
  WITH CHECK (is_feature_enabled(patient_id, 'store'));

-- coin_wallet (has patient_id)
CREATE POLICY coin_wallet_feature_gate ON coin_wallet
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (is_feature_enabled(patient_id, 'gamification'))
  WITH CHECK (is_feature_enabled(patient_id, 'gamification'));

-- coin_ledger_entry (has patient_id)
CREATE POLICY coin_ledger_feature_gate ON coin_ledger_entry
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (is_feature_enabled(patient_id, 'gamification'))
  WITH CHECK (is_feature_enabled(patient_id, 'gamification'));

-- streak_definition (has workspace_id)
CREATE POLICY streak_def_feature_gate ON streak_definition
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (
    is_feature_enabled(
      get_patient_for_workspace(workspace_id),
      'gamification'
    )
  )
  WITH CHECK (
    is_feature_enabled(
      get_patient_for_workspace(workspace_id),
      'gamification'
    )
  );

-- streak_state (has patient_id)
CREATE POLICY streak_state_feature_gate ON streak_state
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (is_feature_enabled(patient_id, 'gamification'))
  WITH CHECK (is_feature_enabled(patient_id, 'gamification'));

-- ============================================================================
-- 7. Notifications module ('notifications')
-- ============================================================================

-- notification (has patient_id)
CREATE POLICY notification_feature_gate ON notification
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (is_feature_enabled(patient_id, 'notifications'))
  WITH CHECK (is_feature_enabled(patient_id, 'notifications'));

-- ============================================================================
-- 8. Routines module ('routines') — tables may not exist yet
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'routine') THEN
    EXECUTE 'CREATE POLICY routine_feature_gate ON routine
      AS RESTRICTIVE FOR ALL TO authenticated
      USING (is_feature_enabled(patient_id, ''routines''))
      WITH CHECK (is_feature_enabled(patient_id, ''routines''))';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'routine_event') THEN
    EXECUTE 'CREATE POLICY routine_event_feature_gate ON routine_event
      AS RESTRICTIVE FOR ALL TO authenticated
      USING (is_feature_enabled(patient_id, ''routines''))
      WITH CHECK (is_feature_enabled(patient_id, ''routines''))';
  END IF;
END;
$$;

-- Grant helper function access
GRANT EXECUTE ON FUNCTION get_patient_for_workspace(UUID) TO authenticated;
