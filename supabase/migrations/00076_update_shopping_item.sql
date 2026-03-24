-- Update shopping item quantity/unit/notes inline
CREATE OR REPLACE FUNCTION update_shopping_item(
  p_shopping_list_item_id UUID,
  p_quantity NUMERIC DEFAULT NULL,
  p_unit TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
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
    quantity = COALESCE(p_quantity, sli.quantity),
    unit = COALESCE(p_unit, sli.unit),
    notes = COALESCE(p_notes, sli.notes),
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

GRANT EXECUTE ON FUNCTION update_shopping_item TO authenticated;
