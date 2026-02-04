-- ============================================================================
-- Migration: 00033_fix_recipes_shopping_functions.sql
-- Description: Fix patient_profile join in recipes and shopping functions
-- The patient_profile table uses patient_id (not user_id) as its primary key
-- ============================================================================

-- Fix create_recipe function
CREATE OR REPLACE FUNCTION create_recipe(
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_instructions TEXT DEFAULT NULL,
  p_servings INTEGER DEFAULT NULL,
  p_prep_minutes INTEGER DEFAULT NULL,
  p_cook_minutes INTEGER DEFAULT NULL,
  p_tags TEXT[] DEFAULT '{}',
  p_is_favorite BOOLEAN DEFAULT false,
  p_ingredients JSONB DEFAULT '[]'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
  v_patient_id UUID;
  v_recipe_id UUID;
  v_ingredient JSONB;
  v_sort_order INTEGER := 0;
BEGIN
  -- Get workspace and patient from membership
  -- patient_profile.patient_id references user.user_id
  SELECT wm.workspace_id, pp.patient_id
  INTO v_workspace_id, v_patient_id
  FROM workspace_membership wm
  JOIN patient_profile pp ON pp.workspace_id = wm.workspace_id AND pp.patient_id = wm.user_id
  WHERE wm.user_id = auth.uid() AND wm.status = 'active'
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace membership');
  END IF;

  -- Create recipe
  INSERT INTO recipe (
    workspace_id, patient_id, title, description, instructions,
    servings, prep_minutes, cook_minutes, tags, is_favorite
  )
  VALUES (
    v_workspace_id, v_patient_id, p_title, p_description, p_instructions,
    p_servings, p_prep_minutes, p_cook_minutes, p_tags, p_is_favorite
  )
  RETURNING recipe_id INTO v_recipe_id;

  -- Create ingredients
  FOR v_ingredient IN SELECT * FROM jsonb_array_elements(p_ingredients)
  LOOP
    INSERT INTO recipe_ingredient (
      recipe_id, name, quantity, unit, notes, sort_order
    )
    VALUES (
      v_recipe_id,
      v_ingredient->>'name',
      (v_ingredient->>'quantity')::NUMERIC,
      (v_ingredient->>'unit')::recipe_unit,
      v_ingredient->>'notes',
      v_sort_order
    );
    v_sort_order := v_sort_order + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'recipe_id', v_recipe_id);
END;
$$;

-- Fix create_favorite_item function
CREATE OR REPLACE FUNCTION create_favorite_item(
  p_name TEXT,
  p_default_quantity NUMERIC DEFAULT NULL,
  p_default_unit TEXT DEFAULT NULL,
  p_category_hint TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
  v_patient_id UUID;
  v_favorite_item_id UUID;
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

  INSERT INTO favorite_item (
    workspace_id, patient_id, name, default_quantity, default_unit, category_hint
  )
  VALUES (
    v_workspace_id, v_patient_id, p_name, p_default_quantity, p_default_unit, p_category_hint
  )
  RETURNING favorite_item_id INTO v_favorite_item_id;

  RETURN jsonb_build_object('success', true, 'favorite_item_id', v_favorite_item_id);
END;
$$;

-- Fix create_shopping_list function
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

  -- Add items from recipes
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
        v_ingredient.unit::TEXT, v_ingredient.notes, 'need_to_check_home',
        jsonb_build_object('type', 'recipe', 'recipe_id', v_recipe_id)
      );
    END LOOP;
  END LOOP;

  -- Add favorite items
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
        v_favorite.default_unit, v_favorite.category_hint, 'need_to_check_home',
        jsonb_build_object('type', 'favorite')
      );
    END LOOP;
  END IF;

  -- Add manual items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO shopping_list_item (
      shopping_list_id, name, quantity, unit, notes, category_hint, status, source
    )
    VALUES (
      v_shopping_list_id, v_item->>'name', (v_item->>'quantity')::NUMERIC,
      v_item->>'unit', v_item->>'notes', v_item->>'category_hint', 'need_to_check_home',
      jsonb_build_object('type', 'manual')
    );
  END LOOP;

  RETURN jsonb_build_object('success', true, 'shopping_list_id', v_shopping_list_id);
END;
$$;
