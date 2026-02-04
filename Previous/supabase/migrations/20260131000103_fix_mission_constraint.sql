-- Migration 103: Fix mission constraint boolean precedence
-- Emily Mission Log
--
-- The original valid_one_time constraint had incorrect boolean precedence
-- due to missing parentheses around the OR conditions.

-- =============================================================================
-- FIX MISSION CONSTRAINT
-- =============================================================================

-- Drop the incorrectly defined constraint
ALTER TABLE missions DROP CONSTRAINT IF EXISTS valid_one_time;

-- Recreate with proper parentheses grouping
ALTER TABLE missions ADD CONSTRAINT valid_one_time CHECK (
  mission_type != 'one_time' OR (
    one_time_assignment IS NOT NULL AND (
      (one_time_assignment = 'day_assigned' AND due_date IS NOT NULL) OR
      (one_time_assignment = 'week_assigned' AND week_start_date IS NOT NULL)
    )
  )
);

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON CONSTRAINT valid_one_time ON missions IS
  'Ensures one-time missions have proper assignment type and corresponding date field';
