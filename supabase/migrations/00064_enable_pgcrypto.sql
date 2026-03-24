-- =============================================================================
-- Enable pgcrypto extension for gen_salt/crypt functions used by admin_create_user
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Also update admin_create_user to use fully-qualified function names
-- in case the extensions schema is not in the search_path
CREATE OR REPLACE FUNCTION admin_create_user(
  p_email TEXT,
  p_full_name TEXT,
  p_role TEXT DEFAULT 'member',
  p_password TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_caller_id UUID;
  v_workspace_id UUID;
  v_caller_role TEXT;
  v_user_id UUID;
  v_patient_id UUID;
  v_password TEXT;
BEGIN
  -- Verify caller is admin
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT wm.workspace_id, wm.role INTO v_workspace_id, v_caller_role
  FROM workspace_membership wm
  WHERE wm.user_id = v_caller_id AND wm.status = 'active'
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace');
  END IF;

  IF v_caller_role != 'admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only admins can create users');
  END IF;

  -- Validate role
  IF p_role NOT IN ('admin', 'member', 'support') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid role: ' || p_role);
  END IF;

  -- Check email not already in use
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = LOWER(TRIM(p_email))) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email already in use');
  END IF;

  -- Generate user ID and password
  v_user_id := gen_random_uuid();
  v_password := COALESCE(NULLIF(TRIM(p_password), ''), substr(md5(random()::text), 1, 12));

  -- Create auth user
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
    extensions.crypt(v_password, extensions.gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    jsonb_build_object('full_name', p_full_name),
    now(),
    now(),
    '',
    ''
  );

  -- Create identity
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
    v_user_id,
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', LOWER(TRIM(p_email))),
    'email',
    v_user_id::text,
    now(),
    now(),
    now()
  );

  -- Create patient profile
  v_patient_id := gen_random_uuid();
  INSERT INTO patient_profile (
    patient_id,
    workspace_id,
    user_id,
    full_name
  ) VALUES (
    v_patient_id,
    v_workspace_id,
    v_user_id,
    p_full_name
  );

  -- Create workspace membership
  INSERT INTO workspace_membership (
    workspace_id,
    user_id,
    role,
    status
  ) VALUES (
    v_workspace_id,
    v_user_id,
    p_role,
    'active'
  );

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', LOWER(TRIM(p_email)),
    'full_name', p_full_name,
    'role', p_role
  );

EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'A user with this email already exists');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'Failed to create user: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
