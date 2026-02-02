-- Migration 105: Fix ON DELETE CASCADE for completion tables
-- Emily Mission Log
--
-- The completed_by_user_id foreign keys were missing ON DELETE behavior.
-- This could cause referential integrity errors if a profile is deleted.

-- =============================================================================
-- FIX MISSION_COMPLETIONS FOREIGN KEY
-- =============================================================================

-- Drop the existing constraint
ALTER TABLE mission_completions
  DROP CONSTRAINT IF EXISTS mission_completions_completed_by_user_id_fkey;

-- Recreate with ON DELETE CASCADE
ALTER TABLE mission_completions
  ADD CONSTRAINT mission_completions_completed_by_user_id_fkey
  FOREIGN KEY (completed_by_user_id)
  REFERENCES profiles(id)
  ON DELETE CASCADE;

-- =============================================================================
-- FIX EVENT_COMPLETIONS FOREIGN KEY
-- =============================================================================

-- Drop the existing constraint
ALTER TABLE event_completions
  DROP CONSTRAINT IF EXISTS event_completions_completed_by_user_id_fkey;

-- Recreate with ON DELETE CASCADE
ALTER TABLE event_completions
  ADD CONSTRAINT event_completions_completed_by_user_id_fkey
  FOREIGN KEY (completed_by_user_id)
  REFERENCES profiles(id)
  ON DELETE CASCADE;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON CONSTRAINT mission_completions_completed_by_user_id_fkey ON mission_completions IS
  'Cascades deletion when the completing user profile is deleted';

COMMENT ON CONSTRAINT event_completions_completed_by_user_id_fkey ON event_completions IS
  'Cascades deletion when the completing user profile is deleted';
