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
