-- Migration: 00071_admin_badge_management.sql
-- Description: Admin RPCs for badge management — create, award, revoke, list definitions

-- Admin: Create a new badge definition
CREATE OR REPLACE FUNCTION admin_create_badge(
  p_slug TEXT,
  p_name TEXT,
  p_description TEXT,
  p_emoji TEXT,
  p_category TEXT DEFAULT 'general'
)
RETURNS JSONB AS $$
DECLARE
  v_badge_id UUID;
  v_max_sort INT;
BEGIN
  -- Verify caller is admin
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;

  -- Get next sort order
  SELECT COALESCE(MAX(sort_order), 0) + 1 INTO v_max_sort FROM badge_definition;

  INSERT INTO badge_definition (slug, name, description, emoji, category, sort_order)
  VALUES (p_slug, p_name, p_description, p_emoji, p_category, v_max_sort)
  RETURNING badge_id INTO v_badge_id;

  RETURN jsonb_build_object(
    'success', true,
    'badge_id', v_badge_id
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'A badge with slug "' || p_slug || '" already exists');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin: Manually award a badge to a patient (uses impersonation)
CREATE OR REPLACE FUNCTION manually_award_badge(p_badge_slug TEXT)
RETURNS JSONB AS $$
DECLARE
  v_patient_id UUID;
  v_workspace_id UUID;
  v_badge_id UUID;
  v_badge_name TEXT;
  v_user_badge_id UUID;
BEGIN
  -- Verify caller is admin
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;

  -- Use effective patient ID (supports impersonation)
  v_patient_id := get_effective_patient_id();
  IF v_patient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Must be impersonating a patient to award badges');
  END IF;

  -- Get workspace
  SELECT workspace_id INTO v_workspace_id
  FROM patient_profile WHERE patient_id = v_patient_id;

  -- Find badge
  SELECT badge_id, name INTO v_badge_id, v_badge_name
  FROM badge_definition WHERE slug = p_badge_slug;

  IF v_badge_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Badge not found: ' || p_badge_slug);
  END IF;

  -- Award (idempotent)
  INSERT INTO user_badge (workspace_id, patient_id, badge_id)
  VALUES (v_workspace_id, v_patient_id, v_badge_id)
  ON CONFLICT (patient_id, badge_id) DO NOTHING
  RETURNING user_badge_id INTO v_user_badge_id;

  IF v_user_badge_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Patient already has this badge');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user_badge_id', v_user_badge_id,
    'badge_name', v_badge_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin: Revoke a badge from a patient (uses impersonation)
CREATE OR REPLACE FUNCTION admin_revoke_badge(p_badge_slug TEXT)
RETURNS JSONB AS $$
DECLARE
  v_patient_id UUID;
  v_badge_id UUID;
  v_deleted INT;
BEGIN
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;

  v_patient_id := get_effective_patient_id();
  IF v_patient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Must be impersonating a patient to revoke badges');
  END IF;

  SELECT badge_id INTO v_badge_id
  FROM badge_definition WHERE slug = p_badge_slug;

  IF v_badge_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Badge not found');
  END IF;

  DELETE FROM user_badge
  WHERE patient_id = v_patient_id AND badge_id = v_badge_id;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  IF v_deleted = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Patient does not have this badge');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin: Get all badge definitions with workspace-wide earned counts
CREATE OR REPLACE FUNCTION get_badge_definitions_admin()
RETURNS JSONB AS $$
DECLARE
  v_workspace_id UUID;
  v_result JSONB;
BEGIN
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;

  SELECT wm.workspace_id INTO v_workspace_id
  FROM workspace_membership wm
  WHERE wm.user_id = auth.uid() AND wm.status = 'active'
  LIMIT 1;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'badge_id', bd.badge_id,
      'slug', bd.slug,
      'name', bd.name,
      'description', bd.description,
      'emoji', bd.emoji,
      'category', bd.category,
      'sort_order', bd.sort_order,
      'earned_count', COALESCE(counts.cnt, 0),
      'created_at', bd.created_at
    ) ORDER BY bd.sort_order
  ), '[]'::jsonb)
  INTO v_result
  FROM badge_definition bd
  LEFT JOIN (
    SELECT badge_id, COUNT(*) as cnt
    FROM user_badge
    WHERE workspace_id = v_workspace_id
    GROUP BY badge_id
  ) counts ON counts.badge_id = bd.badge_id;

  RETURN jsonb_build_object('success', true, 'badges', v_result);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION admin_create_badge(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION manually_award_badge(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_revoke_badge(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_badge_definitions_admin() TO authenticated;
