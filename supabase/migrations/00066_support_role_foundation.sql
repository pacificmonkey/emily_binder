-- ============================================================================
-- 00066: Support Role Foundation
-- ============================================================================
-- Creates infrastructure for the support role:
--   1. support_assignment table (links support users to member patients)
--   2. Add created_by_user_id to tables that lack it
--   3. Extend get_effective_patient_id() to handle support viewing
--   4. get_user_role() RPC for UI role detection
--   5. Support helper functions
--   6. New permission rows (for enum values added in 00065)
--   7. Seed role_permission rows for support defaults
-- ============================================================================
-- NOTE: The 5 new permission_key enum values were added in migration 00065
-- (ALTER TYPE ADD VALUE must run in its own transaction before DML can
--  reference the new values).
-- ============================================================================

-- ============================================================================
-- 1. SUPPORT ASSIGNMENT TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS support_assignment (
  support_assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  support_user_id UUID NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
  assigned_by_user_id UUID REFERENCES "user"(user_id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_currently_viewing BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Each support user can only be assigned to a patient once per workspace
  CONSTRAINT uq_support_assignment UNIQUE (workspace_id, support_user_id, patient_id)
);

-- Only one "currently viewing" patient per support user
CREATE UNIQUE INDEX idx_support_one_active_view
  ON support_assignment (support_user_id)
  WHERE is_currently_viewing = true AND is_active = true;

CREATE INDEX idx_support_assignment_support_user ON support_assignment(support_user_id) WHERE is_active = true;
CREATE INDEX idx_support_assignment_patient ON support_assignment(patient_id) WHERE is_active = true;

-- RLS
ALTER TABLE support_assignment ENABLE ROW LEVEL SECURITY;

-- Admins can manage all assignments in their workspace
CREATE POLICY support_assignment_admin_all ON support_assignment
  FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND role_key = 'admin' AND status = 'active'
    )
  );

-- Support users can read their own assignments
CREATE POLICY support_assignment_support_select ON support_assignment
  FOR SELECT
  USING (support_user_id = auth.uid());

-- Support users can update is_currently_viewing on their own assignments
CREATE POLICY support_assignment_support_update ON support_assignment
  FOR UPDATE
  USING (support_user_id = auth.uid())
  WITH CHECK (support_user_id = auth.uid());

-- Updated_at trigger
CREATE TRIGGER trg_support_assignment_updated_at
  BEFORE UPDATE ON support_assignment
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. ADD created_by_user_id WHERE MISSING
-- ============================================================================

-- symptom_entry
ALTER TABLE symptom_entry
  ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES "user"(user_id) ON DELETE SET NULL;

-- Backfill: set to the patient_id (the member who owns the entry)
UPDATE symptom_entry SET created_by_user_id = patient_id WHERE created_by_user_id IS NULL;

-- provider_discussion_item
ALTER TABLE provider_discussion_item
  ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES "user"(user_id) ON DELETE SET NULL;

UPDATE provider_discussion_item SET created_by_user_id = patient_id WHERE created_by_user_id IS NULL;

-- shopping_list
ALTER TABLE shopping_list
  ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES "user"(user_id) ON DELETE SET NULL;

UPDATE shopping_list SET created_by_user_id = patient_id WHERE created_by_user_id IS NULL;

-- ============================================================================
-- 3. EXTEND get_effective_patient_id() FOR SUPPORT ROLE
-- ============================================================================

CREATE OR REPLACE FUNCTION get_effective_patient_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_impersonated_patient_id UUID;
  v_support_patient_id UUID;
  v_own_patient_id UUID;
  v_role role_key;
BEGIN
  -- Get caller's role
  SELECT wm.role_key INTO v_role
  FROM workspace_membership wm
  WHERE wm.user_id = auth.uid() AND wm.status = 'active'
  LIMIT 1;

  -- ADMIN: Check for active impersonation session
  IF v_role = 'admin' THEN
    SELECT target_patient_id INTO v_impersonated_patient_id
    FROM admin_impersonation_session
    WHERE admin_user_id = auth.uid()
      AND ended_at IS NULL
    ORDER BY started_at DESC
    LIMIT 1;

    IF v_impersonated_patient_id IS NOT NULL THEN
      RETURN v_impersonated_patient_id;
    END IF;
  END IF;

  -- SUPPORT: Check for currently-viewed assigned patient
  IF v_role = 'support' THEN
    SELECT sa.patient_id INTO v_support_patient_id
    FROM support_assignment sa
    WHERE sa.support_user_id = auth.uid()
      AND sa.is_active = true
      AND sa.is_currently_viewing = true
    LIMIT 1;

    -- If no explicit "currently viewing", use first (or only) assignment
    IF v_support_patient_id IS NULL THEN
      SELECT sa.patient_id INTO v_support_patient_id
      FROM support_assignment sa
      WHERE sa.support_user_id = auth.uid()
        AND sa.is_active = true
      ORDER BY sa.created_at ASC
      LIMIT 1;
    END IF;

    IF v_support_patient_id IS NOT NULL THEN
      RETURN v_support_patient_id;
    END IF;
  END IF;

  -- DEFAULT: Return own patient profile
  SELECT patient_id INTO v_own_patient_id
  FROM patient_profile pp
  JOIN workspace_membership wm ON wm.workspace_id = pp.workspace_id AND wm.user_id = pp.patient_id
  WHERE wm.user_id = auth.uid() AND wm.status = 'active'
  LIMIT 1;

  RETURN v_own_patient_id;
END;
$$;

-- ============================================================================
-- 4. get_user_role() RPC — Returns current user's role for UI routing
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role role_key;
  v_workspace_id UUID;
  v_assigned_patients JSONB;
BEGIN
  -- Get role and workspace
  SELECT wm.role_key, wm.workspace_id
  INTO v_role, v_workspace_id
  FROM workspace_membership wm
  WHERE wm.user_id = auth.uid() AND wm.status = 'active'
  LIMIT 1;

  IF v_role IS NULL THEN
    RETURN jsonb_build_object('role', NULL, 'workspace_id', NULL);
  END IF;

  -- For support users, include assigned patient info
  IF v_role = 'support' THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'patient_id', sa.patient_id,
      'full_name', pp.full_name,
      'is_currently_viewing', sa.is_currently_viewing
    )), '[]'::jsonb)
    INTO v_assigned_patients
    FROM support_assignment sa
    JOIN patient_profile pp ON pp.patient_id = sa.patient_id
    WHERE sa.support_user_id = auth.uid()
      AND sa.is_active = true;

    RETURN jsonb_build_object(
      'role', v_role,
      'workspace_id', v_workspace_id,
      'assigned_patients', v_assigned_patients
    );
  END IF;

  RETURN jsonb_build_object(
    'role', v_role,
    'workspace_id', v_workspace_id
  );
END;
$$;

-- ============================================================================
-- 5. SUPPORT HELPER FUNCTIONS
-- ============================================================================

-- Switch which assigned patient the support user is viewing
CREATE OR REPLACE FUNCTION set_support_viewed_patient(p_patient_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role role_key;
  v_assignment_exists BOOLEAN;
BEGIN
  -- Verify caller is support
  SELECT wm.role_key INTO v_role
  FROM workspace_membership wm
  WHERE wm.user_id = auth.uid() AND wm.status = 'active'
  LIMIT 1;

  IF v_role != 'support' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only support users can use this function');
  END IF;

  -- Verify assignment exists
  SELECT EXISTS(
    SELECT 1 FROM support_assignment
    WHERE support_user_id = auth.uid()
      AND patient_id = p_patient_id
      AND is_active = true
  ) INTO v_assignment_exists;

  IF NOT v_assignment_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active assignment for this patient');
  END IF;

  -- Clear all current views for this support user
  UPDATE support_assignment
  SET is_currently_viewing = false
  WHERE support_user_id = auth.uid()
    AND is_currently_viewing = true;

  -- Set the new viewed patient
  UPDATE support_assignment
  SET is_currently_viewing = true
  WHERE support_user_id = auth.uid()
    AND patient_id = p_patient_id
    AND is_active = true;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Admin: assign a support user to a patient
CREATE OR REPLACE FUNCTION assign_support_to_patient(
  p_support_user_id UUID,
  p_patient_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
  v_is_admin BOOLEAN;
  v_is_support BOOLEAN;
  v_assignment_id UUID;
BEGIN
  -- Verify caller is admin
  SELECT wm.workspace_id, (wm.role_key = 'admin')
  INTO v_workspace_id, v_is_admin
  FROM workspace_membership wm
  WHERE wm.user_id = auth.uid() AND wm.status = 'active'
  LIMIT 1;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only admins can assign support users');
  END IF;

  -- Verify target user is support role
  SELECT EXISTS(
    SELECT 1 FROM workspace_membership
    WHERE user_id = p_support_user_id
      AND workspace_id = v_workspace_id
      AND role_key = 'support'
      AND status = 'active'
  ) INTO v_is_support;

  IF NOT v_is_support THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target user is not a support role member');
  END IF;

  -- Verify patient exists in workspace
  IF NOT EXISTS (
    SELECT 1 FROM patient_profile
    WHERE patient_id = p_patient_id AND workspace_id = v_workspace_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Patient not found in workspace');
  END IF;

  -- Insert or reactivate assignment
  INSERT INTO support_assignment (workspace_id, support_user_id, patient_id, assigned_by_user_id, is_active)
  VALUES (v_workspace_id, p_support_user_id, p_patient_id, auth.uid(), true)
  ON CONFLICT ON CONSTRAINT uq_support_assignment
  DO UPDATE SET is_active = true, updated_at = now()
  RETURNING support_assignment_id INTO v_assignment_id;

  RETURN jsonb_build_object('success', true, 'support_assignment_id', v_assignment_id);
END;
$$;

-- Admin: remove support assignment
CREATE OR REPLACE FUNCTION unassign_support_from_patient(
  p_support_user_id UUID,
  p_patient_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  -- Verify caller is admin
  SELECT wm.workspace_id, (wm.role_key = 'admin')
  INTO v_workspace_id, v_is_admin
  FROM workspace_membership wm
  WHERE wm.user_id = auth.uid() AND wm.status = 'active'
  LIMIT 1;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only admins can remove support assignments');
  END IF;

  -- Deactivate the assignment
  UPDATE support_assignment
  SET is_active = false, is_currently_viewing = false, updated_at = now()
  WHERE workspace_id = v_workspace_id
    AND support_user_id = p_support_user_id
    AND patient_id = p_patient_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Get support dashboard data for the currently viewed patient
CREATE OR REPLACE FUNCTION get_support_dashboard()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id UUID;
  v_patient_name TEXT;
  v_workspace_id UUID;
  v_tasks_today INT;
  v_tasks_completed INT;
  v_vp_earned_today INT;
  v_daily_win_target INT;
  v_daily_win_enabled BOOLEAN;
  v_med_adherence_7d NUMERIC;
  v_recent_symptoms INT;
  v_active_streaks INT;
  v_open_discussions INT;
BEGIN
  v_patient_id := get_effective_patient_id();

  IF v_patient_id IS NULL THEN
    RETURN jsonb_build_object('error', 'No assigned patient found');
  END IF;

  -- Get patient name and workspace
  SELECT pp.full_name, pp.workspace_id
  INTO v_patient_name, v_workspace_id
  FROM patient_profile pp
  WHERE pp.patient_id = v_patient_id;

  -- Today's task stats
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE ti.completion_status = 'done')
  INTO v_tasks_today, v_tasks_completed
  FROM task t
  LEFT JOIN task_instance ti ON ti.task_id = t.task_id AND ti.instance_date = CURRENT_DATE
  WHERE t.patient_id = v_patient_id
    AND t.status = 'active'
    AND (t.assigned_day IS NULL OR t.assigned_day = CURRENT_DATE);

  -- VP earned today
  SELECT COALESCE(SUM(ti.points_awarded), 0)
  INTO v_vp_earned_today
  FROM task_instance ti
  JOIN task t ON t.task_id = ti.task_id
  WHERE t.patient_id = v_patient_id
    AND ti.instance_date = CURRENT_DATE
    AND ti.completion_status = 'done';

  -- Daily win config
  SELECT wc.daily_win_vp_target, wc.daily_win_enabled
  INTO v_daily_win_target, v_daily_win_enabled
  FROM workspace_config wc
  WHERE wc.workspace_id = v_workspace_id;

  v_daily_win_target := COALESCE(v_daily_win_target, 15);
  v_daily_win_enabled := COALESCE(v_daily_win_enabled, true);

  -- Medication adherence (last 7 days)
  SELECT
    CASE
      WHEN COUNT(*) = 0 THEN NULL
      ELSE ROUND(COUNT(*) FILTER (WHERE mi.status = 'taken')::NUMERIC / NULLIF(COUNT(*), 0) * 100, 0)
    END
  INTO v_med_adherence_7d
  FROM medication_intake mi
  JOIN prescription p ON p.prescription_id = mi.prescription_id
  WHERE p.patient_id = v_patient_id
    AND mi.scheduled_at >= (CURRENT_DATE - INTERVAL '7 days');

  -- Recent symptoms (last 7 days)
  SELECT COUNT(*)
  INTO v_recent_symptoms
  FROM symptom_entry se
  WHERE se.patient_id = v_patient_id
    AND se.occurred_at >= (CURRENT_DATE - INTERVAL '7 days');

  -- Active streaks
  SELECT COUNT(*)
  INTO v_active_streaks
  FROM streak_progress sp
  JOIN streak_definition sd ON sd.streak_definition_id = sp.streak_definition_id
  WHERE sp.patient_id = v_patient_id
    AND sd.is_active = true;

  -- Open discussion items
  SELECT COUNT(*)
  INTO v_open_discussions
  FROM provider_discussion_item pdi
  WHERE pdi.patient_id = v_patient_id
    AND pdi.status = 'open';

  RETURN jsonb_build_object(
    'patient_id', v_patient_id,
    'patient_name', v_patient_name,
    'tasks_today', v_tasks_today,
    'tasks_completed', v_tasks_completed,
    'vp_earned_today', v_vp_earned_today,
    'daily_win_target', v_daily_win_target,
    'daily_win_enabled', v_daily_win_enabled,
    'med_adherence_7d', v_med_adherence_7d,
    'recent_symptoms_7d', v_recent_symptoms,
    'active_streaks', v_active_streaks,
    'open_discussions', v_open_discussions
  );
END;
$$;

-- ============================================================================
-- 6. INSERT NEW PERMISSION ROWS (for the enum values added in 00065)
-- ============================================================================
-- These must come BEFORE the role_permission seed (section 7) because the
-- seed references these permission rows.

INSERT INTO permission (key, description)
VALUES
  ('manage_events', 'Create, update, and delete calendar events'),
  ('manage_wellbeing', 'Log symptoms and manage discussion topics'),
  ('manage_shopping', 'Create and manage shopping lists'),
  ('create_tasks_for_member', 'Create tasks on behalf of an assigned member'),
  ('log_intake_for_member', 'Log medication intake on behalf of an assigned member')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- 7. SEED ROLE_PERMISSION FOR SUPPORT
-- ============================================================================

-- Insert support permissions for all existing workspaces
-- Support gets specific limited permissions
INSERT INTO role_permission (workspace_id, role_key, permission_key, allowed, set_by_user_id)
SELECT
  w.workspace_id,
  'support'::role_key,
  p.key,
  CASE p.key
    WHEN 'manage_tasks' THEN true
    WHEN 'manage_events' THEN true
    WHEN 'manage_wellbeing' THEN true
    WHEN 'manage_shopping' THEN true
    WHEN 'view_sensitive_health' THEN true
    WHEN 'create_tasks_for_member' THEN true
    WHEN 'log_intake_for_member' THEN true
    ELSE false
  END,
  (SELECT user_id FROM workspace_membership WHERE workspace_id = w.workspace_id AND role_key = 'admin' AND status = 'active' LIMIT 1)
FROM workspace w
CROSS JOIN (
  SELECT key FROM permission
  WHERE key IN ('manage_tasks', 'manage_events', 'manage_wellbeing', 'manage_shopping',
                'view_sensitive_health', 'view_sensitive_budget',
                'create_tasks_for_member', 'log_intake_for_member',
                'view_all', 'manage_users', 'manage_feature_toggles', 'manage_goals',
                'manage_medications', 'manage_budget', 'manage_recipes',
                'manage_store', 'manage_gamification', 'view_audit',
                'export_data', 'manage_security')
) p
WHERE EXISTS (
  SELECT 1 FROM workspace_membership wm
  WHERE wm.workspace_id = w.workspace_id AND wm.status = 'active'
)
ON CONFLICT ON CONSTRAINT uq_role_permission_workspace_role_perm DO NOTHING;
