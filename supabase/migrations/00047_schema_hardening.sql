-- ============================================================================
-- Migration: 00047_schema_hardening.sql
-- Description: Phase 5 schema hardening — missing constraints, triggers,
--   duplicate data cleanup, debug function removal, task permission restoration
-- Fixes: DB-07, DB-12, DB-15, DB-17, AUTH-07
-- ============================================================================

-- ============================================================================
-- DB-12: budget_category missing UNIQUE constraint
-- Allows duplicate category names per patient/workspace
-- ============================================================================

ALTER TABLE budget_category
  ADD CONSTRAINT uq_budget_category_name UNIQUE (workspace_id, patient_id, name);

-- ============================================================================
-- DB-15: Remove debug function exposed to all authenticated users
-- debug_points_system() exposes internal schema details
-- ============================================================================

REVOKE EXECUTE ON FUNCTION debug_points_system() FROM authenticated;
DROP FUNCTION IF EXISTS debug_points_system();

-- ============================================================================
-- DB-17: Missing updated_at triggers on tables that have the column
-- ============================================================================

CREATE TRIGGER provider_updated_at
  BEFORE UPDATE ON provider
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER pharmacy_updated_at
  BEFORE UPDATE ON pharmacy
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER budget_account_updated_at
  BEFORE UPDATE ON budget_account
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER budget_category_updated_at
  BEFORE UPDATE ON budget_category
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER budget_plan_item_updated_at
  BEFORE UPDATE ON budget_plan_item
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- DB-07: Fix duplicate level curves
-- Migration 00019 creates curve '00000000-...-000000000001' (linear: 100/level)
-- Seed 02_level_curve.sql creates '11111111-...-111111111111' (accelerating)
-- Onboarding uses the migration UUID. Remove the seed UUID if it exists.
-- ============================================================================

-- Delete orphaned curve steps first (FK dependency)
DELETE FROM level_curve_step
WHERE curve_id = '11111111-1111-1111-1111-111111111111'::UUID
  AND NOT EXISTS (
    SELECT 1 FROM level_system WHERE curve_id = '11111111-1111-1111-1111-111111111111'::UUID
  );

-- Delete the duplicate curve if no level_system references it
DELETE FROM level_curve
WHERE curve_id = '11111111-1111-1111-1111-111111111111'::UUID
  AND NOT EXISTS (
    SELECT 1 FROM level_system WHERE curve_id = '11111111-1111-1111-1111-111111111111'::UUID
  );

-- ============================================================================
-- AUTH-07: Restore task permission differentiation
-- Currently any workspace member can delete any task. Restore proper checks:
-- DELETE requires admin role or task creator. UPDATE/INSERT allowed for members.
-- ============================================================================

DROP POLICY IF EXISTS task_delete ON task;

CREATE POLICY task_delete ON task
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_membership wm
      WHERE wm.workspace_id = task.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.status = 'active'
        AND (
          -- Admin can delete any task
          wm.role_key = 'admin'
          -- Or the task creator can delete their own
          OR task.created_by_user_id = auth.uid()
          -- Or the assigned user can delete tasks assigned to them
          OR task.assigned_to_user_id = auth.uid()
        )
    )
  );
