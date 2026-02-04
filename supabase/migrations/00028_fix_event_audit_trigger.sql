-- Migration: 00028_fix_event_audit_trigger.sql
-- Description: Fix event audit trigger to use correct column names
-- Schema Version: 1.3.0

-- Drop the incorrect audit trigger
DROP TRIGGER IF EXISTS event_audit_trigger ON event;
DROP FUNCTION IF EXISTS audit_event_changes();

-- Use the existing generic audit trigger instead
SELECT create_audit_trigger('event');
