-- Seed: 01_feature_modules.sql
-- Description: Seed feature modules with dependencies
-- Schema Version: 1.3.0

INSERT INTO feature_module (key, default_enabled, depends_on_module_keys, description, created_at)
VALUES
  ('tasks', true, NULL, 'Tasks, recurrence, groups, bonuses', now()),
  ('goals', true, ARRAY['tasks'], 'Goals with approval workflow', now()),
  ('medications', true, NULL, 'Prescriptions, schedules, intake, inventory', now()),
  ('routines', false, NULL, 'ADLs/routines templates and logging', now()),
  ('wellbeing', false, NULL, 'Symptom entries, provider discussion items', now()),
  ('budget', false, NULL, 'Accounts, planned items, transactions', now()),
  ('recipes', false, NULL, 'Recipe book and ingredients', now()),
  ('shopping', false, ARRAY['recipes'], 'Shopping lists with two-phase checkoff', now()),
  ('notifications', true, NULL, 'Unified notification system', now()),
  ('gamification', true, ARRAY['tasks'], 'Points, levels, streaks', now()),
  ('store', false, ARRAY['gamification'], 'Coins, purchases, stickers, tokens', now()),
  ('attachments', false, NULL, 'File storage with signed URLs', now()),
  ('audit', true, NULL, 'Mutation audit logging', now()),
  ('security', true, NULL, 'Session management, API tokens', now())
ON CONFLICT (key) DO UPDATE SET
  default_enabled = EXCLUDED.default_enabled,
  depends_on_module_keys = EXCLUDED.depends_on_module_keys,
  description = EXCLUDED.description;
