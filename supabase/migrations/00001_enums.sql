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
