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
