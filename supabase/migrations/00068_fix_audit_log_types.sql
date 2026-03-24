-- Fix get_audit_log: cast auth.users.email to TEXT to match RETURNS TABLE type
-- auth.users.email is varchar(255) which doesn't match TEXT in strict returns

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
    au.email::TEXT AS actor_email,
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
