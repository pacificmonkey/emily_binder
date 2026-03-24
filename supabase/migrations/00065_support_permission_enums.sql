-- ============================================================================
-- 00065: Add new permission_key enum values for support role
-- ============================================================================
-- ALTER TYPE ADD VALUE must be in its own transaction (or be the only
-- enum-modifying statement before any DML that references the new values).
-- ============================================================================

ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'manage_events';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'manage_wellbeing';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'manage_shopping';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'create_tasks_for_member';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'log_intake_for_member';
