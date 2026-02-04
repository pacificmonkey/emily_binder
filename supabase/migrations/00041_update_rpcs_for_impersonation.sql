-- ============================================================================
-- Migration: 00041_update_rpcs_for_impersonation.sql
-- Description: Update RPC functions to support admin impersonation
-- ============================================================================

-- Update get_streaks to use effective patient
CREATE OR REPLACE FUNCTION get_streaks()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
  v_patient_id UUID;
  v_streaks JSONB;
BEGIN
  -- Use impersonation-aware helpers
  v_workspace_id := get_effective_workspace_id();
  v_patient_id := get_effective_patient_id();

  IF v_workspace_id IS NULL OR v_patient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace membership or patient profile');
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'streak_definition_id', sd.streak_definition_id,
      'name', sd.name,
      'status', sd.status,
      'template_key', sd.template_key,
      'period', sd.period,
      'filter_config', sd.filter_config,
      'count_threshold', sd.count_threshold,
      'coin_reward', sd.coin_reward,
      'bonus_milestones', sd.bonus_milestones,
      'break_behavior', sd.break_behavior,
      'state', CASE WHEN ss.streak_state_id IS NOT NULL THEN
        jsonb_build_object(
          'streak_state_id', ss.streak_state_id,
          'status', ss.status,
          'current_count', ss.current_count,
          'best_count', ss.best_count,
          'current_period_key', ss.current_period_key,
          'period_satisfied', ss.period_satisfied,
          'last_incremented_at', ss.last_incremented_at,
          'tokens_used_this_month', ss.tokens_used_this_month
        )
      ELSE NULL END
    ) ORDER BY sd.name
  ), '[]'::jsonb)
  INTO v_streaks
  FROM streak_definition sd
  LEFT JOIN streak_state ss ON ss.streak_definition_id = sd.streak_definition_id
    AND ss.patient_id = v_patient_id
  WHERE sd.patient_id = v_patient_id
    AND sd.status = 'active';

  RETURN jsonb_build_object('success', true, 'streaks', v_streaks);
END;
$$;

-- Update get_home_decorations to use effective patient
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
  v_patient_id := get_effective_patient_id();

  IF v_patient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active patient profile');
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

-- Update get_coin_balance to use effective patient
CREATE OR REPLACE FUNCTION get_coin_balance()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id UUID;
  v_balance INTEGER;
BEGIN
  v_patient_id := get_effective_patient_id();

  IF v_patient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active patient profile');
  END IF;

  SELECT COALESCE(balance, 0) INTO v_balance
  FROM coin_wallet
  WHERE patient_id = v_patient_id;

  RETURN jsonb_build_object('success', true, 'balance', COALESCE(v_balance, 0));
END;
$$;

-- Update get_coin_history to use effective patient
CREATE OR REPLACE FUNCTION get_coin_history(p_limit INTEGER DEFAULT 50, p_offset INTEGER DEFAULT 0)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id UUID;
  v_entries JSONB;
BEGIN
  v_patient_id := get_effective_patient_id();

  IF v_patient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active patient profile');
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'coin_ledger_entry_id', coin_ledger_entry_id,
      'delta', delta,
      'reason', reason,
      'link_type', link_type,
      'link_id', link_id,
      'occurred_at', occurred_at,
      'notes', notes
    ) ORDER BY occurred_at DESC
  ), '[]'::jsonb)
  INTO v_entries
  FROM (
    SELECT * FROM coin_ledger_entry
    WHERE patient_id = v_patient_id
    ORDER BY occurred_at DESC
    LIMIT p_limit OFFSET p_offset
  ) sub;

  RETURN jsonb_build_object('success', true, 'entries', v_entries);
END;
$$;

-- Update get_store_items to use effective patient
CREATE OR REPLACE FUNCTION get_store_items()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id UUID;
  v_items JSONB;
BEGIN
  v_patient_id := get_effective_patient_id();

  IF v_patient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active patient profile');
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
      'enabled', si.enabled,
      'sticker', CASE WHEN s.sticker_id IS NOT NULL THEN
        jsonb_build_object(
          'sticker_id', s.sticker_id,
          'asset_key', s.asset_key,
          'default_scale', s.default_scale,
          'tags', s.tags
        )
      ELSE NULL END
    ) ORDER BY si.coin_cost, si.name
  ), '[]'::jsonb)
  INTO v_items
  FROM store_item si
  LEFT JOIN sticker s ON s.store_item_id = si.store_item_id
  WHERE si.patient_id = v_patient_id
    AND si.enabled = true;

  RETURN jsonb_build_object('success', true, 'items', v_items);
END;
$$;

-- Update get_user_inventory to use effective patient
CREATE OR REPLACE FUNCTION get_user_inventory()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id UUID;
  v_items JSONB;
BEGIN
  v_patient_id := get_effective_patient_id();

  IF v_patient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active patient profile');
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'user_inventory_id', ui.user_inventory_id,
      'store_item_id', ui.store_item_id,
      'kind', ui.kind,
      'quantity', ui.quantity,
      'acquired_at', ui.acquired_at,
      'item_name', si.name,
      'item_type', si.type,
      'sticker', CASE WHEN s.sticker_id IS NOT NULL THEN
        jsonb_build_object(
          'asset_key', s.asset_key,
          'default_scale', s.default_scale
        )
      ELSE NULL END
    ) ORDER BY ui.acquired_at DESC
  ), '[]'::jsonb)
  INTO v_items
  FROM user_inventory ui
  JOIN store_item si ON si.store_item_id = ui.store_item_id
  LEFT JOIN sticker s ON s.store_item_id = ui.store_item_id
  WHERE ui.patient_id = v_patient_id
    AND ui.quantity > 0;

  RETURN jsonb_build_object('success', true, 'items', v_items);
END;
$$;

-- Update purchase_store_item to use effective patient
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
  v_balance INTEGER;
  v_total_cost INTEGER;
  v_previous_purchases INTEGER;
  v_monthly_purchases INTEGER;
  v_purchase_id UUID;
BEGIN
  v_workspace_id := get_effective_workspace_id();
  v_patient_id := get_effective_patient_id();

  IF v_workspace_id IS NULL OR v_patient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active patient profile');
  END IF;

  -- Get store item
  SELECT * INTO v_item
  FROM store_item
  WHERE store_item_id = p_store_item_id
    AND patient_id = v_patient_id
    AND enabled = true;

  IF v_item IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item not found or not available');
  END IF;

  -- Calculate total cost
  v_total_cost := v_item.coin_cost * p_quantity;

  -- Get current balance
  SELECT COALESCE(balance, 0) INTO v_balance
  FROM coin_wallet
  WHERE patient_id = v_patient_id;

  IF v_balance IS NULL THEN v_balance := 0; END IF;

  IF v_balance < v_total_cost THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient coins',
      'balance', v_balance,
      'cost', v_total_cost
    );
  END IF;

  -- Check purchase limits
  IF v_item.max_purchases_total IS NOT NULL THEN
    SELECT COALESCE(SUM(quantity), 0) INTO v_previous_purchases
    FROM purchase
    WHERE patient_id = v_patient_id
      AND store_item_id = p_store_item_id
      AND status = 'completed';

    IF v_previous_purchases + p_quantity > v_item.max_purchases_total THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Purchase limit reached',
        'limit', v_item.max_purchases_total,
        'purchased', v_previous_purchases
      );
    END IF;
  END IF;

  IF v_item.max_purchases_per_month IS NOT NULL THEN
    SELECT COALESCE(SUM(quantity), 0) INTO v_monthly_purchases
    FROM purchase
    WHERE patient_id = v_patient_id
      AND store_item_id = p_store_item_id
      AND status = 'completed'
      AND purchased_at >= date_trunc('month', now());

    IF v_monthly_purchases + p_quantity > v_item.max_purchases_per_month THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Monthly purchase limit reached',
        'limit', v_item.max_purchases_per_month,
        'purchased', v_monthly_purchases
      );
    END IF;
  END IF;

  -- Create purchase record
  INSERT INTO purchase (workspace_id, patient_id, store_item_id, quantity, coin_cost_total, status)
  VALUES (v_workspace_id, v_patient_id, p_store_item_id, p_quantity, v_total_cost, 'completed')
  RETURNING purchase_id INTO v_purchase_id;

  -- Spend coins
  PERFORM spend_coins(v_patient_id, v_total_cost, 'purchase', 'purchase', v_purchase_id, 'Purchased: ' || v_item.name);

  -- Add to inventory
  INSERT INTO user_inventory (workspace_id, patient_id, store_item_id, kind, quantity)
  VALUES (v_workspace_id, v_patient_id, p_store_item_id, v_item.inventory_kind, p_quantity)
  ON CONFLICT (patient_id, store_item_id)
  DO UPDATE SET quantity = user_inventory.quantity + p_quantity;

  -- Get new balance
  SELECT balance INTO v_balance
  FROM coin_wallet
  WHERE patient_id = v_patient_id;

  RETURN jsonb_build_object(
    'success', true,
    'purchase_id', v_purchase_id,
    'coin_cost_total', v_total_cost,
    'new_balance', v_balance
  );
END;
$$;

-- Update place_sticker to use effective patient
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
  v_workspace_id := get_effective_workspace_id();
  v_patient_id := get_effective_patient_id();

  IF v_workspace_id IS NULL OR v_patient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active patient profile');
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
