-- ============================================================================
-- EMILY'S MISSIONS - DATABASE RESET AND MIGRATION SCRIPT
-- ============================================================================
-- WARNING: This script will DROP ALL EXISTING TABLES and recreate the schema
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================================

-- Step 1: Drop existing schema (DESTRUCTIVE)
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- Restore default grants
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;

-- ============================================================================
-- Now run the migrations from combined_migrations.sql
-- ============================================================================
