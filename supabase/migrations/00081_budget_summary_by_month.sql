-- Migration: 00073_budget_summary_by_month.sql
-- Description: Add get_budget_summary_for_month to allow querying specific months

CREATE OR REPLACE FUNCTION get_budget_summary_for_month(
  p_year INT DEFAULT NULL,
  p_month INT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_workspace_id UUID;
  v_patient_id UUID;
  v_month_start DATE;
  v_month_end DATE;
  v_total_income NUMERIC;
  v_total_expenses NUMERIC;
  v_by_category JSONB;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT wm.workspace_id INTO v_workspace_id
  FROM workspace_membership wm
  WHERE wm.user_id = v_user_id AND wm.status = 'active'
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace membership');
  END IF;

  SELECT patient_id INTO v_patient_id
  FROM patient_profile
  WHERE workspace_id = v_workspace_id
  LIMIT 1;

  IF v_patient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No patient profile found');
  END IF;

  -- Use provided year/month or default to current month
  IF p_year IS NOT NULL AND p_month IS NOT NULL THEN
    v_month_start := make_date(p_year, p_month, 1);
  ELSE
    v_month_start := date_trunc('month', CURRENT_DATE)::DATE;
  END IF;
  v_month_end := (v_month_start + INTERVAL '1 month - 1 day')::DATE;

  -- Total income
  SELECT COALESCE(SUM(amount), 0) INTO v_total_income
  FROM budget_transaction
  WHERE workspace_id = v_workspace_id
    AND patient_id = v_patient_id
    AND type = 'income'
    AND status = 'posted'
    AND occurred_at >= v_month_start
    AND occurred_at <= v_month_end + INTERVAL '1 day';

  -- Total expenses
  SELECT COALESCE(SUM(amount), 0) INTO v_total_expenses
  FROM budget_transaction
  WHERE workspace_id = v_workspace_id
    AND patient_id = v_patient_id
    AND type = 'expense'
    AND status = 'posted'
    AND occurred_at >= v_month_start
    AND occurred_at <= v_month_end + INTERVAL '1 day';

  -- By category
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'category_id', bc.budget_category_id,
      'category_name', bc.name,
      'kind', bc.kind,
      'total', COALESCE(cat_totals.total, 0)
    )
  ), '[]'::jsonb)
  INTO v_by_category
  FROM budget_category bc
  LEFT JOIN (
    SELECT bt.category_id, SUM(bt.amount) AS total
    FROM budget_transaction bt
    WHERE bt.workspace_id = v_workspace_id
      AND bt.patient_id = v_patient_id
      AND bt.status = 'posted'
      AND bt.occurred_at >= v_month_start
      AND bt.occurred_at <= v_month_end + INTERVAL '1 day'
    GROUP BY bt.category_id
  ) cat_totals ON cat_totals.category_id = bc.budget_category_id
  WHERE bc.workspace_id = v_workspace_id;

  RETURN jsonb_build_object(
    'success', true,
    'month_start', v_month_start,
    'month_end', v_month_end,
    'total_income', v_total_income,
    'total_expenses', v_total_expenses,
    'net', v_total_income - v_total_expenses,
    'by_category', v_by_category
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_budget_summary_for_month(INT, INT) TO authenticated;
