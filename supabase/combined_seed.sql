-- Seed: 00_permissions.sql
-- Description: Seed canonical permissions for RBAC
-- Schema Version: 1.3.0

INSERT INTO permission (key, description, created_at)
VALUES
  ('view_all', 'View all data in workspace', now()),
  ('manage_users', 'Manage user accounts', now()),
  ('manage_feature_toggles', 'Toggle feature modules', now()),
  ('manage_tasks', 'Create/edit tasks', now()),
  ('manage_goals', 'Manage goals', now()),
  ('manage_medications', 'Manage medications', now()),
  ('manage_budget', 'Manage budget', now()),
  ('manage_recipes', 'Manage recipes', now()),
  ('manage_store', 'Manage store items', now()),
  ('manage_gamification', 'Configure gamification', now()),
  ('view_sensitive_health', 'View health details', now()),
  ('view_sensitive_budget', 'View budget details', now()),
  ('view_audit', 'View audit logs', now()),
  ('export_data', 'Export data', now()),
  ('manage_security', 'Manage sessions/tokens', now())
ON CONFLICT (key) DO NOTHING;
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
-- Seed: 02_level_curve.sql
-- Description: Default level curve for gamification (10 levels)
-- Schema Version: 1.3.0

-- Create default level curve
INSERT INTO level_curve (curve_id, name, mode, created_at)
VALUES ('11111111-1111-1111-1111-111111111111', 'Default', 'explicit_table', now())
ON CONFLICT (curve_id) DO NOTHING;

-- Insert level thresholds (10 levels)
-- Level 1: 0 points (starting level)
-- Progression gets harder as you advance
INSERT INTO level_curve_step (curve_id, level, required_cumulative_points)
VALUES
  ('11111111-1111-1111-1111-111111111111', 1, 0),
  ('11111111-1111-1111-1111-111111111111', 2, 100),
  ('11111111-1111-1111-1111-111111111111', 3, 250),
  ('11111111-1111-1111-1111-111111111111', 4, 500),
  ('11111111-1111-1111-1111-111111111111', 5, 850),
  ('11111111-1111-1111-1111-111111111111', 6, 1300),
  ('11111111-1111-1111-1111-111111111111', 7, 1900),
  ('11111111-1111-1111-1111-111111111111', 8, 2650),
  ('11111111-1111-1111-1111-111111111111', 9, 3550),
  ('11111111-1111-1111-1111-111111111111', 10, 4600)
ON CONFLICT (curve_id, level) DO UPDATE SET
  required_cumulative_points = EXCLUDED.required_cumulative_points;

-- Create default role labels at app scope
INSERT INTO role_label (scope_type, scope_id, role_key, singular_label, plural_label, created_at, updated_at)
VALUES
  ('app', NULL, 'admin', 'Admin', 'Admins', now(), now()),
  ('app', NULL, 'member', 'Member', 'Members', now(), now()),
  ('app', NULL, 'support', 'Support', 'Support Team', now(), now())
ON CONFLICT (scope_type, scope_id, role_key) DO NOTHING;

-- Create default currency labels at app scope
INSERT INTO currency_label (scope_type, scope_id, currency_key, singular_label, plural_label, icon, created_at, updated_at)
VALUES
  ('app', NULL, 'points', 'Point', 'Points', '⭐', now(), now()),
  ('app', NULL, 'coins', 'Coin', 'Coins', '🪙', now(), now()),
  ('app', NULL, 'grace_token', 'Grace Token', 'Grace Tokens', '🛡️', now(), now())
ON CONFLICT (scope_type, scope_id, currency_key) DO NOTHING;

-- Create default points system at app scope
INSERT INTO points_system (scope_type, scope_id, key, singular_label, plural_label, icon, created_at, updated_at)
VALUES
  ('app', NULL, 'points', 'Point', 'Points', '⭐', now(), now())
ON CONFLICT (scope_type, scope_id, key) DO NOTHING;
