-- Migration: 00056_monthly_spending_summary.sql
-- Description: RPC to get monthly spending totals for the past N months

CREATE OR REPLACE FUNCTION get_monthly_spending_summary(
  p_months INT DEFAULT 6
) RETURNS JSONB AS $$
DECLARE
  v_patient_id UUID;
  v_workspace_id UUID;
  v_result JSONB;
BEGIN
  SELECT pp.patient_id, pp.workspace_id
  INTO v_patient_id, v_workspace_id
  FROM patient_profile pp
  JOIN workspace_membership wm ON wm.workspace_id = pp.workspace_id
  WHERE wm.user_id = auth.uid() AND wm.status = 'active'
  LIMIT 1;

  IF v_patient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No patient profile found');
  END IF;

  SELECT COALESCE(jsonb_agg(row_data ORDER BY month_start), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'month_start', date_trunc('month', bt.occurred_at)::date,
      'total_income', COALESCE(SUM(bt.amount) FILTER (WHERE bt.type = 'income'), 0),
      'total_expense', COALESCE(SUM(bt.amount) FILTER (WHERE bt.type = 'expense'), 0)
    ) AS row_data,
    date_trunc('month', bt.occurred_at)::date AS month_start
    FROM budget_transaction bt
    JOIN budget_account ba ON ba.budget_account_id = bt.budget_account_id
    WHERE ba.workspace_id = v_workspace_id
      AND bt.occurred_at >= date_trunc('month', CURRENT_DATE - (p_months || ' months')::interval)
      AND bt.entry_status != 'canceled'
    GROUP BY date_trunc('month', bt.occurred_at)::date
  ) sub;

  RETURN jsonb_build_object('success', true, 'months', v_result);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_monthly_spending_summary(INT) TO authenticated;
