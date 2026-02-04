-- Migration: 00010_tasks_audit.sql
-- Description: Audit triggers for Task module tables
-- Schema Version: 1.3.0

-- =============================================================================
-- ADD MISSING VALUES TO audit_object_type ENUM
-- =============================================================================

-- Add task-related types that might be missing
DO $$
BEGIN
  -- Add task_tag_link if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'task_tag_link' AND enumtypid = 'audit_object_type'::regtype) THEN
    ALTER TYPE audit_object_type ADD VALUE 'task_tag_link';
  END IF;

  -- Add recurrence_rule if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'recurrence_rule' AND enumtypid = 'audit_object_type'::regtype) THEN
    ALTER TYPE audit_object_type ADD VALUE 'recurrence_rule';
  END IF;

  -- Add bonus_availability_setting if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'bonus_availability_setting' AND enumtypid = 'audit_object_type'::regtype) THEN
    ALTER TYPE audit_object_type ADD VALUE 'bonus_availability_setting';
  END IF;

  -- Add task_type_label if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'task_type_label' AND enumtypid = 'audit_object_type'::regtype) THEN
    ALTER TYPE audit_object_type ADD VALUE 'task_type_label';
  END IF;

  -- Add task_group_task_link if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'task_group_task_link' AND enumtypid = 'audit_object_type'::regtype) THEN
    ALTER TYPE audit_object_type ADD VALUE 'task_group_task_link';
  END IF;

  -- Add task_group_daily_result if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'task_group_daily_result' AND enumtypid = 'audit_object_type'::regtype) THEN
    ALTER TYPE audit_object_type ADD VALUE 'task_group_daily_result';
  END IF;
END
$$;

-- =============================================================================
-- CREATE AUDIT TRIGGERS FOR TASK TABLES
-- =============================================================================

-- Note: create_audit_trigger function is defined in 00007_audit_infrastructure.sql
-- It only audits tables that have workspace_id (task_type_label at app scope will be skipped automatically)

SELECT create_audit_trigger('task_tag');
SELECT create_audit_trigger('task');
SELECT create_audit_trigger('task_instance');
SELECT create_audit_trigger('recurrence_rule');
SELECT create_audit_trigger('bonus_availability_setting');
SELECT create_audit_trigger('task_group');
SELECT create_audit_trigger('task_group_daily_result');

-- Note: task_tag_link and task_group_task_link don't have workspace_id directly,
-- so they would be skipped by the audit trigger. We could add a custom trigger if needed.
