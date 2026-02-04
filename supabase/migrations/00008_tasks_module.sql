-- Migration: 00008_tasks_module.sql
-- Description: Task module tables (Task, TaskInstance, TaskGroup, etc.)
-- Schema Version: 1.3.0

-- =============================================================================
-- TASK TYPE LABEL (Renameable labels for task types)
-- =============================================================================

CREATE TABLE task_type_label (
  task_type_label_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type scope_type NOT NULL,
  scope_id UUID, -- NULL for app scope, workspace_id for workspace scope
  task_type_key task_type_key NOT NULL,
  singular_label TEXT NOT NULL,
  plural_label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (scope_type, scope_id, task_type_key)
);

-- Trigger for updated_at
CREATE TRIGGER task_type_label_updated_at
  BEFORE UPDATE ON task_type_label
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- TASK TAG (Simple tags for tasks)
-- =============================================================================

CREATE TABLE task_tag (
  task_tag_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color_hint TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, patient_id, name)
);

CREATE INDEX idx_task_tag_workspace_id ON task_tag(workspace_id);
CREATE INDEX idx_task_tag_patient_id ON task_tag(patient_id);

CREATE TRIGGER task_tag_updated_at
  BEFORE UPDATE ON task_tag
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- TASK (Base task definition)
-- =============================================================================

CREATE TABLE task (
  task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  points INT NOT NULL DEFAULT 10 CHECK (points >= 0),
  assigned_to_user_id UUID NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
  created_by_user_id UUID NOT NULL REFERENCES "user"(user_id) ON DELETE SET NULL,
  task_type_key task_type_key NOT NULL DEFAULT 'one_time',
  status task_status NOT NULL DEFAULT 'active',
  assigned_day DATE, -- For one-time tasks, the specific day
  requires_same_day_completion BOOLEAN NOT NULL DEFAULT true,
  must_do BOOLEAN NOT NULL DEFAULT false,
  source_link_type source_link_type,
  source_link_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_workspace_id ON task(workspace_id);
CREATE INDEX idx_task_patient_id ON task(patient_id);
CREATE INDEX idx_task_assigned_to_user_id ON task(assigned_to_user_id);
CREATE INDEX idx_task_status ON task(status);
CREATE INDEX idx_task_task_type_key ON task(task_type_key);
CREATE INDEX idx_task_assigned_day ON task(assigned_day) WHERE assigned_day IS NOT NULL;

CREATE TRIGGER task_updated_at
  BEFORE UPDATE ON task
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- TASK TAG LINK (Many-to-many between tasks and tags)
-- =============================================================================

CREATE TABLE task_tag_link (
  task_id UUID NOT NULL REFERENCES task(task_id) ON DELETE CASCADE,
  task_tag_id UUID NOT NULL REFERENCES task_tag(task_tag_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, task_tag_id)
);

CREATE INDEX idx_task_tag_link_task_id ON task_tag_link(task_id);
CREATE INDEX idx_task_tag_link_task_tag_id ON task_tag_link(task_tag_id);

-- =============================================================================
-- TASK INSTANCE (A dated instance of a task)
-- =============================================================================

CREATE TABLE task_instance (
  task_instance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES task(task_id) ON DELETE CASCADE,
  assigned_day DATE NOT NULL,
  completion_status task_instance_completion_status NOT NULL DEFAULT 'not_done',
  completed_at TIMESTAMPTZ,
  points_awarded INT NOT NULL DEFAULT 0 CHECK (points_awarded >= 0),
  completion_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (task_id, assigned_day)
);

CREATE INDEX idx_task_instance_workspace_id ON task_instance(workspace_id);
CREATE INDEX idx_task_instance_patient_id ON task_instance(patient_id);
CREATE INDEX idx_task_instance_task_id ON task_instance(task_id);
CREATE INDEX idx_task_instance_assigned_day ON task_instance(assigned_day);
CREATE INDEX idx_task_instance_completion_status ON task_instance(completion_status);
CREATE INDEX idx_task_instance_completed_at ON task_instance(completed_at) WHERE completed_at IS NOT NULL;

-- =============================================================================
-- RECURRENCE RULE (Defines how recurring tasks generate instances)
-- =============================================================================

CREATE TABLE recurrence_rule (
  recurrence_rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES task(task_id) ON DELETE CASCADE,
  frequency recurrence_frequency NOT NULL,
  interval INT NOT NULL DEFAULT 1 CHECK (interval >= 1),
  days_of_week TEXT[], -- Array of day names: ['monday', 'wednesday', 'friday']
  start_date DATE NOT NULL,
  end_date DATE,
  time_window_label TEXT, -- e.g., "Morning", "Evening"
  timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (task_id)
);

CREATE INDEX idx_recurrence_rule_workspace_id ON recurrence_rule(workspace_id);
CREATE INDEX idx_recurrence_rule_task_id ON recurrence_rule(task_id);

CREATE TRIGGER recurrence_rule_updated_at
  BEFORE UPDATE ON recurrence_rule
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- BONUS AVAILABILITY SETTING (Availability caps for bonus tasks)
-- =============================================================================

CREATE TABLE bonus_availability_setting (
  bonus_availability_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES task(task_id) ON DELETE CASCADE,
  availability bonus_availability NOT NULL DEFAULT 'daily',
  cap_timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (task_id)
);

CREATE INDEX idx_bonus_availability_workspace_id ON bonus_availability_setting(workspace_id);
CREATE INDEX idx_bonus_availability_task_id ON bonus_availability_setting(task_id);

-- =============================================================================
-- TASK GROUP (Named group that awards bonus points)
-- =============================================================================

CREATE TABLE task_group (
  task_group_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  threshold_count INT NOT NULL CHECK (threshold_count >= 1),
  bonus_points INT NOT NULL DEFAULT 0 CHECK (bonus_points >= 0),
  status task_group_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_group_workspace_id ON task_group(workspace_id);
CREATE INDEX idx_task_group_patient_id ON task_group(patient_id);
CREATE INDEX idx_task_group_status ON task_group(status);

CREATE TRIGGER task_group_updated_at
  BEFORE UPDATE ON task_group
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- TASK GROUP TASK LINK (Membership link)
-- =============================================================================

CREATE TABLE task_group_task_link (
  task_group_id UUID NOT NULL REFERENCES task_group(task_group_id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES task(task_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (task_group_id, task_id)
);

CREATE INDEX idx_task_group_task_link_task_group_id ON task_group_task_link(task_group_id);
CREATE INDEX idx_task_group_task_link_task_id ON task_group_task_link(task_id);

-- =============================================================================
-- TASK GROUP DAILY RESULT (Daily evaluation for group bonus)
-- =============================================================================

CREATE TABLE task_group_daily_result (
  result_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
  task_group_id UUID NOT NULL REFERENCES task_group(task_group_id) ON DELETE CASCADE,
  day DATE NOT NULL,
  completed_count INT NOT NULL DEFAULT 0 CHECK (completed_count >= 0),
  threshold_met BOOLEAN NOT NULL DEFAULT false,
  bonus_points_awarded INT NOT NULL DEFAULT 0 CHECK (bonus_points_awarded >= 0),
  awarded_at TIMESTAMPTZ,
  UNIQUE (task_group_id, day)
);

CREATE INDEX idx_task_group_daily_result_workspace_id ON task_group_daily_result(workspace_id);
CREATE INDEX idx_task_group_daily_result_patient_id ON task_group_daily_result(patient_id);
CREATE INDEX idx_task_group_daily_result_task_group_id ON task_group_daily_result(task_group_id);
CREATE INDEX idx_task_group_daily_result_day ON task_group_daily_result(day);

-- =============================================================================
-- TRIGGER: Award points on task completion
-- =============================================================================

CREATE OR REPLACE FUNCTION award_points_on_task_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_task_points INT;
  v_points_system_key TEXT := 'points';
BEGIN
  -- Only process when status changes to 'done'
  IF NEW.completion_status = 'done' AND (OLD.completion_status IS NULL OR OLD.completion_status = 'not_done') THEN
    -- Get the task's point value
    SELECT points INTO v_task_points FROM task WHERE task_id = NEW.task_id;

    -- Update the instance with points awarded
    NEW.points_awarded := v_task_points;
    NEW.completed_at := COALESCE(NEW.completed_at, now());

    -- Write to points ledger
    INSERT INTO points_ledger_entry (
      workspace_id,
      user_id,
      points_system_key,
      delta,
      reason,
      link_type,
      link_id,
      occurred_at
    ) VALUES (
      NEW.workspace_id,
      (SELECT assigned_to_user_id FROM task WHERE task_id = NEW.task_id),
      v_points_system_key,
      v_task_points,
      'task_completion',
      'task_instance',
      NEW.task_instance_id,
      NEW.completed_at
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER task_instance_award_points
  BEFORE UPDATE ON task_instance
  FOR EACH ROW EXECUTE FUNCTION award_points_on_task_completion();

-- Also handle INSERT with status = 'done'
CREATE OR REPLACE FUNCTION award_points_on_task_instance_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_task_points INT;
  v_points_system_key TEXT := 'points';
BEGIN
  IF NEW.completion_status = 'done' THEN
    SELECT points INTO v_task_points FROM task WHERE task_id = NEW.task_id;

    NEW.points_awarded := v_task_points;
    NEW.completed_at := COALESCE(NEW.completed_at, now());

    INSERT INTO points_ledger_entry (
      workspace_id,
      user_id,
      points_system_key,
      delta,
      reason,
      link_type,
      link_id,
      occurred_at
    ) VALUES (
      NEW.workspace_id,
      (SELECT assigned_to_user_id FROM task WHERE task_id = NEW.task_id),
      v_points_system_key,
      v_task_points,
      'task_completion',
      'task_instance',
      NEW.task_instance_id,
      NEW.completed_at
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER task_instance_award_points_on_insert
  BEFORE INSERT ON task_instance
  FOR EACH ROW EXECUTE FUNCTION award_points_on_task_instance_insert();

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE task_type_label IS 'Renameable labels for task types (one_time, recurring, bonus).';
COMMENT ON TABLE task_tag IS 'Simple tags for tasks; used for filtering and grouping.';
COMMENT ON TABLE task IS 'Base task definition. TaskInstances represent daily scoring.';
COMMENT ON TABLE task_tag_link IS 'Many-to-many relationship between tasks and tags.';
COMMENT ON TABLE task_instance IS 'A dated instance of a task. Points written to ledger on completion.';
COMMENT ON TABLE recurrence_rule IS 'Defines how recurring tasks generate daily instances.';
COMMENT ON TABLE bonus_availability_setting IS 'Defines availability caps for bonus tasks.';
COMMENT ON TABLE task_group IS 'Named group of tasks that awards bonus points when threshold met.';
COMMENT ON TABLE task_group_task_link IS 'Links tasks to groups for bonus calculation.';
COMMENT ON TABLE task_group_daily_result IS 'Daily evaluation result for group bonus points.';
COMMENT ON FUNCTION award_points_on_task_completion IS 'Writes points to ledger when task marked done.';
