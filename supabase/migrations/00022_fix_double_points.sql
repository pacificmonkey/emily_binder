-- Migration: 00022_fix_double_points.sql
-- Description: Fix double-counting of points by removing duplicate triggers
-- Schema Version: 1.3.0

-- The issue: Both the BEFORE INSERT trigger AND the complete_task function
-- were writing to points_ledger_entry, causing double-counting.

-- =============================================================================
-- DISABLE THE DUPLICATE TRIGGERS
-- =============================================================================

-- Drop the triggers that write to points_ledger_entry
-- (the complete_task function will handle this instead)
DROP TRIGGER IF EXISTS task_instance_award_points ON task_instance;
DROP TRIGGER IF EXISTS task_instance_award_points_on_insert ON task_instance;

-- We can keep the functions but they won't be triggered
-- DROP FUNCTION IF EXISTS award_points_on_task_completion();
-- DROP FUNCTION IF EXISTS award_points_on_task_instance_insert();

-- =============================================================================
-- CLEAN UP DUPLICATE LEDGER ENTRIES
-- =============================================================================

-- Delete duplicate entries, keeping only the first one per task_instance
DELETE FROM points_ledger_entry
WHERE points_ledger_entry_id IN (
  SELECT points_ledger_entry_id
  FROM (
    SELECT
      points_ledger_entry_id,
      ROW_NUMBER() OVER (
        PARTITION BY link_type, link_id, occurred_at
        ORDER BY points_ledger_entry_id
      ) as rn
    FROM points_ledger_entry
    WHERE link_type = 'task_instance'
  ) sub
  WHERE rn > 1
);

-- =============================================================================
-- RECOMPUTE USER PROGRESS FROM CLEANED LEDGER
-- =============================================================================

-- Recompute progress for all patients
DO $$
DECLARE
  v_patient RECORD;
BEGIN
  FOR v_patient IN SELECT patient_id FROM patient_profile
  LOOP
    PERFORM recompute_user_progress(v_patient.patient_id);
  END LOOP;
END;
$$;
