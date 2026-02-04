-- ============================================================================
-- Migration: 00036_store_module.sql
-- Description: Store module - StoreItem, Purchase, Redemption, UserInventory
-- Schema Version: 1.3.0
-- ============================================================================

-- StoreItem: Admin-curated store catalog
CREATE TABLE store_item (
  store_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
  type store_item_type NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  coin_cost INTEGER NOT NULL CHECK (coin_cost >= 0),
  inventory_kind inventory_item_kind NOT NULL,
  max_purchases_total INTEGER CHECK (max_purchases_total >= 1),
  max_purchases_per_month INTEGER CHECK (max_purchases_per_month >= 1),
  metadata JSONB,  -- Type-specific: sticker asset, reward instructions, token identity
  created_by_user_id UUID NOT NULL REFERENCES "user"(user_id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for store item
CREATE INDEX idx_store_item_workspace_id ON store_item(workspace_id);
CREATE INDEX idx_store_item_patient_id ON store_item(patient_id);
CREATE INDEX idx_store_item_type ON store_item(type);
CREATE INDEX idx_store_item_enabled ON store_item(enabled);

-- Purchase: Record of coin purchases
CREATE TABLE purchase (
  purchase_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
  store_item_id UUID NOT NULL REFERENCES store_item(store_item_id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity >= 1),
  coin_cost_total INTEGER NOT NULL CHECK (coin_cost_total >= 0),
  status purchase_status NOT NULL DEFAULT 'pending',
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

-- Indexes for purchase
CREATE INDEX idx_purchase_workspace_id ON purchase(workspace_id);
CREATE INDEX idx_purchase_patient_id ON purchase(patient_id);
CREATE INDEX idx_purchase_store_item_id ON purchase(store_item_id);
CREATE INDEX idx_purchase_status ON purchase(status);
CREATE INDEX idx_purchase_purchased_at ON purchase(purchased_at);

-- Redemption: Fulfillment workflow for real-world rewards
CREATE TABLE redemption (
  redemption_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
  purchase_id UUID NOT NULL REFERENCES purchase(purchase_id) ON DELETE RESTRICT,
  store_item_id UUID NOT NULL REFERENCES store_item(store_item_id) ON DELETE RESTRICT,
  status redemption_status NOT NULL DEFAULT 'requested',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_by_user_id UUID REFERENCES "user"(user_id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  denied_by_user_id UUID REFERENCES "user"(user_id) ON DELETE SET NULL,
  denied_at TIMESTAMPTZ,
  fulfilled_by_user_id UUID REFERENCES "user"(user_id) ON DELETE SET NULL,
  fulfilled_at TIMESTAMPTZ,
  notes TEXT
);

-- Indexes for redemption
CREATE INDEX idx_redemption_workspace_id ON redemption(workspace_id);
CREATE INDEX idx_redemption_patient_id ON redemption(patient_id);
CREATE INDEX idx_redemption_status ON redemption(status);
CREATE INDEX idx_redemption_requested_at ON redemption(requested_at);

-- UserInventory: Items owned by user (cosmetics, consumables, entitlements)
CREATE TABLE user_inventory (
  user_inventory_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
  store_item_id UUID NOT NULL REFERENCES store_item(store_item_id) ON DELETE RESTRICT,
  kind inventory_item_kind NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  metadata JSONB,

  -- Unique constraint: one inventory entry per item per patient
  CONSTRAINT uq_user_inventory_patient_item UNIQUE (patient_id, store_item_id)
);

-- Indexes for user inventory
CREATE INDEX idx_user_inventory_workspace_id ON user_inventory(workspace_id);
CREATE INDEX idx_user_inventory_patient_id ON user_inventory(patient_id);
CREATE INDEX idx_user_inventory_store_item_id ON user_inventory(store_item_id);
CREATE INDEX idx_user_inventory_kind ON user_inventory(kind);

-- Updated_at triggers
CREATE TRIGGER store_item_updated_at
  BEFORE UPDATE ON store_item
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE store_item IS 'Admin-curated store catalog; items can be enabled/disabled per patient.';
COMMENT ON TABLE purchase IS 'Record of coin purchases with status tracking.';
COMMENT ON TABLE redemption IS 'Fulfillment workflow for real-world rewards (and optional approval gates).';
COMMENT ON TABLE user_inventory IS 'Items owned by user: cosmetics (stickers), consumables (tokens), entitlements.';

-- RLS Policies for store_item
ALTER TABLE store_item ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view enabled store items" ON store_item
  FOR SELECT TO authenticated
  USING (
    enabled = true AND
    patient_id IN (
      SELECT pp.patient_id FROM patient_profile pp
      JOIN workspace_membership wm ON wm.workspace_id = pp.workspace_id AND wm.user_id = pp.patient_id
      WHERE wm.user_id = auth.uid() AND wm.status = 'active'
    )
  );

CREATE POLICY "Admin can view all store items" ON store_item
  FOR SELECT TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND role_key = 'admin' AND status = 'active'
    )
  );

CREATE POLICY "Admin can manage store items" ON store_item
  FOR ALL TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND role_key = 'admin' AND status = 'active'
    )
  );

-- RLS Policies for purchase
ALTER TABLE purchase ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchases" ON purchase
  FOR SELECT TO authenticated
  USING (
    patient_id IN (
      SELECT pp.patient_id FROM patient_profile pp
      JOIN workspace_membership wm ON wm.workspace_id = pp.workspace_id AND wm.user_id = pp.patient_id
      WHERE wm.user_id = auth.uid() AND wm.status = 'active'
    )
  );

CREATE POLICY "Admin can view all purchases" ON purchase
  FOR SELECT TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND role_key = 'admin' AND status = 'active'
    )
  );

-- RLS Policies for redemption
ALTER TABLE redemption ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own redemptions" ON redemption
  FOR SELECT TO authenticated
  USING (
    patient_id IN (
      SELECT pp.patient_id FROM patient_profile pp
      JOIN workspace_membership wm ON wm.workspace_id = pp.workspace_id AND wm.user_id = pp.patient_id
      WHERE wm.user_id = auth.uid() AND wm.status = 'active'
    )
  );

CREATE POLICY "Admin can manage redemptions" ON redemption
  FOR ALL TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND role_key = 'admin' AND status = 'active'
    )
  );

-- RLS Policies for user_inventory
ALTER TABLE user_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own inventory" ON user_inventory
  FOR SELECT TO authenticated
  USING (
    patient_id IN (
      SELECT pp.patient_id FROM patient_profile pp
      JOIN workspace_membership wm ON wm.workspace_id = pp.workspace_id AND wm.user_id = pp.patient_id
      WHERE wm.user_id = auth.uid() AND wm.status = 'active'
    )
  );

CREATE POLICY "Admin can view all inventory" ON user_inventory
  FOR SELECT TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = auth.uid() AND role_key = 'admin' AND status = 'active'
    )
  );

-- Function to purchase an item from the store
CREATE OR REPLACE FUNCTION purchase_store_item(
  p_store_item_id UUID,
  p_quantity INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
  v_patient_id UUID;
  v_item RECORD;
  v_coin_cost_total INTEGER;
  v_current_balance INTEGER;
  v_total_purchased INTEGER;
  v_month_purchased INTEGER;
  v_purchase_id UUID;
  v_coin_entry_result JSONB;
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

  -- Get store item details
  SELECT * INTO v_item
  FROM store_item
  WHERE store_item_id = p_store_item_id
    AND workspace_id = v_workspace_id
    AND patient_id = v_patient_id
    AND enabled = true;

  IF v_item IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Store item not found or not available');
  END IF;

  -- Calculate total cost
  v_coin_cost_total := v_item.coin_cost * p_quantity;

  -- Check current balance
  SELECT COALESCE(balance, 0) INTO v_current_balance
  FROM coin_wallet
  WHERE patient_id = v_patient_id;

  IF v_current_balance < v_coin_cost_total THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient coins', 'balance', v_current_balance, 'cost', v_coin_cost_total);
  END IF;

  -- Check max purchases total
  IF v_item.max_purchases_total IS NOT NULL THEN
    SELECT COALESCE(SUM(quantity), 0) INTO v_total_purchased
    FROM purchase
    WHERE store_item_id = p_store_item_id
      AND patient_id = v_patient_id
      AND status = 'completed';

    IF v_total_purchased + p_quantity > v_item.max_purchases_total THEN
      RETURN jsonb_build_object('success', false, 'error', 'Maximum purchase limit reached', 'limit', v_item.max_purchases_total, 'purchased', v_total_purchased);
    END IF;
  END IF;

  -- Check max purchases per month
  IF v_item.max_purchases_per_month IS NOT NULL THEN
    SELECT COALESCE(SUM(quantity), 0) INTO v_month_purchased
    FROM purchase
    WHERE store_item_id = p_store_item_id
      AND patient_id = v_patient_id
      AND status = 'completed'
      AND purchased_at >= date_trunc('month', now());

    IF v_month_purchased + p_quantity > v_item.max_purchases_per_month THEN
      RETURN jsonb_build_object('success', false, 'error', 'Monthly purchase limit reached', 'limit', v_item.max_purchases_per_month, 'purchased_this_month', v_month_purchased);
    END IF;
  END IF;

  -- Create purchase record
  INSERT INTO purchase (
    workspace_id, patient_id, store_item_id, quantity, coin_cost_total, status
  )
  VALUES (
    v_workspace_id, v_patient_id, p_store_item_id, p_quantity, v_coin_cost_total, 'completed'
  )
  RETURNING purchase_id INTO v_purchase_id;

  -- Spend coins
  SELECT spend_coins(
    v_patient_id, v_coin_cost_total, 'purchase', 'purchase', v_purchase_id
  ) INTO v_coin_entry_result;

  IF NOT (v_coin_entry_result->>'success')::boolean THEN
    -- Rollback purchase by deleting it
    DELETE FROM purchase WHERE purchase_id = v_purchase_id;
    RETURN v_coin_entry_result;
  END IF;

  -- Add to inventory
  INSERT INTO user_inventory (
    workspace_id, patient_id, store_item_id, kind, quantity
  )
  VALUES (
    v_workspace_id, v_patient_id, p_store_item_id, v_item.inventory_kind, p_quantity
  )
  ON CONFLICT (patient_id, store_item_id) DO UPDATE SET
    quantity = user_inventory.quantity + p_quantity;

  -- If it's a real-world reward, create a redemption request
  IF v_item.type = 'real_world_reward' THEN
    INSERT INTO redemption (
      workspace_id, patient_id, purchase_id, store_item_id, status
    )
    VALUES (
      v_workspace_id, v_patient_id, v_purchase_id, p_store_item_id, 'requested'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'purchase_id', v_purchase_id,
    'coin_cost_total', v_coin_cost_total,
    'new_balance', v_current_balance - v_coin_cost_total
  );
END;
$$;

-- Function to get store catalog
CREATE OR REPLACE FUNCTION get_store_items()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
  v_patient_id UUID;
  v_items JSONB;
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

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'store_item_id', si.store_item_id,
      'type', si.type,
      'name', si.name,
      'description', si.description,
      'coin_cost', si.coin_cost,
      'inventory_kind', si.inventory_kind,
      'max_purchases_total', si.max_purchases_total,
      'max_purchases_per_month', si.max_purchases_per_month,
      'metadata', si.metadata,
      'owned_quantity', COALESCE((
        SELECT ui.quantity FROM user_inventory ui
        WHERE ui.store_item_id = si.store_item_id AND ui.patient_id = v_patient_id
      ), 0)
    ) ORDER BY si.type, si.name
  ), '[]'::jsonb)
  INTO v_items
  FROM store_item si
  WHERE si.workspace_id = v_workspace_id
    AND si.patient_id = v_patient_id
    AND si.enabled = true;

  RETURN jsonb_build_object('success', true, 'items', v_items);
END;
$$;

-- Function to get user inventory
CREATE OR REPLACE FUNCTION get_user_inventory()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
  v_patient_id UUID;
  v_items JSONB;
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

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'user_inventory_id', ui.user_inventory_id,
      'store_item_id', ui.store_item_id,
      'name', si.name,
      'type', si.type,
      'kind', ui.kind,
      'quantity', ui.quantity,
      'metadata', si.metadata,
      'acquired_at', ui.acquired_at,
      'expires_at', ui.expires_at
    ) ORDER BY ui.acquired_at DESC
  ), '[]'::jsonb)
  INTO v_items
  FROM user_inventory ui
  JOIN store_item si ON si.store_item_id = ui.store_item_id
  WHERE ui.patient_id = v_patient_id
    AND ui.quantity > 0;

  RETURN jsonb_build_object('success', true, 'items', v_items);
END;
$$;

-- Admin function to create a store item
CREATE OR REPLACE FUNCTION create_store_item(
  p_type store_item_type,
  p_name TEXT,
  p_coin_cost INTEGER,
  p_inventory_kind inventory_item_kind,
  p_description TEXT DEFAULT NULL,
  p_max_purchases_total INTEGER DEFAULT NULL,
  p_max_purchases_per_month INTEGER DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
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

  INSERT INTO store_item (
    workspace_id, patient_id, type, name, description, coin_cost, inventory_kind,
    max_purchases_total, max_purchases_per_month, metadata, created_by_user_id
  )
  VALUES (
    v_workspace_id, v_patient_id, p_type, p_name, p_description, p_coin_cost, p_inventory_kind,
    p_max_purchases_total, p_max_purchases_per_month, p_metadata, auth.uid()
  )
  RETURNING store_item_id INTO v_store_item_id;

  RETURN jsonb_build_object('success', true, 'store_item_id', v_store_item_id);
END;
$$;
