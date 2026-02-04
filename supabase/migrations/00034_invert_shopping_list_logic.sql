-- ============================================================================
-- Migration: 00034_invert_shopping_list_logic.sql
-- Description: Change shopping list items to default to 'need_to_buy' instead
-- of 'need_to_check_home' for a more intuitive UX
-- ============================================================================

-- Update existing items that are 'need_to_check_home' to 'need_to_buy'
UPDATE shopping_list_item
SET status = 'need_to_buy', updated_at = now()
WHERE status = 'need_to_check_home';

-- Update create_shopping_list function to default items to 'need_to_buy'
CREATE OR REPLACE FUNCTION create_shopping_list(
  p_title TEXT,
  p_recipe_ids UUID[] DEFAULT '{}',
  p_include_favorites BOOLEAN DEFAULT false,
  p_items JSONB DEFAULT '[]'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
  v_patient_id UUID;
  v_shopping_list_id UUID;
  v_recipe_id UUID;
  v_ingredient RECORD;
  v_favorite RECORD;
  v_item JSONB;
BEGIN
  -- Get workspace and patient from membership
  SELECT wm.workspace_id, pp.patient_id
  INTO v_workspace_id, v_patient_id
  FROM workspace_membership wm
  JOIN patient_profile pp ON pp.workspace_id = wm.workspace_id AND pp.patient_id = wm.user_id
  WHERE wm.user_id = auth.uid() AND wm.status = 'active'
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace membership');
  END IF;

  -- Create shopping list
  INSERT INTO shopping_list (
    workspace_id, patient_id, title, status, created_from
  )
  VALUES (
    v_workspace_id, v_patient_id, p_title, 'active',
    jsonb_build_object(
      'recipe_ids', p_recipe_ids,
      'include_favorites', p_include_favorites
    )
  )
  RETURNING shopping_list_id INTO v_shopping_list_id;

  -- Add items from recipes (now defaults to 'need_to_buy')
  FOREACH v_recipe_id IN ARRAY p_recipe_ids
  LOOP
    FOR v_ingredient IN
      SELECT ri.name, ri.quantity, ri.unit, ri.notes
      FROM recipe_ingredient ri
      JOIN recipe r ON r.recipe_id = ri.recipe_id
      WHERE ri.recipe_id = v_recipe_id AND r.workspace_id = v_workspace_id
      ORDER BY ri.sort_order
    LOOP
      INSERT INTO shopping_list_item (
        shopping_list_id, name, quantity, unit, notes, status, source
      )
      VALUES (
        v_shopping_list_id, v_ingredient.name, v_ingredient.quantity,
        v_ingredient.unit::TEXT, v_ingredient.notes, 'need_to_buy',
        jsonb_build_object('type', 'recipe', 'recipe_id', v_recipe_id)
      );
    END LOOP;
  END LOOP;

  -- Add favorite items (now defaults to 'need_to_buy')
  IF p_include_favorites THEN
    FOR v_favorite IN
      SELECT name, default_quantity, default_unit, category_hint
      FROM favorite_item
      WHERE workspace_id = v_workspace_id
      ORDER BY name
    LOOP
      INSERT INTO shopping_list_item (
        shopping_list_id, name, quantity, unit, category_hint, status, source
      )
      VALUES (
        v_shopping_list_id, v_favorite.name, v_favorite.default_quantity,
        v_favorite.default_unit, v_favorite.category_hint, 'need_to_buy',
        jsonb_build_object('type', 'favorite')
      );
    END LOOP;
  END IF;

  -- Add manual items (now defaults to 'need_to_buy')
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO shopping_list_item (
      shopping_list_id, name, quantity, unit, notes, category_hint, status, source
    )
    VALUES (
      v_shopping_list_id, v_item->>'name', (v_item->>'quantity')::NUMERIC,
      v_item->>'unit', v_item->>'notes', v_item->>'category_hint', 'need_to_buy',
      jsonb_build_object('type', 'manual')
    );
  END LOOP;

  RETURN jsonb_build_object('success', true, 'shopping_list_id', v_shopping_list_id);
END;
$$;

-- Update add_shopping_item function to default to 'need_to_buy'
CREATE OR REPLACE FUNCTION add_shopping_item(
  p_shopping_list_id UUID,
  p_name TEXT,
  p_quantity NUMERIC DEFAULT NULL,
  p_unit TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_category_hint TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
  v_item_id UUID;
BEGIN
  SELECT workspace_id INTO v_workspace_id
  FROM workspace_membership
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace membership');
  END IF;

  -- Verify list belongs to workspace
  IF NOT EXISTS (
    SELECT 1 FROM shopping_list
    WHERE shopping_list_id = p_shopping_list_id AND workspace_id = v_workspace_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Shopping list not found');
  END IF;

  INSERT INTO shopping_list_item (
    shopping_list_id, name, quantity, unit, notes, category_hint, status, source
  )
  VALUES (
    p_shopping_list_id, p_name, p_quantity, p_unit, p_notes, p_category_hint,
    'need_to_buy', jsonb_build_object('type', 'manual')
  )
  RETURNING shopping_list_item_id INTO v_item_id;

  RETURN jsonb_build_object('success', true, 'shopping_list_item_id', v_item_id);
END;
$$;

-- Update get_shopping_list to sort 'need_to_buy' first
CREATE OR REPLACE FUNCTION get_shopping_list(p_shopping_list_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
  v_list JSONB;
BEGIN
  SELECT workspace_id INTO v_workspace_id
  FROM workspace_membership
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace membership');
  END IF;

  SELECT jsonb_build_object(
    'shopping_list_id', sl.shopping_list_id,
    'title', sl.title,
    'status', sl.status,
    'created_from', sl.created_from,
    'created_at', sl.created_at,
    'updated_at', sl.updated_at,
    'items', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'shopping_list_item_id', sli.shopping_list_item_id,
          'name', sli.name,
          'quantity', sli.quantity,
          'unit', sli.unit,
          'status', sli.status,
          'category_hint', sli.category_hint,
          'notes', sli.notes,
          'source', sli.source
        ) ORDER BY
          CASE sli.status
            WHEN 'need_to_buy' THEN 1
            WHEN 'already_have' THEN 2
            WHEN 'purchased' THEN 3
            WHEN 'skipped' THEN 4
            WHEN 'need_to_check_home' THEN 5
          END,
          sli.category_hint NULLS LAST,
          sli.name
      ), '[]'::jsonb)
      FROM shopping_list_item sli
      WHERE sli.shopping_list_id = sl.shopping_list_id
    )
  )
  INTO v_list
  FROM shopping_list sl
  WHERE sl.shopping_list_id = p_shopping_list_id AND sl.workspace_id = v_workspace_id;

  IF v_list IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Shopping list not found');
  END IF;

  RETURN jsonb_build_object('success', true, 'list', v_list);
END;
$$;

-- Update get_shopping_lists to only count 'need_to_buy' as remaining
CREATE OR REPLACE FUNCTION get_shopping_lists(
  p_status shopping_list_status DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
  v_lists JSONB;
BEGIN
  SELECT workspace_id INTO v_workspace_id
  FROM workspace_membership
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace membership');
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'shopping_list_id', sl.shopping_list_id,
      'title', sl.title,
      'status', sl.status,
      'created_at', sl.created_at,
      'item_count', (
        SELECT COUNT(*) FROM shopping_list_item sli WHERE sli.shopping_list_id = sl.shopping_list_id
      ),
      'items_remaining', (
        SELECT COUNT(*) FROM shopping_list_item sli
        WHERE sli.shopping_list_id = sl.shopping_list_id
        AND sli.status = 'need_to_buy'
      )
    ) ORDER BY sl.created_at DESC
  )
  INTO v_lists
  FROM shopping_list sl
  WHERE sl.workspace_id = v_workspace_id
    AND (p_status IS NULL OR sl.status = p_status);

  RETURN jsonb_build_object('success', true, 'lists', COALESCE(v_lists, '[]'::jsonb));
END;
$$;
