-- Migration: 00075_text_constraints.sql
-- DB-22: Add CHECK constraints to prevent empty-string text columns
-- These columns should have meaningful values when present.

-- ============================================================================
-- Workspace display_name must not be empty
-- ============================================================================
ALTER TABLE workspace
  ADD CONSTRAINT workspace_display_name_not_empty
  CHECK (display_name <> '');

-- ============================================================================
-- Task title must not be empty
-- ============================================================================
ALTER TABLE task
  ADD CONSTRAINT task_title_not_empty
  CHECK (title <> '');

-- ============================================================================
-- Event title must not be empty
-- ============================================================================
ALTER TABLE event
  ADD CONSTRAINT event_title_not_empty
  CHECK (title <> '');

-- ============================================================================
-- Goal title must not be empty
-- ============================================================================
ALTER TABLE goal
  ADD CONSTRAINT goal_title_not_empty
  CHECK (title <> '');

-- ============================================================================
-- Medication display_name must not be empty
-- ============================================================================
ALTER TABLE medication
  ADD CONSTRAINT medication_display_name_not_empty
  CHECK (display_name <> '');

-- ============================================================================
-- Store item display_name must not be empty
-- ============================================================================
ALTER TABLE store_item
  ADD CONSTRAINT store_item_display_name_not_empty
  CHECK (display_name <> '');

-- ============================================================================
-- Streak definition name must not be empty
-- ============================================================================
ALTER TABLE streak_definition
  ADD CONSTRAINT streak_definition_name_not_empty
  CHECK (name <> '');

-- ============================================================================
-- Budget account name must not be empty
-- ============================================================================
ALTER TABLE budget_account
  ADD CONSTRAINT budget_account_name_not_empty
  CHECK (name <> '');

-- ============================================================================
-- Budget category name must not be empty
-- ============================================================================
ALTER TABLE budget_category
  ADD CONSTRAINT budget_category_name_not_empty
  CHECK (name <> '');
