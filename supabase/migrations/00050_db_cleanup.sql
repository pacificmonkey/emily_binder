-- ============================================================================
-- Migration: 00050_db_cleanup.sql
-- Description: Remove stale function overloads, fix notification schema conflict
-- Fixes: DB-08, DB-09
-- ============================================================================

-- ============================================================================
-- DB-08: Drop old get_coin_balance(UUID) overload
--
-- 00035 creates: get_coin_balance(p_patient_id UUID DEFAULT NULL) — no auth check
-- 00041 creates: get_coin_balance() — uses get_effective_patient_id()
-- Both coexist due to function overloading. The old version lets any user
-- call get_coin_balance('victim-uuid'::UUID) to read any patient's balance.
-- ============================================================================

DROP FUNCTION IF EXISTS get_coin_balance(UUID);

-- ============================================================================
-- DB-09: Fix notification table schema conflict
--
-- 00027 creates notification table with:
--   created_by_user_id UUID REFERENCES auth.users(id)
-- 00043 attempts to create with:
--   created_by_user_id UUID REFERENCES "user"(user_id)
-- But CREATE TABLE IF NOT EXISTS does nothing since table already exists.
--
-- Also, 00027 creates permissive policies (notification_select,
-- notification_update, notification_delete) that were NOT dropped by 00043.
-- These are more permissive than the 00043 policies, effectively overriding
-- the patient-based access model from 00043.
-- ============================================================================

-- 1. Drop stale 00027 policies that override 00043's tighter access model
DROP POLICY IF EXISTS notification_select ON notification;
DROP POLICY IF EXISTS notification_update ON notification;
DROP POLICY IF EXISTS notification_delete ON notification;

-- 2. Fix the FK reference from auth.users(id) to "user"(user_id)
-- First drop the auto-generated FK constraint
ALTER TABLE notification
  DROP CONSTRAINT IF EXISTS notification_created_by_user_id_fkey;

-- Add the correct FK referencing the application's user table
ALTER TABLE notification
  ADD CONSTRAINT notification_created_by_user_id_fkey
  FOREIGN KEY (created_by_user_id) REFERENCES "user"(user_id) ON DELETE SET NULL;
