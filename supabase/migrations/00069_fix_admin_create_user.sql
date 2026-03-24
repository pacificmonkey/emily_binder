-- Fix admin_create_user: migration 00064 overwrote 00061's correct version
-- with wrong column names (wm.role → wm.role_key, role → role_key),
-- missing "user" table insert, and non-existent patient_profile.user_id column.

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
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id, 'authenticated', 'authenticated',
    LOWER(TRIM(p_email)),
    extensions.crypt(v_password, extensions.gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    jsonb_build_object('full_name', p_full_name),
    now(), now(), '', ''
  );

  -- 2. Create auth identity
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', LOWER(TRIM(p_email))),
    'email', v_user_id::text,
    now(), now(), now()
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
