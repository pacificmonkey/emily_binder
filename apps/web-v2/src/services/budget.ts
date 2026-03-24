import { supabase } from '@/lib/supabase'
import type {
  BudgetAccount,
  BudgetCategory,
  BudgetTransaction,
  BudgetSummary,
  CreateBudgetAccountInput,
  CreateBudgetCategoryInput,
  CreateBudgetTransactionInput,
} from '@/types/database'

/** Fire-and-forget sensitive access log */
function logSensitiveAccess(objectType: string) {
  supabase.rpc('log_sensitive_access', {
    p_object_type: objectType,
    p_object_id: null,
  }).then(() => {}, () => {})
}

export async function getBudgetAccounts(): Promise<BudgetAccount[]> {
  logSensitiveAccess('budget')

  const { data, error } = await supabase.rpc('get_budget_accounts')
  if (error) throw error
  const result = data as { success: boolean; accounts: BudgetAccount[]; error?: string }
  if (!result.success) throw new Error(result.error || 'Failed to fetch accounts')
  return result.accounts || []
}

export async function getBudgetCategories(): Promise<BudgetCategory[]> {
  const { data, error } = await supabase.rpc('get_budget_categories')
  if (error) throw error
  const result = data as { success: boolean; categories: BudgetCategory[]; error?: string }
  if (!result.success) throw new Error(result.error || 'Failed to fetch categories')
  return result.categories || []
}

export async function createBudgetAccount(input: CreateBudgetAccountInput): Promise<string> {
  const { data, error } = await supabase.rpc('create_budget_account', {
    p_name: input.name,
    p_restriction_type: input.restriction_type || 'none',
    p_notes: input.notes || null,
  })
  if (error) throw error
  const result = data as { success: boolean; budget_account_id?: string; error?: string }
  if (!result.success) throw new Error(result.error || 'Failed to create account')
  return result.budget_account_id!
}

export async function createBudgetCategory(input: CreateBudgetCategoryInput): Promise<string> {
  const { data, error } = await supabase.rpc('create_budget_category', {
    p_name: input.name,
    p_kind: input.kind,
  })
  if (error) throw error
  const result = data as { success: boolean; budget_category_id?: string; error?: string }
  if (!result.success) throw new Error(result.error || 'Failed to create category')
  return result.budget_category_id!
}

export async function createBudgetTransaction(input: CreateBudgetTransactionInput): Promise<string> {
  const { data, error } = await supabase.rpc('create_budget_transaction', {
    p_type: input.type,
    p_title: input.title,
    p_category_id: input.category_id,
    p_account_id: input.account_id,
    p_amount: input.amount,
    p_occurred_at: input.occurred_at || null,
    p_merchant: input.merchant || null,
    p_notes: input.notes || null,
  })
  if (error) throw error
  const result = data as { success: boolean; budget_transaction_id?: string; error?: string }
  if (!result.success) throw new Error(result.error || 'Failed to create transaction')
  return result.budget_transaction_id!
}

export async function getBudgetTransactions(
  accountId?: string,
  categoryId?: string,
  startDate?: string,
  endDate?: string
): Promise<BudgetTransaction[]> {
  const { data, error } = await supabase.rpc('get_budget_transactions', {
    p_account_id: accountId || null,
    p_category_id: categoryId || null,
    p_start_date: startDate || null,
    p_end_date: endDate || null,
    p_limit: 50,
  })
  if (error) throw error
  const result = data as { success: boolean; transactions: BudgetTransaction[]; error?: string }
  if (!result.success) throw new Error(result.error || 'Failed to fetch transactions')
  return result.transactions || []
}

export async function getBudgetSummary(year?: number, month?: number): Promise<BudgetSummary> {
  const rpcName = year != null && month != null ? 'get_budget_summary_for_month' : 'get_budget_summary'
  const params = year != null && month != null ? { p_year: year, p_month: month + 1 } : undefined
  const { data, error } = await supabase.rpc(rpcName, params)
  if (error) throw error
  const result = data as { success: boolean; error?: string } & BudgetSummary
  if (!result.success) throw new Error(result.error || 'Failed to fetch summary')
  return {
    month_start: result.month_start,
    month_end: result.month_end,
    total_income: result.total_income,
    total_expenses: result.total_expenses,
    net: result.net,
    by_category: result.by_category,
  }
}

export interface MonthlySpendingSummary {
  month_start: string
  total_income: number
  total_expense: number
}

export async function getMonthlySpendingSummary(months = 6): Promise<MonthlySpendingSummary[]> {
  const { data, error } = await supabase.rpc('get_monthly_spending_summary', {
    p_months: months,
  })
  if (error) throw error
  const result = data as { success: boolean; months: MonthlySpendingSummary[]; error?: string }
  if (!result.success) throw new Error(result.error || 'Failed to fetch spending summary')
  return result.months || []
}

export async function deleteBudgetTransaction(transactionId: string): Promise<void> {
  const { data, error } = await supabase.rpc('delete_budget_transaction', {
    p_transaction_id: transactionId,
  })
  if (error) throw error
  const result = data as { success: boolean; error?: string }
  if (!result.success) throw new Error(result.error || 'Failed to delete transaction')
}
