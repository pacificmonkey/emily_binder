-- Migration 104: Add missing database indexes
-- Emily Mission Log
--
-- These indexes support RLS policies and common query patterns.

-- =============================================================================
-- COMPLETION TABLE INDEXES
-- =============================================================================

-- Index for event_completions.completed_by_user_id
-- Used by RLS policies that filter by the completing user
CREATE INDEX IF NOT EXISTS idx_event_completions_user
  ON event_completions(completed_by_user_id);

-- =============================================================================
-- EVENTS TABLE INDEXES
-- =============================================================================

-- Index for events.created_by_user_id
-- Used by RLS UPDATE/DELETE policies for support users
CREATE INDEX IF NOT EXISTS idx_events_created_by
  ON events(created_by_user_id)
  WHERE archived = false;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON INDEX idx_event_completions_user IS
  'Supports RLS policies filtering by completed_by_user_id';

COMMENT ON INDEX idx_events_created_by IS
  'Supports RLS policies for support users managing their own events';
