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
