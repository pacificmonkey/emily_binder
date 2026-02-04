-- Migration: 00001_enums.sql
-- Description: Create all enum types for the application
-- Schema Version: 1.3.0

-- Role and Scope enums
CREATE TYPE role_key AS ENUM ('admin', 'member', 'support');
CREATE TYPE scope_type AS ENUM ('app', 'workspace', 'user');

-- Permission enum
CREATE TYPE permission_key AS ENUM (
  'view_all',
  'manage_users',
  'manage_feature_toggles',
  'manage_tasks',
  'manage_goals',
  'manage_medications',
  'manage_budget',
  'manage_recipes',
  'manage_store',
  'manage_gamification',
  'view_sensitive_health',
  'view_sensitive_budget',
  'view_audit',
  'export_data',
  'manage_security'
);

-- Feature Module enum
CREATE TYPE feature_module_key AS ENUM (
  'tasks',
  'goals',
  'medications',
  'routines',
  'wellbeing',
  'budget',
  'recipes',
  'shopping',
  'notifications',
  'gamification',
  'store',
  'attachments',
  'audit',
  'security'
);

-- Task-related enums
CREATE TYPE task_type_key AS ENUM ('one_time', 'recurring', 'bonus');
CREATE TYPE task_status AS ENUM ('active', 'archived');
CREATE TYPE task_instance_completion_status AS ENUM ('not_done', 'done');
CREATE TYPE recurrence_frequency AS ENUM ('daily', 'weekly', 'monthly', 'custom');
CREATE TYPE bonus_availability AS ENUM ('daily', 'weekly', 'always');

-- Source link type enum
CREATE TYPE source_link_type AS ENUM (
  'event',
  'med_schedule',
  'prescription',
  'refill',
  'inventory',
  'provider_discussion_item',
  'budget_plan_item',
  'budget_transaction',
  'shopping_list',
  'routine',
  'symptom_entry',
  'custom'
);

-- Goal-related enums
CREATE TYPE goal_type_key AS ENUM ('self_goal', 'support_goal');
CREATE TYPE goal_status AS ENUM ('draft', 'submitted', 'needs_changes', 'approved', 'active', 'completed', 'archived');
CREATE TYPE auto_approve_mode AS ENUM ('none', 'after_deadline', 'after_deadline_or_due_soon');
CREATE TYPE due_kind AS ENUM ('none', 'date', 'week', 'whenever');

-- Event-related enums
CREATE TYPE event_type AS ENUM ('appointment', 'social', 'errand', 'class', 'therapy', 'work', 'other');
CREATE TYPE event_status AS ENUM ('scheduled', 'canceled', 'completed', 'no_show', 'rescheduled');

-- Medication-related enums
CREATE TYPE medication_strength_unit AS ENUM ('mg', 'mcg', 'g', 'mL', 'IU', '%', 'unit', 'other');
CREATE TYPE dosage_form AS ENUM ('tablet', 'capsule', 'liquid', 'inhaler', 'patch', 'injection', 'cream', 'drops', 'other');
CREATE TYPE route AS ENUM ('oral', 'sublingual', 'topical', 'inhaled', 'im', 'iv', 'other');
CREATE TYPE prescription_status AS ENUM ('active', 'paused', 'completed', 'discontinued');
CREATE TYPE frequency_type AS ENUM ('scheduled', 'prn', 'taper');
CREATE TYPE schedule_kind AS ENUM ('times_of_day', 'interval', 'weekly', 'cyclic', 'taper', 'custom_rrule');
CREATE TYPE with_food AS ENUM ('none', 'with_food', 'empty_stomach', 'avoid_dairy', 'other');
CREATE TYPE inventory_source AS ENUM ('computed', 'manual_set', 'manual_adjust', 'imported');
CREATE TYPE inventory_confidence AS ENUM ('high', 'medium', 'low');
CREATE TYPE inventory_adjustment_reason AS ENUM ('counted', 'lost', 'extra', 'dose_change', 'travel_supply', 'other');
CREATE TYPE intake_status AS ENUM ('taken', 'skipped', 'missed', 'late', 'partial');
CREATE TYPE recorded_by AS ENUM ('user', 'caregiver', 'import', 'device');

-- Attachment-related enums
CREATE TYPE attachment_owner_type AS ENUM (
  'workspace',
  'user',
  'task',
  'task_instance',
  'goal',
  'event',
  'medication',
  'prescription',
  'med_schedule',
  'dispense',
  'inventory',
  'provider',
  'pharmacy',
  'insurance',
  'symptom_entry',
  'provider_discussion_item',
  'budget_plan_item',
  'budget_transaction',
  'recipe',
  'shopping_list',
  'notification',
  'store_item',
  'purchase',
  'redemption',
  'streak_definition',
  'custom'
);
CREATE TYPE attachment_storage AS ENUM ('local', 'cloud');
CREATE TYPE attachment_access_scope AS ENUM ('patient_only', 'admin_only', 'care_team', 'shared');
CREATE TYPE attachment_encryption_status AS ENUM ('unknown', 'encrypted_at_rest', 'client_side_encrypted');

-- Routine/ADL enums
CREATE TYPE adl_category AS ENUM ('hygiene', 'meals', 'hydration', 'sleep', 'exercise', 'laundry', 'cleaning', 'self_care', 'other');
CREATE TYPE routine_status AS ENUM ('active', 'archived');
CREATE TYPE routine_event_status AS ENUM ('done', 'skipped', 'partial');

-- Symptom enums
CREATE TYPE symptom_domain AS ENUM ('physical', 'mental', 'sensory', 'sleep', 'other');
CREATE TYPE symptom_severity_scale AS ENUM ('none', 'mild', 'moderate', 'severe');
CREATE TYPE discussion_item_status AS ENUM ('open', 'discussed', 'resolved', 'archived');

-- Budget enums
CREATE TYPE budget_restriction_type AS ENUM ('none', 'category_allowlist', 'category_blocklist', 'merchant_allowlist', 'merchant_blocklist');
CREATE TYPE budget_entry_status AS ENUM ('planned', 'posted', 'canceled');
CREATE TYPE budget_transaction_type AS ENUM ('income', 'expense', 'transfer');
CREATE TYPE budget_cadence AS ENUM ('one_time', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly');
CREATE TYPE budget_category_kind AS ENUM ('income', 'expense');

-- Recipe/Shopping enums
CREATE TYPE recipe_unit AS ENUM ('tsp', 'tbsp', 'cup', 'oz', 'lb', 'g', 'kg', 'mL', 'L', 'count', 'pinch', 'other');
CREATE TYPE shopping_list_status AS ENUM ('active', 'completed', 'archived');
CREATE TYPE shopping_list_item_status AS ENUM ('need_to_check_home', 'need_to_buy', 'already_have', 'purchased', 'skipped');

-- Transition/Coping enums
CREATE TYPE transition_buffer_type AS ENUM ('before_event', 'after_event', 'between_events', 'daily_routine');
CREATE TYPE coping_activity_type AS ENUM ('self_soothe', 'boredom', 'energy_release', 'calming', 'focus', 'other');

-- Notification enums
CREATE TYPE notification_type AS ENUM (
  'reminder',
  'info',
  'custom',
  'dose_reminder',
  'low_stock',
  'refill_due',
  'missed_dose',
  'expiration',
  'interaction_warning'
);
CREATE TYPE notification_status AS ENUM ('scheduled', 'delivered', 'failed', 'dismissed', 'acknowledged');
CREATE TYPE notification_channel AS ENUM ('push', 'sms', 'email', 'in_app');

-- Audit enums
CREATE TYPE audit_action AS ENUM ('create', 'update', 'delete', 'export', 'restore');
CREATE TYPE sensitive_access_action AS ENUM ('view', 'download', 'print', 'share_link_create', 'share_link_open');
CREATE TYPE audit_object_type AS ENUM (
  'workspace',
  'workspace_membership',
  'user',
  'patient_profile',
  'role_label',
  'permission',
  'role_permission',
  'points_system',
  'currency_label',
  'feature_module',
  'feature_module_setting',
  'event',
  'task',
  'task_tag',
  'task_instance',
  'points_ledger_entry',
  'goal',
  'task_group',
  'medication',
  'prescription',
  'med_schedule',
  'dispense',
  'inventory',
  'inventory_adjustment',
  'intake_event',
  'provider',
  'pharmacy',
  'insurance',
  'notification',
  'renewal_plan',
  'routine',
  'routine_event',
  'symptom_entry',
  'provider_discussion_item',
  'budget_account',
  'budget_category',
  'budget_plan_item',
  'budget_transaction',
  'recipe',
  'recipe_ingredient',
  'favorite_item',
  'shopping_list',
  'shopping_list_item',
  'transition_buffer',
  'coping_activity',
  'attachment',
  'level_system',
  'level_curve',
  'user_progress',
  'coin_wallet',
  'coin_ledger_entry',
  'store_item',
  'purchase',
  'redemption',
  'user_inventory',
  'sticker',
  'home_decoration',
  'streak_definition',
  'streak_state',
  'streak_shield_use',
  'auth_session',
  'api_token'
);

-- Currency enum
CREATE TYPE currency_key AS ENUM ('points', 'coins', 'grace_token');

-- Store/Economy enums
CREATE TYPE store_item_type AS ENUM ('sticker', 'home_decoration', 'consumable_token', 'real_world_reward');
CREATE TYPE inventory_item_kind AS ENUM ('cosmetic', 'consumable', 'entitlement');
CREATE TYPE purchase_status AS ENUM ('pending', 'completed', 'canceled', 'refunded');
CREATE TYPE redemption_status AS ENUM ('requested', 'approved', 'denied', 'fulfilled', 'canceled');

-- Streak enums
CREATE TYPE streak_period AS ENUM ('daily', 'weekly');
CREATE TYPE streak_template_key AS ENUM ('complete_n_filtered', 'complete_any_filtered', 'perfect_must_do');
CREATE TYPE streak_status AS ENUM ('active', 'paused', 'archived');
CREATE TYPE streak_break_behavior AS ENUM ('break', 'use_token_if_available', 'prompt_to_use_token');
CREATE TYPE streak_state_status AS ENUM ('ongoing', 'broken', 'shielded', 'paused');

-- Decoration enum
CREATE TYPE home_decoration_placement_status AS ENUM ('active', 'removed');

-- Security enums
CREATE TYPE data_sensitivity AS ENUM ('low', 'moderate', 'high');
CREATE TYPE share_link_status AS ENUM ('active', 'revoked', 'expired');

-- Level curve mode enum
CREATE TYPE level_curve_mode AS ENUM ('explicit_table', 'formula');

-- Workspace membership status
CREATE TYPE membership_status AS ENUM ('active', 'inactive');

-- User account status
CREATE TYPE user_status AS ENUM ('active', 'inactive');

-- Generic active/archived status (for tables that use this pattern)
CREATE TYPE active_archived_status AS ENUM ('active', 'archived');

-- Renewal plan status
CREATE TYPE renewal_plan_status AS ENUM ('active', 'archived');

-- Budget plan item status
CREATE TYPE budget_plan_item_status AS ENUM ('active', 'paused', 'archived');

-- Task group status
CREATE TYPE task_group_status AS ENUM ('active', 'archived');
-- Migration: 00002_core_identity.sql
-- Description: Core identity tables: Workspace, User, PatientProfile, WorkspaceMembership
-- Schema Version: 1.3.0

-- Workspace: Security boundary and multi-client container
CREATE TABLE workspace (
  workspace_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name TEXT NOT NULL,
  timezone_default TEXT NOT NULL DEFAULT 'America/Los_Angeles',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for workspace lookups
CREATE INDEX idx_workspace_created_at ON workspace(created_at);

-- User: A person account in the app
-- Note: This references Supabase auth.users via user_id = auth.uid()
CREATE TABLE "user" (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  status user_status NOT NULL DEFAULT 'active',
  timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for user table
CREATE INDEX idx_user_workspace_id ON "user"(workspace_id);
CREATE INDEX idx_user_status ON "user"(status);

-- PatientProfile: Profile for the supported person
CREATE TABLE patient_profile (
  patient_id UUID PRIMARY KEY REFERENCES "user"(user_id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  sex TEXT,
  allergies JSONB,
  conditions JSONB,
  timezone_default TEXT NOT NULL DEFAULT 'America/Los_Angeles'
);

-- Index for patient lookups by workspace
CREATE INDEX idx_patient_profile_workspace_id ON patient_profile(workspace_id);

-- WorkspaceMembership: Users belong to a workspace with a role
CREATE TABLE workspace_membership (
  workspace_membership_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
  role_key role_key NOT NULL,
  status membership_status NOT NULL DEFAULT 'active',
  invited_by_user_id UUID REFERENCES "user"(user_id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,

  -- Ensure unique membership per user per workspace
  CONSTRAINT uq_workspace_membership_user_workspace UNIQUE (workspace_id, user_id)
);

-- Indexes for workspace membership
CREATE INDEX idx_workspace_membership_workspace_id ON workspace_membership(workspace_id);
CREATE INDEX idx_workspace_membership_user_id ON workspace_membership(user_id);
CREATE INDEX idx_workspace_membership_role_key ON workspace_membership(role_key);
CREATE INDEX idx_workspace_membership_status ON workspace_membership(status);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER workspace_updated_at
  BEFORE UPDATE ON workspace
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER user_updated_at
  BEFORE UPDATE ON "user"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE workspace IS 'Security boundary and future multi-client container. Single-client v1 still uses a workspace.';
COMMENT ON TABLE "user" IS 'A person account in the app, linked to Supabase auth.users.';
COMMENT ON TABLE patient_profile IS 'Profile for the supported person (single-client now; can expand later).';
COMMENT ON TABLE workspace_membership IS 'Users belong to a workspace with a role. This enables later multi-client expansion cleanly.';
-- Migration: 00003_rbac.sql
-- Description: RBAC tables: Permission, RolePermission, RoleLabel
-- Schema Version: 1.3.0

-- Permission: Canonical permission list for RBAC
CREATE TABLE permission (
  permission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key permission_key NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for permission lookups by key
CREATE INDEX idx_permission_key ON permission(key);

-- RolePermission: Maps roles to allowed permissions; workspace-scoped overrides are supported
CREATE TABLE role_permission (
  role_permission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  role_key role_key NOT NULL,
  permission_key permission_key NOT NULL,
  allowed BOOLEAN NOT NULL DEFAULT true,
  set_by_user_id UUID NOT NULL REFERENCES "user"(user_id) ON DELETE SET NULL,
  set_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Unique constraint: one permission setting per role per workspace
  CONSTRAINT uq_role_permission_workspace_role_perm UNIQUE (workspace_id, role_key, permission_key)
);

-- Indexes for role_permission
CREATE INDEX idx_role_permission_workspace_id ON role_permission(workspace_id);
CREATE INDEX idx_role_permission_role_key ON role_permission(role_key);
CREATE INDEX idx_role_permission_permission_key ON role_permission(permission_key);

-- RoleLabel: Renameable display labels for roles (e.g., Joey/Emily/Family)
CREATE TABLE role_label (
  role_label_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type scope_type NOT NULL,
  scope_id UUID,  -- If scope_type=workspace, scope_id=workspace_id
  role_key role_key NOT NULL,
  singular_label TEXT NOT NULL,
  plural_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Unique constraint: one label per role per scope
  CONSTRAINT uq_role_label_scope_role UNIQUE (scope_type, scope_id, role_key)
);

-- Indexes for role_label
CREATE INDEX idx_role_label_scope ON role_label(scope_type, scope_id);
CREATE INDEX idx_role_label_role_key ON role_label(role_key);

-- Apply updated_at trigger
CREATE TRIGGER role_label_updated_at
  BEFORE UPDATE ON role_label
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE permission IS 'Canonical permission list for RBAC.';
COMMENT ON TABLE role_permission IS 'Maps roles to allowed permissions; workspace-scoped overrides are supported.';
COMMENT ON TABLE role_label IS 'Renameable display labels for roles (e.g., Joey/Emily/Family).';

-- Function to check if a user has a specific permission
CREATE OR REPLACE FUNCTION user_has_permission(
  p_user_id UUID,
  p_workspace_id UUID,
  p_permission_key permission_key
) RETURNS BOOLEAN AS $$
DECLARE
  v_role_key role_key;
  v_allowed BOOLEAN;
BEGIN
  -- Get the user's role in this workspace
  SELECT role_key INTO v_role_key
  FROM workspace_membership
  WHERE user_id = p_user_id
    AND workspace_id = p_workspace_id
    AND status = 'active';

  IF v_role_key IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check role_permission for this workspace
  SELECT allowed INTO v_allowed
  FROM role_permission
  WHERE workspace_id = p_workspace_id
    AND role_key = v_role_key
    AND permission_key = p_permission_key;

  -- Default: admin has all permissions, others have none
  IF v_allowed IS NULL THEN
    RETURN v_role_key = 'admin';
  END IF;

  RETURN v_allowed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's role in a workspace
CREATE OR REPLACE FUNCTION get_user_role(
  p_user_id UUID,
  p_workspace_id UUID
) RETURNS role_key AS $$
DECLARE
  v_role_key role_key;
BEGIN
  SELECT role_key INTO v_role_key
  FROM workspace_membership
  WHERE user_id = p_user_id
    AND workspace_id = p_workspace_id
    AND status = 'active';

  RETURN v_role_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Migration: 00004_feature_modules.sql
-- Description: Feature toggle tables: FeatureModule, FeatureModuleSetting
-- Schema Version: 1.3.0

-- FeatureModule: Canonical list of major modules, with dependencies for safe toggling
CREATE TABLE feature_module (
  feature_module_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key feature_module_key NOT NULL UNIQUE,
  default_enabled BOOLEAN NOT NULL DEFAULT false,
  depends_on_module_keys TEXT[], -- Array of feature_module_key values
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for feature module lookups
CREATE INDEX idx_feature_module_key ON feature_module(key);

-- FeatureModuleSetting: Admin-controlled enable/disable for each module for a given workspace+patient
CREATE TABLE feature_module_setting (
  feature_module_setting_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
  feature_module_id UUID NOT NULL REFERENCES feature_module(feature_module_id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL,
  set_by_user_id UUID NOT NULL REFERENCES "user"(user_id) ON DELETE SET NULL,
  set_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,

  -- Unique constraint: one setting per patient per module
  CONSTRAINT uq_feature_module_setting_patient_module UNIQUE (patient_id, feature_module_id)
);

-- Indexes for feature module setting
CREATE INDEX idx_feature_module_setting_workspace_id ON feature_module_setting(workspace_id);
CREATE INDEX idx_feature_module_setting_patient_id ON feature_module_setting(patient_id);
CREATE INDEX idx_feature_module_setting_enabled ON feature_module_setting(enabled);

-- Comments for documentation
COMMENT ON TABLE feature_module IS 'Canonical list of major modules, with dependencies for safe toggling.';
COMMENT ON TABLE feature_module_setting IS 'Admin-controlled enable/disable for each module for a given workspace+patient.';

-- Function to check if a feature module is enabled for a patient
CREATE OR REPLACE FUNCTION is_feature_enabled(
  p_patient_id UUID,
  p_feature_key feature_module_key
) RETURNS BOOLEAN AS $$
DECLARE
  v_feature_module_id UUID;
  v_setting_enabled BOOLEAN;
  v_default_enabled BOOLEAN;
BEGIN
  -- Get the feature module
  SELECT feature_module_id, default_enabled
  INTO v_feature_module_id, v_default_enabled
  FROM feature_module
  WHERE key = p_feature_key;

  IF v_feature_module_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check for patient-specific setting
  SELECT enabled INTO v_setting_enabled
  FROM feature_module_setting
  WHERE patient_id = p_patient_id
    AND feature_module_id = v_feature_module_id;

  -- Return setting if exists, otherwise default
  RETURN COALESCE(v_setting_enabled, v_default_enabled);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check feature dependencies before enabling
CREATE OR REPLACE FUNCTION check_feature_dependencies(
  p_patient_id UUID,
  p_feature_key feature_module_key
) RETURNS BOOLEAN AS $$
DECLARE
  v_depends_on TEXT[];
  v_dep_key TEXT;
BEGIN
  -- Get dependencies for this feature
  SELECT depends_on_module_keys INTO v_depends_on
  FROM feature_module
  WHERE key = p_feature_key;

  IF v_depends_on IS NULL OR array_length(v_depends_on, 1) IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Check each dependency
  FOREACH v_dep_key IN ARRAY v_depends_on LOOP
    IF NOT is_feature_enabled(p_patient_id, v_dep_key::feature_module_key) THEN
      RETURN FALSE;
    END IF;
  END LOOP;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Migration: 00005_gamification_base.sql
-- Description: Base gamification tables: PointsSystem, CurrencyLabel, LevelSystem, LevelCurve, UserProgress, PointsLedgerEntry
-- Schema Version: 1.3.0

-- PointsSystem: Renameable labels for points (e.g., 'Points' vs 'Victory Points')
CREATE TABLE points_system (
  points_system_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type scope_type NOT NULL,
  scope_id UUID,  -- If scope_type=workspace, scope_id=workspace_id
  key TEXT NOT NULL DEFAULT 'points',
  singular_label TEXT NOT NULL DEFAULT 'Point',
  plural_label TEXT NOT NULL DEFAULT 'Points',
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Unique constraint: one points system per scope
  CONSTRAINT uq_points_system_scope UNIQUE (scope_type, scope_id, key)
);

-- Index for points system
CREATE INDEX idx_points_system_scope ON points_system(scope_type, scope_id);

-- CurrencyLabel: Renameable labels for currencies (coins, grace tokens)
CREATE TABLE currency_label (
  currency_label_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type scope_type NOT NULL,
  scope_id UUID,
  currency_key currency_key NOT NULL,
  singular_label TEXT NOT NULL,
  plural_label TEXT NOT NULL,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Unique constraint: one label per currency per scope
  CONSTRAINT uq_currency_label_scope_currency UNIQUE (scope_type, scope_id, currency_key)
);

-- Index for currency label
CREATE INDEX idx_currency_label_scope ON currency_label(scope_type, scope_id);

-- LevelCurve: Defines required cumulative points per level
CREATE TABLE level_curve (
  curve_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  mode level_curve_mode NOT NULL DEFAULT 'explicit_table',
  formula_config JSONB,  -- If formula: {base, growth, exponent, rounding}
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- LevelCurveStep: Explicit table: required cumulative points to reach each level
CREATE TABLE level_curve_step (
  curve_id UUID NOT NULL REFERENCES level_curve(curve_id) ON DELETE CASCADE,
  level INTEGER NOT NULL CHECK (level >= 1),
  required_cumulative_points INTEGER NOT NULL CHECK (required_cumulative_points >= 0),

  PRIMARY KEY (curve_id, level)
);

-- Index for level curve steps
CREATE INDEX idx_level_curve_step_curve_id ON level_curve_step(curve_id);

-- LevelSystem: Points accumulate into levels. Curve can be explicit table or formula.
CREATE TABLE level_system (
  level_system_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
  points_currency_key currency_key NOT NULL DEFAULT 'points',
  curve_id UUID NOT NULL REFERENCES level_curve(curve_id) ON DELETE RESTRICT,
  max_level INTEGER NOT NULL DEFAULT 10 CHECK (max_level >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Unique constraint: one level system per patient
  CONSTRAINT uq_level_system_patient UNIQUE (patient_id)
);

-- Indexes for level system
CREATE INDEX idx_level_system_workspace_id ON level_system(workspace_id);
CREATE INDEX idx_level_system_patient_id ON level_system(patient_id);

-- UserProgress: Cached progress for fast UI: derived from PointsLedgerEntry + LevelCurve
CREATE TABLE user_progress (
  user_progress_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
  total_points INTEGER NOT NULL DEFAULT 0 CHECK (total_points >= 0),
  current_level INTEGER NOT NULL DEFAULT 1 CHECK (current_level >= 1),
  points_into_level INTEGER NOT NULL DEFAULT 0 CHECK (points_into_level >= 0),
  points_to_next_level INTEGER NOT NULL DEFAULT 100 CHECK (points_to_next_level >= 0),
  last_recomputed_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Unique constraint: one progress record per patient
  CONSTRAINT uq_user_progress_patient UNIQUE (patient_id)
);

-- Indexes for user progress
CREATE INDEX idx_user_progress_workspace_id ON user_progress(workspace_id);
CREATE INDEX idx_user_progress_patient_id ON user_progress(patient_id);

-- PointsLedgerEntry: Append-only ledger of points earned/spent/adjusted
CREATE TABLE points_ledger_entry (
  points_ledger_entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,  -- +earn / -deduct (rare; typically 0+)
  reason TEXT NOT NULL,  -- task_completion, task_group_bonus, admin_adjustment, migration_fix, other
  link_type TEXT,  -- task_instance, task_group_daily_result, goal, other
  link_id UUID,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_user_id UUID REFERENCES "user"(user_id) ON DELETE SET NULL,  -- Null if system-generated
  notes TEXT
);

-- Indexes for points ledger
CREATE INDEX idx_points_ledger_workspace_id ON points_ledger_entry(workspace_id);
CREATE INDEX idx_points_ledger_patient_id ON points_ledger_entry(patient_id);
CREATE INDEX idx_points_ledger_occurred_at ON points_ledger_entry(occurred_at);
CREATE INDEX idx_points_ledger_reason ON points_ledger_entry(reason);
CREATE INDEX idx_points_ledger_link ON points_ledger_entry(link_type, link_id);

-- Apply updated_at triggers
CREATE TRIGGER points_system_updated_at
  BEFORE UPDATE ON points_system
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER currency_label_updated_at
  BEFORE UPDATE ON currency_label
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER level_system_updated_at
  BEFORE UPDATE ON level_system
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE points_system IS 'Renameable labels for points (e.g., Points vs Victory Points).';
COMMENT ON TABLE currency_label IS 'Renameable labels for currencies (coins, grace tokens).';
COMMENT ON TABLE level_curve IS 'Defines required cumulative points per level.';
COMMENT ON TABLE level_curve_step IS 'Explicit table: required cumulative points to reach each level.';
COMMENT ON TABLE level_system IS 'Points accumulate into levels. Curve can be explicit table or formula.';
COMMENT ON TABLE user_progress IS 'Cached progress for fast UI: derived from PointsLedgerEntry + LevelCurve.';
COMMENT ON TABLE points_ledger_entry IS 'Append-only ledger of points earned/spent/adjusted. TaskInstances and bonuses write to this.';

-- Function to calculate level from total points
CREATE OR REPLACE FUNCTION calculate_level_from_points(
  p_curve_id UUID,
  p_total_points INTEGER,
  p_max_level INTEGER DEFAULT 10
) RETURNS TABLE(
  current_level INTEGER,
  points_into_level INTEGER,
  points_to_next_level INTEGER
) AS $$
DECLARE
  v_level INTEGER := 1;
  v_prev_threshold INTEGER := 0;
  v_curr_threshold INTEGER;
  v_next_threshold INTEGER;
BEGIN
  -- Find the highest level achieved
  SELECT lcs.level, lcs.required_cumulative_points
  INTO v_level, v_prev_threshold
  FROM level_curve_step lcs
  WHERE lcs.curve_id = p_curve_id
    AND lcs.required_cumulative_points <= p_total_points
    AND lcs.level <= p_max_level
  ORDER BY lcs.level DESC
  LIMIT 1;

  IF v_level IS NULL THEN
    v_level := 1;
    v_prev_threshold := 0;
  END IF;

  -- Get threshold for next level
  SELECT lcs.required_cumulative_points
  INTO v_next_threshold
  FROM level_curve_step lcs
  WHERE lcs.curve_id = p_curve_id
    AND lcs.level = v_level + 1
    AND lcs.level <= p_max_level;

  IF v_next_threshold IS NULL THEN
    -- At max level
    v_next_threshold := v_prev_threshold;
  END IF;

  RETURN QUERY SELECT
    v_level,
    p_total_points - v_prev_threshold,
    v_next_threshold - v_prev_threshold;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to recompute user progress from ledger
CREATE OR REPLACE FUNCTION recompute_user_progress(p_patient_id UUID) RETURNS VOID AS $$
DECLARE
  v_total_points INTEGER;
  v_workspace_id UUID;
  v_curve_id UUID;
  v_max_level INTEGER;
  v_level_data RECORD;
BEGIN
  -- Get patient's workspace and level system
  SELECT ls.workspace_id, ls.curve_id, ls.max_level
  INTO v_workspace_id, v_curve_id, v_max_level
  FROM level_system ls
  WHERE ls.patient_id = p_patient_id;

  IF v_curve_id IS NULL THEN
    RETURN;  -- No level system configured
  END IF;

  -- Sum all points from ledger
  SELECT COALESCE(SUM(delta), 0)
  INTO v_total_points
  FROM points_ledger_entry
  WHERE patient_id = p_patient_id;

  -- Calculate level info
  SELECT * INTO v_level_data
  FROM calculate_level_from_points(v_curve_id, v_total_points, v_max_level);

  -- Upsert user progress
  INSERT INTO user_progress (
    workspace_id, patient_id, total_points,
    current_level, points_into_level, points_to_next_level,
    last_recomputed_at
  ) VALUES (
    v_workspace_id, p_patient_id, v_total_points,
    v_level_data.current_level, v_level_data.points_into_level, v_level_data.points_to_next_level,
    now()
  )
  ON CONFLICT (patient_id) DO UPDATE SET
    total_points = EXCLUDED.total_points,
    current_level = EXCLUDED.current_level,
    points_into_level = EXCLUDED.points_into_level,
    points_to_next_level = EXCLUDED.points_to_next_level,
    last_recomputed_at = now();
END;
$$ LANGUAGE plpgsql;

-- Trigger to update user progress when points ledger changes
CREATE OR REPLACE FUNCTION trigger_update_user_progress()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM recompute_user_progress(COALESCE(NEW.patient_id, OLD.patient_id));
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER points_ledger_update_progress
  AFTER INSERT OR UPDATE OR DELETE ON points_ledger_entry
  FOR EACH ROW EXECUTE FUNCTION trigger_update_user_progress();
-- Migration: 00006_rls_policies.sql
-- Description: Row Level Security policies for core identity and base tables
-- Schema Version: 1.3.0

-- Enable RLS on all tables
ALTER TABLE workspace ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_membership ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permission ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_label ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_module ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_module_setting ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_system ENABLE ROW LEVEL SECURITY;
ALTER TABLE currency_label ENABLE ROW LEVEL SECURITY;
ALTER TABLE level_curve ENABLE ROW LEVEL SECURITY;
ALTER TABLE level_curve_step ENABLE ROW LEVEL SECURITY;
ALTER TABLE level_system ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_ledger_entry ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- WORKSPACE POLICIES
-- =============================================================================

-- Users can see workspaces they are members of
CREATE POLICY workspace_select ON workspace
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_membership wm
      WHERE wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
  );

-- Only admins can update workspace settings
CREATE POLICY workspace_update ON workspace
  FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_membership wm
      WHERE wm.user_id = auth.uid()
        AND wm.role_key = 'admin'
        AND wm.status = 'active'
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_membership wm
      WHERE wm.user_id = auth.uid()
        AND wm.role_key = 'admin'
        AND wm.status = 'active'
    )
  );

-- =============================================================================
-- USER POLICIES
-- =============================================================================

-- Users can see other users in their workspace
CREATE POLICY user_select ON "user"
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_membership wm
      WHERE wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
  );

-- Users can update their own profile
CREATE POLICY user_update_own ON "user"
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can update any user in their workspace
CREATE POLICY user_update_admin ON "user"
  FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_membership wm
      WHERE wm.user_id = auth.uid()
        AND wm.role_key = 'admin'
        AND wm.status = 'active'
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_membership wm
      WHERE wm.user_id = auth.uid()
        AND wm.role_key = 'admin'
        AND wm.status = 'active'
    )
  );

-- =============================================================================
-- PATIENT PROFILE POLICIES
-- =============================================================================

-- Users can see patient profiles in their workspace
CREATE POLICY patient_profile_select ON patient_profile
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_membership wm
      WHERE wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
  );

-- Admins can update patient profiles
CREATE POLICY patient_profile_update ON patient_profile
  FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_membership wm
      WHERE wm.user_id = auth.uid()
        AND wm.role_key = 'admin'
        AND wm.status = 'active'
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_membership wm
      WHERE wm.user_id = auth.uid()
        AND wm.role_key = 'admin'
        AND wm.status = 'active'
    )
  );

-- =============================================================================
-- WORKSPACE MEMBERSHIP POLICIES
-- =============================================================================

-- Users can see memberships in their workspace
CREATE POLICY workspace_membership_select ON workspace_membership
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_membership wm
      WHERE wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
  );

-- Admins can manage memberships
CREATE POLICY workspace_membership_insert ON workspace_membership
  FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_membership wm
      WHERE wm.user_id = auth.uid()
        AND wm.role_key = 'admin'
        AND wm.status = 'active'
    )
  );

CREATE POLICY workspace_membership_update ON workspace_membership
  FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_membership wm
      WHERE wm.user_id = auth.uid()
        AND wm.role_key = 'admin'
        AND wm.status = 'active'
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_membership wm
      WHERE wm.user_id = auth.uid()
        AND wm.role_key = 'admin'
        AND wm.status = 'active'
    )
  );

-- =============================================================================
-- PERMISSION POLICIES (Read-only for all authenticated users)
-- =============================================================================

CREATE POLICY permission_select ON permission
  FOR SELECT
  TO authenticated
  USING (true);

-- =============================================================================
-- ROLE PERMISSION POLICIES
-- =============================================================================

-- Users can see role permissions in their workspace
CREATE POLICY role_permission_select ON role_permission
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_membership wm
      WHERE wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
  );

-- Only admins can modify role permissions
CREATE POLICY role_permission_insert ON role_permission
  FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_membership wm
      WHERE wm.user_id = auth.uid()
        AND wm.role_key = 'admin'
        AND wm.status = 'active'
    )
  );

CREATE POLICY role_permission_update ON role_permission
  FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_membership wm
      WHERE wm.user_id = auth.uid()
        AND wm.role_key = 'admin'
        AND wm.status = 'active'
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_membership wm
      WHERE wm.user_id = auth.uid()
        AND wm.role_key = 'admin'
        AND wm.status = 'active'
    )
  );

CREATE POLICY role_permission_delete ON role_permission
  FOR DELETE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_membership wm
      WHERE wm.user_id = auth.uid()
        AND wm.role_key = 'admin'
        AND wm.status = 'active'
    )
  );

-- =============================================================================
-- ROLE LABEL POLICIES
-- =============================================================================

-- All authenticated users can see role labels
CREATE POLICY role_label_select ON role_label
  FOR SELECT
  TO authenticated
  USING (true);

-- =============================================================================
-- FEATURE MODULE POLICIES (Read-only for all authenticated users)
-- =============================================================================

CREATE POLICY feature_module_select ON feature_module
  FOR SELECT
  TO authenticated
  USING (true);

-- =============================================================================
-- FEATURE MODULE SETTING POLICIES
-- =============================================================================

-- Users can see feature settings in their workspace
CREATE POLICY feature_module_setting_select ON feature_module_setting
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_membership wm
      WHERE wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
  );

-- Only admins can modify feature settings
CREATE POLICY feature_module_setting_insert ON feature_module_setting
  FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_membership wm
      WHERE wm.user_id = auth.uid()
        AND wm.role_key = 'admin'
        AND wm.status = 'active'
    )
  );

CREATE POLICY feature_module_setting_update ON feature_module_setting
  FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_membership wm
      WHERE wm.user_id = auth.uid()
        AND wm.role_key = 'admin'
        AND wm.status = 'active'
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_membership wm
      WHERE wm.user_id = auth.uid()
        AND wm.role_key = 'admin'
        AND wm.status = 'active'
    )
  );

-- =============================================================================
-- POINTS SYSTEM AND CURRENCY LABEL POLICIES
-- =============================================================================

CREATE POLICY points_system_select ON points_system
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY currency_label_select ON currency_label
  FOR SELECT
  TO authenticated
  USING (true);

-- =============================================================================
-- LEVEL CURVE POLICIES (Read-only for all authenticated users)
-- =============================================================================

CREATE POLICY level_curve_select ON level_curve
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY level_curve_step_select ON level_curve_step
  FOR SELECT
  TO authenticated
  USING (true);

-- =============================================================================
-- LEVEL SYSTEM POLICIES
-- =============================================================================

CREATE POLICY level_system_select ON level_system
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_membership wm
      WHERE wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
  );

-- =============================================================================
-- USER PROGRESS POLICIES
-- =============================================================================

CREATE POLICY user_progress_select ON user_progress
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_membership wm
      WHERE wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
  );

-- =============================================================================
-- POINTS LEDGER ENTRY POLICIES
-- =============================================================================

-- Users can see points ledger in their workspace
CREATE POLICY points_ledger_entry_select ON points_ledger_entry
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_membership wm
      WHERE wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
  );

-- Members can insert points ledger entries (for task completion)
CREATE POLICY points_ledger_entry_insert ON points_ledger_entry
  FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_membership wm
      WHERE wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
  );

-- =============================================================================
-- SERVICE ROLE BYPASS (for backend operations)
-- =============================================================================

-- Grant service_role full access (bypasses RLS)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
-- Migration: 00007_audit_infrastructure.sql
-- Description: Audit tables and trigger infrastructure
-- Schema Version: 1.3.0

-- =============================================================================
-- AUDIT EVENT TABLE
-- =============================================================================

-- AuditEvent: Mutation audit log (create/update/delete/export/restore)
CREATE TABLE audit_event (
  audit_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES "user"(user_id) ON DELETE SET NULL,
  object_type audit_object_type NOT NULL,
  object_id UUID NOT NULL,
  action audit_action NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  field_changes JSONB,  -- For update: {field: {old, new}}. Consider redaction for sensitive fields.
  notes TEXT
);

-- Indexes for audit event
CREATE INDEX idx_audit_event_workspace_id ON audit_event(workspace_id);
CREATE INDEX idx_audit_event_actor_user_id ON audit_event(actor_user_id);
CREATE INDEX idx_audit_event_object_type ON audit_event(object_type);
CREATE INDEX idx_audit_event_object_id ON audit_event(object_id);
CREATE INDEX idx_audit_event_action ON audit_event(action);
CREATE INDEX idx_audit_event_occurred_at ON audit_event(occurred_at);

-- =============================================================================
-- SENSITIVE ACCESS EVENT TABLE
-- =============================================================================

-- SensitiveAccessEvent: Read/view/download audit for sensitive objects
CREATE TABLE sensitive_access_event (
  sensitive_access_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  actor_user_id UUID NOT NULL REFERENCES "user"(user_id) ON DELETE SET NULL,
  object_type audit_object_type NOT NULL,
  object_id UUID NOT NULL,
  action sensitive_access_action NOT NULL,
  sensitivity data_sensitivity NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  notes TEXT
);

-- Indexes for sensitive access event
CREATE INDEX idx_sensitive_access_workspace_id ON sensitive_access_event(workspace_id);
CREATE INDEX idx_sensitive_access_actor_user_id ON sensitive_access_event(actor_user_id);
CREATE INDEX idx_sensitive_access_object_type ON sensitive_access_event(object_type);
CREATE INDEX idx_sensitive_access_object_id ON sensitive_access_event(object_id);
CREATE INDEX idx_sensitive_access_action ON sensitive_access_event(action);
CREATE INDEX idx_sensitive_access_occurred_at ON sensitive_access_event(occurred_at);

-- =============================================================================
-- RLS POLICIES FOR AUDIT TABLES
-- =============================================================================

ALTER TABLE audit_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensitive_access_event ENABLE ROW LEVEL SECURITY;

-- Only admins with view_audit permission can see audit events
CREATE POLICY audit_event_select ON audit_event
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_membership wm
      WHERE wm.user_id = auth.uid()
        AND wm.role_key = 'admin'
        AND wm.status = 'active'
    )
  );

-- Only admins with view_audit permission can see sensitive access events
CREATE POLICY sensitive_access_event_select ON sensitive_access_event
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_membership wm
      WHERE wm.user_id = auth.uid()
        AND wm.role_key = 'admin'
        AND wm.status = 'active'
    )
  );

-- =============================================================================
-- GENERIC AUDIT TRIGGER FUNCTION
-- =============================================================================

-- Function to create audit events on table mutations
-- Uses JSON access to safely handle tables with or without workspace_id
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  v_workspace_id UUID;
  v_object_id UUID;
  v_object_type audit_object_type;
  v_field_changes JSONB;
  v_old_json JSONB;
  v_new_json JSONB;
  v_record_json JSONB;
BEGIN
  -- Determine object type from table name
  v_object_type := TG_TABLE_NAME::audit_object_type;

  -- Convert record to JSON for safe field access
  IF TG_OP = 'DELETE' THEN
    v_record_json := to_jsonb(OLD);
  ELSE
    v_record_json := to_jsonb(NEW);
  END IF;

  -- Get workspace_id safely (may not exist on all tables)
  v_workspace_id := (v_record_json->>'workspace_id')::UUID;

  -- Get primary key (try table_id pattern, then id, then workspace_id)
  v_object_id := COALESCE(
    (v_record_json->>(TG_TABLE_NAME || '_id'))::UUID,
    (v_record_json->>'id')::UUID,
    v_workspace_id
  );

  -- Skip audit if no workspace_id (app-scoped tables like permission, feature_module)
  IF v_workspace_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Calculate field changes for updates
  IF TG_OP = 'UPDATE' THEN
    v_old_json := to_jsonb(OLD);
    v_new_json := to_jsonb(NEW);

    -- Build field_changes object with old/new values for changed fields
    SELECT jsonb_object_agg(
      key,
      jsonb_build_object(
        'old', v_old_json->key,
        'new', v_new_json->key
      )
    )
    INTO v_field_changes
    FROM jsonb_each(v_new_json)
    WHERE v_old_json->key IS DISTINCT FROM v_new_json->key
      AND key NOT IN ('updated_at', 'last_recomputed_at');
  END IF;

  -- Insert audit event
  INSERT INTO audit_event (
    workspace_id,
    actor_user_id,
    object_type,
    object_id,
    action,
    occurred_at,
    field_changes
  ) VALUES (
    v_workspace_id,
    auth.uid(),
    v_object_type,
    v_object_id,
    CASE TG_OP
      WHEN 'INSERT' THEN 'create'::audit_action
      WHEN 'UPDATE' THEN 'update'::audit_action
      WHEN 'DELETE' THEN 'delete'::audit_action
    END,
    now(),
    v_field_changes
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- HELPER FUNCTION TO CREATE AUDIT TRIGGERS
-- =============================================================================

-- Function to easily add audit trigger to a table
CREATE OR REPLACE FUNCTION create_audit_trigger(p_table_name TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE format(
    'CREATE TRIGGER %I
      AFTER INSERT OR UPDATE OR DELETE ON %I
      FOR EACH ROW EXECUTE FUNCTION audit_trigger_func()',
    p_table_name || '_audit_trigger',
    p_table_name
  );
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- APPLY AUDIT TRIGGERS TO CORE TABLES
-- =============================================================================

-- Note: We add audit triggers to tables that should be audited
-- Some tables (like audit_event itself) should NOT have audit triggers

-- Only add audit triggers to tables that have workspace_id
-- Tables without workspace_id (role_label, permission, feature_module) are app-scoped and skipped
SELECT create_audit_trigger('workspace');
SELECT create_audit_trigger('user');
SELECT create_audit_trigger('patient_profile');
SELECT create_audit_trigger('workspace_membership');
SELECT create_audit_trigger('role_permission');
SELECT create_audit_trigger('feature_module_setting');

-- =============================================================================
-- FUNCTION TO LOG SENSITIVE ACCESS
-- =============================================================================

-- Function to log sensitive data access (called from application layer)
CREATE OR REPLACE FUNCTION log_sensitive_access(
  p_workspace_id UUID,
  p_object_type audit_object_type,
  p_object_id UUID,
  p_action sensitive_access_action,
  p_sensitivity data_sensitivity,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO sensitive_access_event (
    workspace_id,
    actor_user_id,
    object_type,
    object_id,
    action,
    sensitivity,
    occurred_at,
    ip_address,
    user_agent,
    notes
  ) VALUES (
    p_workspace_id,
    auth.uid(),
    p_object_type,
    p_object_id,
    p_action,
    p_sensitivity,
    now(),
    p_ip_address,
    p_user_agent,
    p_notes
  )
  RETURNING sensitive_access_event_id INTO v_event_id;

  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE audit_event IS 'Mutation audit log (create/update/delete/export/restore). No view logging here to reduce noise.';
COMMENT ON TABLE sensitive_access_event IS 'Read/view/download audit for sensitive objects (health/budget/attachments). This is the security emphasis layer.';
COMMENT ON FUNCTION audit_trigger_func IS 'Generic trigger function to create audit events on table mutations.';
COMMENT ON FUNCTION log_sensitive_access IS 'Function to log sensitive data access, called from application layer.';
