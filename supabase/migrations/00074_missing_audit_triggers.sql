-- Migration: Add missing audit triggers on store/sticker/streak tables
-- These tables were created without audit triggers, leaving gaps in the audit log.

SELECT create_audit_trigger('transition_buffer');
SELECT create_audit_trigger('streak_definition');
SELECT create_audit_trigger('streak_state');
SELECT create_audit_trigger('streak_shield_use');
SELECT create_audit_trigger('store_item');
SELECT create_audit_trigger('purchase');
SELECT create_audit_trigger('user_inventory');
SELECT create_audit_trigger('home_decoration');
