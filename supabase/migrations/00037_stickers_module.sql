-- ============================================================================
-- Migration: 00037_stickers_module.sql
-- Description: Stickers and Home Decorations - Sticker, HomeDecoration
-- Schema Version: 1.3.0
-- ============================================================================

-- Sticker: Sticker asset definition (linked to StoreItem)
CREATE TABLE sticker (
  sticker_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_item_id UUID NOT NULL REFERENCES store_item(store_item_id) ON DELETE CASCADE,
  asset_key TEXT NOT NULL,  -- Image path or emoji identifier
  default_scale NUMERIC(4,2) DEFAULT 1.0,
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One sticker definition per store item
  CONSTRAINT uq_sticker_store_item UNIQUE (store_item_id)
);

-- Indexes for sticker
CREATE INDEX idx_sticker_store_item_id ON sticker(store_item_id);
CREATE INDEX idx_sticker_tags ON sticker USING GIN (tags);

-- HomeDecoration: Placed decorative items on home page
CREATE TABLE home_decoration (
  home_decoration_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
  store_item_id UUID NOT NULL REFERENCES store_item(store_item_id) ON DELETE RESTRICT,
  status home_decoration_placement_status NOT NULL DEFAULT 'active',
  position JSONB NOT NULL,  -- {x, y} normalized 0..1 or pixels
  rotation NUMERIC(6,2) DEFAULT 0,
  scale NUMERIC(4,2) DEFAULT 1.0,
  z_index INTEGER DEFAULT 0,
  placed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  removed_at TIMESTAMPTZ
);

-- Indexes for home decoration
CREATE INDEX idx_home_decoration_workspace_id ON home_decoration(workspace_id);
CREATE INDEX idx_home_decoration_patient_id ON home_decoration(patient_id);
CREATE INDEX idx_home_decoration_status ON home_decoration(status);

-- Comments
COMMENT ON TABLE sticker IS 'Sticker asset definition (typically referenced by StoreItem metadata).';
COMMENT ON TABLE home_decoration IS 'Placed decorative items on the home page (stickers or other decorations).';

-- RLS Policies for sticker
ALTER TABLE sticker ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view stickers for owned items" ON sticker
  FOR SELECT TO authenticated
  USING (
    store_item_id IN (
      SELECT si.store_item_id FROM store_item si
      WHERE si.patient_id IN (
        SELECT pp.patient_id FROM patient_profile pp
        JOIN workspace_membership wm ON wm.workspace_id = pp.workspace_id AND wm.user_id = pp.patient_id
        WHERE wm.user_id = auth.uid() AND wm.status = 'active'
      )
    )
  );

CREATE POLICY "Admin can manage stickers" ON sticker
  FOR ALL TO authenticated
  USING (
    store_item_id IN (
      SELECT si.store_item_id FROM store_item si
      WHERE si.workspace_id IN (
        SELECT workspace_id FROM workspace_membership
        WHERE user_id = auth.uid() AND role_key = 'admin' AND status = 'active'
      )
    )
  );

-- RLS Policies for home_decoration
ALTER TABLE home_decoration ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own decorations" ON home_decoration
  FOR SELECT TO authenticated
  USING (
    patient_id IN (
      SELECT pp.patient_id FROM patient_profile pp
      JOIN workspace_membership wm ON wm.workspace_id = pp.workspace_id AND wm.user_id = pp.patient_id
      WHERE wm.user_id = auth.uid() AND wm.status = 'active'
    )
  );

CREATE POLICY "Users can manage own decorations" ON home_decoration
  FOR ALL TO authenticated
  USING (
    patient_id IN (
      SELECT pp.patient_id FROM patient_profile pp
      JOIN workspace_membership wm ON wm.workspace_id = pp.workspace_id AND wm.user_id = pp.patient_id
      WHERE wm.user_id = auth.uid() AND wm.status = 'active'
    )
  );

-- Function to place a sticker on the home page
CREATE OR REPLACE FUNCTION place_sticker(
  p_store_item_id UUID,
  p_position JSONB,
  p_rotation NUMERIC DEFAULT 0,
  p_scale NUMERIC DEFAULT 1.0,
  p_z_index INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
  v_patient_id UUID;
  v_owned_quantity INTEGER;
  v_placed_count INTEGER;
  v_decoration_id UUID;
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

  -- Check if user owns this item
  SELECT quantity INTO v_owned_quantity
  FROM user_inventory
  WHERE patient_id = v_patient_id AND store_item_id = p_store_item_id;

  IF v_owned_quantity IS NULL OR v_owned_quantity <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'You do not own this sticker');
  END IF;

  -- Count currently placed instances
  SELECT COUNT(*) INTO v_placed_count
  FROM home_decoration
  WHERE patient_id = v_patient_id
    AND store_item_id = p_store_item_id
    AND status = 'active';

  -- Allow placing up to owned quantity
  IF v_placed_count >= v_owned_quantity THEN
    RETURN jsonb_build_object('success', false, 'error', 'All owned stickers are already placed');
  END IF;

  -- Place the sticker
  INSERT INTO home_decoration (
    workspace_id, patient_id, store_item_id, position, rotation, scale, z_index
  )
  VALUES (
    v_workspace_id, v_patient_id, p_store_item_id, p_position, p_rotation, p_scale, p_z_index
  )
  RETURNING home_decoration_id INTO v_decoration_id;

  RETURN jsonb_build_object('success', true, 'home_decoration_id', v_decoration_id);
END;
$$;

-- Function to update a placed sticker's position/rotation/scale
CREATE OR REPLACE FUNCTION update_decoration(
  p_home_decoration_id UUID,
  p_position JSONB DEFAULT NULL,
  p_rotation NUMERIC DEFAULT NULL,
  p_scale NUMERIC DEFAULT NULL,
  p_z_index INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id UUID;
BEGIN
  -- Get patient from membership
  SELECT pp.patient_id INTO v_patient_id
  FROM workspace_membership wm
  JOIN patient_profile pp ON pp.workspace_id = wm.workspace_id AND pp.patient_id = wm.user_id
  WHERE wm.user_id = auth.uid() AND wm.status = 'active'
  LIMIT 1;

  IF v_patient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace membership');
  END IF;

  -- Verify ownership and update
  UPDATE home_decoration SET
    position = COALESCE(p_position, position),
    rotation = COALESCE(p_rotation, rotation),
    scale = COALESCE(p_scale, scale),
    z_index = COALESCE(p_z_index, z_index)
  WHERE home_decoration_id = p_home_decoration_id
    AND patient_id = v_patient_id
    AND status = 'active';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Decoration not found or not owned');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Function to remove a placed sticker
CREATE OR REPLACE FUNCTION remove_decoration(p_home_decoration_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id UUID;
BEGIN
  -- Get patient from membership
  SELECT pp.patient_id INTO v_patient_id
  FROM workspace_membership wm
  JOIN patient_profile pp ON pp.workspace_id = wm.workspace_id AND pp.patient_id = wm.user_id
  WHERE wm.user_id = auth.uid() AND wm.status = 'active'
  LIMIT 1;

  IF v_patient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace membership');
  END IF;

  -- Soft delete
  UPDATE home_decoration SET
    status = 'removed',
    removed_at = now()
  WHERE home_decoration_id = p_home_decoration_id
    AND patient_id = v_patient_id
    AND status = 'active';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Decoration not found or not owned');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Function to get all placed decorations
CREATE OR REPLACE FUNCTION get_home_decorations()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id UUID;
  v_decorations JSONB;
BEGIN
  -- Get patient from membership
  SELECT pp.patient_id INTO v_patient_id
  FROM workspace_membership wm
  JOIN patient_profile pp ON pp.workspace_id = wm.workspace_id AND pp.patient_id = wm.user_id
  WHERE wm.user_id = auth.uid() AND wm.status = 'active'
  LIMIT 1;

  IF v_patient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace membership');
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'home_decoration_id', hd.home_decoration_id,
      'store_item_id', hd.store_item_id,
      'sticker_name', si.name,
      'asset_key', s.asset_key,
      'position', hd.position,
      'rotation', hd.rotation,
      'scale', hd.scale,
      'z_index', hd.z_index,
      'placed_at', hd.placed_at
    ) ORDER BY hd.z_index, hd.placed_at
  ), '[]'::jsonb)
  INTO v_decorations
  FROM home_decoration hd
  JOIN store_item si ON si.store_item_id = hd.store_item_id
  LEFT JOIN sticker s ON s.store_item_id = hd.store_item_id
  WHERE hd.patient_id = v_patient_id
    AND hd.status = 'active';

  RETURN jsonb_build_object('success', true, 'decorations', v_decorations);
END;
$$;

-- Admin function to create a sticker (also creates the store item)
CREATE OR REPLACE FUNCTION create_sticker(
  p_name TEXT,
  p_asset_key TEXT,
  p_coin_cost INTEGER,
  p_description TEXT DEFAULT NULL,
  p_default_scale NUMERIC DEFAULT 1.0,
  p_tags TEXT[] DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
  v_patient_id UUID;
  v_store_item_id UUID;
  v_sticker_id UUID;
BEGIN
  -- Verify admin role
  SELECT wm.workspace_id, pp.patient_id
  INTO v_workspace_id, v_patient_id
  FROM workspace_membership wm
  JOIN patient_profile pp ON pp.workspace_id = wm.workspace_id AND pp.patient_id = wm.user_id
  WHERE wm.user_id = auth.uid() AND wm.status = 'active' AND wm.role_key = 'admin'
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;

  -- Create store item
  INSERT INTO store_item (
    workspace_id, patient_id, type, name, description, coin_cost,
    inventory_kind, metadata, created_by_user_id
  )
  VALUES (
    v_workspace_id, v_patient_id, 'sticker', p_name, p_description, p_coin_cost,
    'cosmetic', jsonb_build_object('asset_key', p_asset_key), auth.uid()
  )
  RETURNING store_item_id INTO v_store_item_id;

  -- Create sticker definition
  INSERT INTO sticker (store_item_id, asset_key, default_scale, tags)
  VALUES (v_store_item_id, p_asset_key, p_default_scale, p_tags)
  RETURNING sticker_id INTO v_sticker_id;

  RETURN jsonb_build_object(
    'success', true,
    'store_item_id', v_store_item_id,
    'sticker_id', v_sticker_id
  );
END;
$$;
