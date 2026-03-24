-- Migration: 00073_admin_purchase_history.sql
-- Description: RPC to get purchase history for impersonated patient

CREATE OR REPLACE FUNCTION get_patient_purchases(
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
  v_patient_id UUID;
  v_result JSONB;
  v_total INT;
BEGIN
  v_patient_id := get_effective_patient_id();
  IF v_patient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No patient context');
  END IF;

  -- Get total count
  SELECT COUNT(*) INTO v_total
  FROM purchase p
  WHERE p.patient_id = v_patient_id;

  -- Get purchases with item details
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'purchase_id', p.purchase_id,
      'store_item_id', p.store_item_id,
      'item_name', si.name,
      'item_type', si.type,
      'quantity', p.quantity,
      'coin_cost_per_unit', p.coin_cost_per_unit,
      'coin_cost_total', p.coin_cost_total,
      'purchased_at', p.purchased_at
    ) ORDER BY p.purchased_at DESC
  ), '[]'::jsonb)
  INTO v_result
  FROM purchase p
  JOIN store_item si ON si.store_item_id = p.store_item_id
  WHERE p.patient_id = v_patient_id
  ORDER BY p.purchased_at DESC
  LIMIT p_limit OFFSET p_offset;

  RETURN jsonb_build_object(
    'success', true,
    'purchases', v_result,
    'total', v_total
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_patient_purchases(INT, INT) TO authenticated;
