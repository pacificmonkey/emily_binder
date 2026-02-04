-- Migration: 00013_fix_onboarding_audit.sql
-- Description: Fix onboarding to handle audit triggers properly
-- Schema Version: 1.3.0

-- Update the onboarding function to disable audit triggers during bootstrap
CREATE OR REPLACE FUNCTION complete_onboarding(
  p_display_name TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_workspace_id UUID;
  v_name TEXT;
BEGIN
  -- Get the current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if user already has a workspace membership
  IF EXISTS (
    SELECT 1 FROM workspace_membership
    WHERE user_id = v_user_id AND status = 'active'
  ) THEN
    -- Return existing workspace info
    RETURN jsonb_build_object(
      'success', true,
      'workspace_id', (
        SELECT workspace_id FROM workspace_membership
        WHERE user_id = v_user_id AND status = 'active'
        LIMIT 1
      ),
      'already_onboarded', true
    );
  END IF;

  -- Get user email from auth.users
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = v_user_id;

  -- Determine display name
  v_name := COALESCE(
    NULLIF(p_display_name, ''),
    split_part(v_user_email, '@', 1),
    'User'
  );

  -- Generate workspace ID
  v_workspace_id := gen_random_uuid();

  -- Temporarily disable audit triggers for bootstrap
  -- We set a session variable that the audit trigger will check
  PERFORM set_config('app.skip_audit', 'true', true);

  -- 1. Create workspace
  INSERT INTO workspace (workspace_id, display_name, timezone_default, created_at, updated_at)
  VALUES (
    v_workspace_id,
    v_name || '''s Workspace',
    'America/Los_Angeles',
    now(),
    now()
  );

  -- 2. Create user profile (requires workspace_id)
  INSERT INTO "user" (user_id, workspace_id, display_name, status, timezone, created_at, updated_at)
  VALUES (v_user_id, v_workspace_id, v_name, 'active', 'America/Los_Angeles', now(), now())
  ON CONFLICT (user_id) DO UPDATE SET
    workspace_id = EXCLUDED.workspace_id,
    display_name = EXCLUDED.display_name,
    updated_at = now();

  -- 3. Create patient profile
  INSERT INTO patient_profile (patient_id, workspace_id, full_name, timezone_default)
  VALUES (v_user_id, v_workspace_id, v_name, 'America/Los_Angeles')
  ON CONFLICT (patient_id) DO NOTHING;

  -- 4. Create workspace membership
  INSERT INTO workspace_membership (workspace_id, user_id, role_key, status, joined_at)
  VALUES (v_workspace_id, v_user_id, 'admin', 'active', now())
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  -- 5. Initialize user progress
  INSERT INTO user_progress (workspace_id, user_id, points_system_key, total_points, current_level, next_level_points, points_to_next_level, last_recomputed_at)
  VALUES (v_workspace_id, v_user_id, 'points', 0, 1, 100, 100, now())
  ON CONFLICT DO NOTHING;

  -- Re-enable audit (session variable is automatically cleared at end of transaction)
  PERFORM set_config('app.skip_audit', 'false', true);

  RETURN jsonb_build_object(
    'success', true,
    'workspace_id', v_workspace_id,
    'patient_id', v_user_id,
    'already_onboarded', false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update audit trigger to check for skip flag
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
  -- Check if audit should be skipped (during onboarding bootstrap)
  IF current_setting('app.skip_audit', true) = 'true' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

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

  -- Insert audit event (only if actor exists in user table)
  IF EXISTS (SELECT 1 FROM "user" WHERE user_id = auth.uid()) THEN
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
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
