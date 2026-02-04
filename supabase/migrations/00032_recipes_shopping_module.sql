-- ============================================================================
-- Migration: 00032_recipes_shopping_module.sql
-- Description: Recipes and Shopping List module
-- ============================================================================

-- ============================================================================
-- TABLES
-- ============================================================================

-- Recipe table
CREATE TABLE recipe (
  recipe_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  servings INTEGER CHECK (servings IS NULL OR servings >= 1),
  prep_minutes INTEGER CHECK (prep_minutes IS NULL OR prep_minutes >= 0),
  cook_minutes INTEGER CHECK (cook_minutes IS NULL OR cook_minutes >= 0),
  tags TEXT[] DEFAULT '{}',
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Recipe ingredients table
CREATE TABLE recipe_ingredient (
  recipe_ingredient_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipe(recipe_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity NUMERIC,
  unit recipe_unit,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Favorite items (staples) table
CREATE TABLE favorite_item (
  favorite_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  default_quantity NUMERIC,
  default_unit TEXT,
  category_hint TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Shopping list table
CREATE TABLE shopping_list (
  shopping_list_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status shopping_list_status NOT NULL DEFAULT 'active',
  created_from JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Shopping list items table
CREATE TABLE shopping_list_item (
  shopping_list_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopping_list_id UUID NOT NULL REFERENCES shopping_list(shopping_list_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity NUMERIC,
  unit TEXT,
  status shopping_list_item_status NOT NULL DEFAULT 'need_to_check_home',
  category_hint TEXT,
  notes TEXT,
  source JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Recipe indexes
CREATE INDEX idx_recipe_workspace ON recipe(workspace_id);
CREATE INDEX idx_recipe_patient ON recipe(patient_id);
CREATE INDEX idx_recipe_favorite ON recipe(workspace_id, is_favorite) WHERE is_favorite = true;

-- Recipe ingredient indexes
CREATE INDEX idx_recipe_ingredient_recipe ON recipe_ingredient(recipe_id);

-- Favorite item indexes
CREATE INDEX idx_favorite_item_workspace ON favorite_item(workspace_id);
CREATE INDEX idx_favorite_item_patient ON favorite_item(patient_id);

-- Shopping list indexes
CREATE INDEX idx_shopping_list_workspace ON shopping_list(workspace_id);
CREATE INDEX idx_shopping_list_patient ON shopping_list(patient_id);
CREATE INDEX idx_shopping_list_status ON shopping_list(workspace_id, status);

-- Shopping list item indexes
CREATE INDEX idx_shopping_list_item_list ON shopping_list_item(shopping_list_id);
CREATE INDEX idx_shopping_list_item_status ON shopping_list_item(shopping_list_id, status);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE recipe ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredient ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list_item ENABLE ROW LEVEL SECURITY;

-- Recipe policies
CREATE POLICY "recipe_workspace_member" ON recipe
  FOR ALL TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND status = 'active'
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Recipe ingredient policies (access via recipe)
CREATE POLICY "recipe_ingredient_via_recipe" ON recipe_ingredient
  FOR ALL TO authenticated
  USING (
    recipe_id IN (
      SELECT recipe_id FROM recipe
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_membership
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  )
  WITH CHECK (
    recipe_id IN (
      SELECT recipe_id FROM recipe
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_membership
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

-- Favorite item policies
CREATE POLICY "favorite_item_workspace_member" ON favorite_item
  FOR ALL TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND status = 'active'
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Shopping list policies
CREATE POLICY "shopping_list_workspace_member" ON shopping_list
  FOR ALL TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND status = 'active'
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Shopping list item policies (access via list)
CREATE POLICY "shopping_list_item_via_list" ON shopping_list_item
  FOR ALL TO authenticated
  USING (
    shopping_list_id IN (
      SELECT shopping_list_id FROM shopping_list
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_membership
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  )
  WITH CHECK (
    shopping_list_id IN (
      SELECT shopping_list_id FROM shopping_list
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_membership
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

-- ============================================================================
-- ADD AUDIT OBJECT TYPES
-- ============================================================================

-- Add new object types to audit_object_type enum
ALTER TYPE audit_object_type ADD VALUE IF NOT EXISTS 'recipe';
ALTER TYPE audit_object_type ADD VALUE IF NOT EXISTS 'recipe_ingredient';
ALTER TYPE audit_object_type ADD VALUE IF NOT EXISTS 'favorite_item';
ALTER TYPE audit_object_type ADD VALUE IF NOT EXISTS 'shopping_list';
ALTER TYPE audit_object_type ADD VALUE IF NOT EXISTS 'shopping_list_item';

-- ============================================================================
-- AUDIT TRIGGERS
-- ============================================================================

-- Use the helper function to create audit triggers for tables with workspace_id
SELECT create_audit_trigger('recipe');
SELECT create_audit_trigger('favorite_item');
SELECT create_audit_trigger('shopping_list');

-- Note: recipe_ingredient and shopping_list_item don't have direct workspace_id
-- Their audit is handled via their parent tables (recipe, shopping_list)

-- ============================================================================
-- RPC FUNCTIONS
-- ============================================================================

-- Create recipe with ingredients
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
  SELECT wm.workspace_id, pp.patient_id
  INTO v_workspace_id, v_patient_id
  FROM workspace_membership wm
  JOIN patient_profile pp ON pp.workspace_id = wm.workspace_id AND pp.user_id = wm.user_id
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

-- Get recipes
CREATE OR REPLACE FUNCTION get_recipes(
  p_favorites_only BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
  v_recipes JSONB;
BEGIN
  -- Get workspace from membership
  SELECT workspace_id INTO v_workspace_id
  FROM workspace_membership
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace membership');
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'recipe_id', r.recipe_id,
      'title', r.title,
      'description', r.description,
      'servings', r.servings,
      'prep_minutes', r.prep_minutes,
      'cook_minutes', r.cook_minutes,
      'tags', r.tags,
      'is_favorite', r.is_favorite,
      'created_at', r.created_at,
      'ingredient_count', (
        SELECT COUNT(*) FROM recipe_ingredient ri WHERE ri.recipe_id = r.recipe_id
      )
    ) ORDER BY r.is_favorite DESC, r.title
  )
  INTO v_recipes
  FROM recipe r
  WHERE r.workspace_id = v_workspace_id
    AND (NOT p_favorites_only OR r.is_favorite = true);

  RETURN jsonb_build_object('success', true, 'recipes', COALESCE(v_recipes, '[]'::jsonb));
END;
$$;

-- Get recipe with ingredients
CREATE OR REPLACE FUNCTION get_recipe(p_recipe_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
  v_recipe JSONB;
BEGIN
  -- Get workspace from membership
  SELECT workspace_id INTO v_workspace_id
  FROM workspace_membership
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace membership');
  END IF;

  SELECT jsonb_build_object(
    'recipe_id', r.recipe_id,
    'title', r.title,
    'description', r.description,
    'instructions', r.instructions,
    'servings', r.servings,
    'prep_minutes', r.prep_minutes,
    'cook_minutes', r.cook_minutes,
    'tags', r.tags,
    'is_favorite', r.is_favorite,
    'created_at', r.created_at,
    'updated_at', r.updated_at,
    'ingredients', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'recipe_ingredient_id', ri.recipe_ingredient_id,
          'name', ri.name,
          'quantity', ri.quantity,
          'unit', ri.unit,
          'notes', ri.notes
        ) ORDER BY ri.sort_order
      ), '[]'::jsonb)
      FROM recipe_ingredient ri
      WHERE ri.recipe_id = r.recipe_id
    )
  )
  INTO v_recipe
  FROM recipe r
  WHERE r.recipe_id = p_recipe_id AND r.workspace_id = v_workspace_id;

  IF v_recipe IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Recipe not found');
  END IF;

  RETURN jsonb_build_object('success', true, 'recipe', v_recipe);
END;
$$;

-- Update recipe
CREATE OR REPLACE FUNCTION update_recipe(
  p_recipe_id UUID,
  p_title TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_instructions TEXT DEFAULT NULL,
  p_servings INTEGER DEFAULT NULL,
  p_prep_minutes INTEGER DEFAULT NULL,
  p_cook_minutes INTEGER DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL,
  p_is_favorite BOOLEAN DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
BEGIN
  -- Get workspace from membership
  SELECT workspace_id INTO v_workspace_id
  FROM workspace_membership
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace membership');
  END IF;

  UPDATE recipe SET
    title = COALESCE(p_title, title),
    description = COALESCE(p_description, description),
    instructions = COALESCE(p_instructions, instructions),
    servings = COALESCE(p_servings, servings),
    prep_minutes = COALESCE(p_prep_minutes, prep_minutes),
    cook_minutes = COALESCE(p_cook_minutes, cook_minutes),
    tags = COALESCE(p_tags, tags),
    is_favorite = COALESCE(p_is_favorite, is_favorite),
    updated_at = now()
  WHERE recipe_id = p_recipe_id AND workspace_id = v_workspace_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Recipe not found');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Delete recipe
CREATE OR REPLACE FUNCTION delete_recipe(p_recipe_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
BEGIN
  -- Get workspace from membership
  SELECT workspace_id INTO v_workspace_id
  FROM workspace_membership
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace membership');
  END IF;

  DELETE FROM recipe
  WHERE recipe_id = p_recipe_id AND workspace_id = v_workspace_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Recipe not found');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Toggle recipe favorite
CREATE OR REPLACE FUNCTION toggle_recipe_favorite(p_recipe_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
  v_is_favorite BOOLEAN;
BEGIN
  -- Get workspace from membership
  SELECT workspace_id INTO v_workspace_id
  FROM workspace_membership
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace membership');
  END IF;

  UPDATE recipe SET
    is_favorite = NOT is_favorite,
    updated_at = now()
  WHERE recipe_id = p_recipe_id AND workspace_id = v_workspace_id
  RETURNING is_favorite INTO v_is_favorite;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Recipe not found');
  END IF;

  RETURN jsonb_build_object('success', true, 'is_favorite', v_is_favorite);
END;
$$;

-- ============================================================================
-- FAVORITE ITEMS (STAPLES) FUNCTIONS
-- ============================================================================

-- Create favorite item
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
  JOIN patient_profile pp ON pp.workspace_id = wm.workspace_id AND pp.user_id = wm.user_id
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

-- Get favorite items
CREATE OR REPLACE FUNCTION get_favorite_items()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
  v_items JSONB;
BEGIN
  -- Get workspace from membership
  SELECT workspace_id INTO v_workspace_id
  FROM workspace_membership
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace membership');
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'favorite_item_id', favorite_item_id,
      'name', name,
      'default_quantity', default_quantity,
      'default_unit', default_unit,
      'category_hint', category_hint
    ) ORDER BY name
  )
  INTO v_items
  FROM favorite_item
  WHERE workspace_id = v_workspace_id;

  RETURN jsonb_build_object('success', true, 'items', COALESCE(v_items, '[]'::jsonb));
END;
$$;

-- Delete favorite item
CREATE OR REPLACE FUNCTION delete_favorite_item(p_favorite_item_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
BEGIN
  SELECT workspace_id INTO v_workspace_id
  FROM workspace_membership
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace membership');
  END IF;

  DELETE FROM favorite_item
  WHERE favorite_item_id = p_favorite_item_id AND workspace_id = v_workspace_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Favorite item not found');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================================
-- SHOPPING LIST FUNCTIONS
-- ============================================================================

-- Create shopping list (optionally from recipes and favorites)
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
  JOIN patient_profile pp ON pp.workspace_id = wm.workspace_id AND pp.user_id = wm.user_id
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

-- Get shopping lists
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
        AND sli.status IN ('need_to_check_home', 'need_to_buy')
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

-- Get shopping list with items
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
            WHEN 'need_to_check_home' THEN 2
            WHEN 'already_have' THEN 3
            WHEN 'purchased' THEN 4
            WHEN 'skipped' THEN 5
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

-- Update shopping list item status (two-phase checkoff)
CREATE OR REPLACE FUNCTION update_shopping_item_status(
  p_shopping_list_item_id UUID,
  p_status shopping_list_item_status
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
BEGIN
  SELECT workspace_id INTO v_workspace_id
  FROM workspace_membership
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace membership');
  END IF;

  UPDATE shopping_list_item sli SET
    status = p_status,
    updated_at = now()
  FROM shopping_list sl
  WHERE sli.shopping_list_item_id = p_shopping_list_item_id
    AND sli.shopping_list_id = sl.shopping_list_id
    AND sl.workspace_id = v_workspace_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Shopping list item not found');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Add item to shopping list
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
    'need_to_check_home', jsonb_build_object('type', 'manual')
  )
  RETURNING shopping_list_item_id INTO v_item_id;

  RETURN jsonb_build_object('success', true, 'shopping_list_item_id', v_item_id);
END;
$$;

-- Delete shopping list item
CREATE OR REPLACE FUNCTION delete_shopping_item(p_shopping_list_item_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
BEGIN
  SELECT workspace_id INTO v_workspace_id
  FROM workspace_membership
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace membership');
  END IF;

  DELETE FROM shopping_list_item sli
  USING shopping_list sl
  WHERE sli.shopping_list_item_id = p_shopping_list_item_id
    AND sli.shopping_list_id = sl.shopping_list_id
    AND sl.workspace_id = v_workspace_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Shopping list item not found');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Update shopping list status
CREATE OR REPLACE FUNCTION update_shopping_list_status(
  p_shopping_list_id UUID,
  p_status shopping_list_status
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
BEGIN
  SELECT workspace_id INTO v_workspace_id
  FROM workspace_membership
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace membership');
  END IF;

  UPDATE shopping_list SET
    status = p_status,
    updated_at = now()
  WHERE shopping_list_id = p_shopping_list_id AND workspace_id = v_workspace_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Shopping list not found');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Delete shopping list
CREATE OR REPLACE FUNCTION delete_shopping_list(p_shopping_list_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
BEGIN
  SELECT workspace_id INTO v_workspace_id
  FROM workspace_membership
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace membership');
  END IF;

  DELETE FROM shopping_list
  WHERE shopping_list_id = p_shopping_list_id AND workspace_id = v_workspace_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Shopping list not found');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_recipe TO authenticated;
GRANT EXECUTE ON FUNCTION get_recipes TO authenticated;
GRANT EXECUTE ON FUNCTION get_recipe TO authenticated;
GRANT EXECUTE ON FUNCTION update_recipe TO authenticated;
GRANT EXECUTE ON FUNCTION delete_recipe TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_recipe_favorite TO authenticated;
GRANT EXECUTE ON FUNCTION create_favorite_item TO authenticated;
GRANT EXECUTE ON FUNCTION get_favorite_items TO authenticated;
GRANT EXECUTE ON FUNCTION delete_favorite_item TO authenticated;
GRANT EXECUTE ON FUNCTION create_shopping_list TO authenticated;
GRANT EXECUTE ON FUNCTION get_shopping_lists TO authenticated;
GRANT EXECUTE ON FUNCTION get_shopping_list TO authenticated;
GRANT EXECUTE ON FUNCTION update_shopping_item_status TO authenticated;
GRANT EXECUTE ON FUNCTION add_shopping_item TO authenticated;
GRANT EXECUTE ON FUNCTION delete_shopping_item TO authenticated;
GRANT EXECUTE ON FUNCTION update_shopping_list_status TO authenticated;
GRANT EXECUTE ON FUNCTION delete_shopping_list TO authenticated;
