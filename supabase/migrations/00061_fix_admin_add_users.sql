-- ============================================================================
-- Migration: 00061_fix_admin_add_users.sql
-- Description: Fix email references in admin RPCs (use auth.users instead of
--              "user" table which has no email column), add role to patient
--              listing, and add admin_create_user RPC.
-- ============================================================================

-- ============================================================================
-- 1. Fix get_patients_for_impersonation: join auth.users for email, add role
-- ============================================================================

CREATE OR REPLACE FUNCTION get_patients_for_impersonation()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
  v_patients JSONB;
BEGIN
  -- Verify caller is an admin and get workspace
  SELECT workspace_id INTO v_workspace_id
  FROM workspace_membership
  WHERE user_id = auth.uid() AND role_key = 'admin' AND status = 'active'
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;

  -- Return all workspace members (with patient profiles) including role
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'patient_id', pp.patient_id,
      'full_name', pp.full_name,
      'email', au.email,
      'role', wm.role_key::TEXT
    ) ORDER BY pp.full_name
  ), '[]'::jsonb)
  INTO v_patients
  FROM patient_profile pp
  JOIN auth.users au ON au.id = pp.patient_id
  LEFT JOIN workspace_membership wm
    ON wm.workspace_id = pp.workspace_id
    AND wm.user_id = pp.patient_id
    AND wm.status = 'active'
  WHERE pp.workspace_id = v_workspace_id;

  RETURN jsonb_build_object('success', true, 'patients', v_patients);
END;
$$;

-- ============================================================================
-- 2. Fix get_audit_log: join auth.users for email instead of "user" table
-- ============================================================================

CREATE OR REPLACE FUNCTION get_audit_log(
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0,
  p_object_type TEXT DEFAULT NULL,
  p_action TEXT DEFAULT NULL
)
RETURNS TABLE (
  audit_event_id UUID,
  object_type TEXT,
  object_id UUID,
  action TEXT,
  actor_user_id UUID,
  actor_email TEXT,
  field_changes JSONB,
  occurred_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
BEGIN
  v_workspace_id := get_effective_workspace_id();

  IF v_workspace_id IS NULL THEN
    RETURN;
  END IF;

  -- Check admin permission
  IF NOT is_admin() THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    ae.audit_event_id,
    ae.object_type::TEXT,
    ae.object_id,
    ae.action::TEXT,
    ae.actor_user_id,
    au.email AS actor_email,
    ae.field_changes,
    ae.occurred_at
  FROM audit_event ae
  LEFT JOIN auth.users au ON au.id = ae.actor_user_id
  WHERE ae.workspace_id = v_workspace_id
    AND (p_object_type IS NULL OR ae.object_type::TEXT = p_object_type)
    AND (p_action IS NULL OR ae.action::TEXT = p_action)
  ORDER BY ae.occurred_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- ============================================================================
-- 3. Admin create user RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION admin_create_user(
  p_email TEXT,
  p_full_name TEXT,
  p_role TEXT DEFAULT 'member',
  p_password TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_workspace_id UUID;
  v_user_id UUID;
  v_password TEXT;
BEGIN
  -- Verify caller is an admin
  SELECT workspace_id INTO v_admin_workspace_id
  FROM workspace_membership
  WHERE user_id = auth.uid() AND role_key = 'admin' AND status = 'active'
  LIMIT 1;

  IF v_admin_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;

  -- Validate email
  IF p_email IS NULL OR TRIM(p_email) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email is required');
  END IF;

  -- Check email not already in use
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = LOWER(TRIM(p_email))) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email already in use');
  END IF;

  -- Validate role
  IF p_role NOT IN ('admin', 'member', 'support') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid role. Must be admin, member, or support');
  END IF;

  v_user_id := gen_random_uuid();
  v_password := COALESCE(NULLIF(TRIM(p_password), ''), gen_random_uuid()::text);

  -- Skip audit for bootstrap inserts
  PERFORM set_config('app.skip_audit', 'true', true);

  -- 1. Create auth user
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    LOWER(TRIM(p_email)),
    crypt(v_password, gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    jsonb_build_object('full_name', p_full_name),
    now(),
    now(),
    '',
    ''
  );

  -- 2. Create auth identity
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', LOWER(TRIM(p_email))),
    'email',
    v_user_id::text,
    now(),
    now(),
    now()
  );

  -- 3. Create user record
  INSERT INTO "user" (user_id, workspace_id, display_name, status, timezone)
  VALUES (v_user_id, v_admin_workspace_id, p_full_name, 'active', 'America/Los_Angeles');

  -- 4. Create workspace membership
  INSERT INTO workspace_membership (workspace_id, user_id, role_key, status, invited_by_user_id)
  VALUES (v_admin_workspace_id, v_user_id, p_role::role_key, 'active', auth.uid());

  -- 5. Create patient profile
  INSERT INTO patient_profile (patient_id, workspace_id, full_name, timezone_default)
  VALUES (v_user_id, v_admin_workspace_id, p_full_name, 'America/Los_Angeles');

  -- 6. Initialize user progress
  INSERT INTO user_progress (workspace_id, patient_id, total_points, current_level, points_into_level, points_to_next_level, last_recomputed_at)
  VALUES (v_admin_workspace_id, v_user_id, 0, 1, 0, 100, now())
  ON CONFLICT (patient_id) DO NOTHING;

  -- Re-enable audit
  PERFORM set_config('app.skip_audit', 'false', true);

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', LOWER(TRIM(p_email)),
    'full_name', p_full_name,
    'role', p_role
  );
END;
$$;

-- Comments
COMMENT ON FUNCTION admin_create_user IS 'Admin-only: Create a new user in the workspace with auth credentials, patient profile, and membership.';
