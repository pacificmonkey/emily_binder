/**
 * Budget service - Income sources and expenses tracking
 */

import { supabase } from '@/lib/supabase'
import type { BudgetIncomeSource, BudgetExpense, BudgetActualExpense, BudgetExpenseCategory, ExpenseFrequency } from '@/types/database'

// =============================================================================
// BUDGET EXPENSE CATEGORIES (Dynamic, database-driven)
// =============================================================================

export async function getBudgetExpenseCategories(): Promise<BudgetExpenseCategory[]> {
  const { data, error } = await supabase
    .from('budget_expense_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  if (error) throw error
  return data ?? []
}

export async function getAllBudgetExpenseCategories(): Promise<BudgetExpenseCategory[]> {
  // For admin - includes inactive categories
  const { data, error } = await supabase
    .from('budget_expense_categories')
    .select('*')
    .order('sort_order')

  if (error) throw error
  return data ?? []
}

export interface CreateBudgetExpenseCategoryInput {
  name: string
  icon: string
  vp_value: number
  sort_order?: number
}

export async function createBudgetExpenseCategory(input: CreateBudgetExpenseCategoryInput): Promise<BudgetExpenseCategory> {
  const { data, error } = await supabase
    .from('budget_expense_categories')
    .insert({
      name: input.name,
      icon: input.icon,
      vp_value: input.vp_value,
      sort_order: input.sort_order ?? 0,
      is_active: true,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateBudgetExpenseCategory(
  id: string,
  updates: Partial<Pick<BudgetExpenseCategory, 'name' | 'icon' | 'vp_value' | 'sort_order' | 'is_active'>>
): Promise<BudgetExpenseCategory> {
  const { data, error } = await supabase
    .from('budget_expense_categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteBudgetExpenseCategory(id: string): Promise<void> {
  const { error } = await supabase
    .from('budget_expense_categories')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// =============================================================================
// INCOME SOURCES
// =============================================================================

export async function getIncomeSources(ownerId: string): Promise<BudgetIncomeSource[]> {
  const { data, error } = await supabase
    .from('budget_income_sources')
    .select('*')
    .eq('owner_user_id', ownerId)
    .eq('is_active', true)
    .order('created_at')

  if (error) throw error
  return data ?? []
}

export interface CreateIncomeInput {
  owner_user_id: string
  name: string
  amount: number
  allowed_categories?: string[] | null
}

export async function createIncomeSource(input: CreateIncomeInput): Promise<BudgetIncomeSource> {
  const { data, error } = await supabase
    .from('budget_income_sources')
    .insert({
      owner_user_id: input.owner_user_id,
      name: input.name,
      amount: input.amount,
      frequency: 'monthly',
      allowed_categories: input.allowed_categories ?? null,
      is_active: true,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateIncomeSource(
  id: string,
  updates: Partial<Pick<BudgetIncomeSource, 'name' | 'amount' | 'allowed_categories' | 'is_active'>>
): Promise<BudgetIncomeSource> {
  const { data, error } = await supabase
    .from('budget_income_sources')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function archiveIncomeSource(id: string): Promise<void> {
  const { error } = await supabase
    .from('budget_income_sources')
    .update({ is_active: false })
    .eq('id', id)

  if (error) throw error
}

// =============================================================================
// EXPENSES
// =============================================================================

export async function getExpenses(ownerId: string): Promise<BudgetExpense[]> {
  const { data, error } = await supabase
    .from('budget_expenses')
    .select('*')
    .eq('owner_user_id', ownerId)
    .eq('is_active', true)
    .order('created_at')

  if (error) throw error
  return data ?? []
}

export async function getExpensesByFrequency(
  ownerId: string,
  frequency: ExpenseFrequency
): Promise<BudgetExpense[]> {
  const { data, error } = await supabase
    .from('budget_expenses')
    .select('*')
    .eq('owner_user_id', ownerId)
    .eq('frequency', frequency)
    .eq('is_active', true)
    .order('created_at')

  if (error) throw error
  return data ?? []
}

export interface CreateExpenseInput {
  owner_user_id: string
  name: string
  amount: number
  frequency: ExpenseFrequency
  category?: string | null
  due_date?: string | null
}

export async function createExpense(input: CreateExpenseInput): Promise<BudgetExpense> {
  const { data, error } = await supabase
    .from('budget_expenses')
    .insert({
      owner_user_id: input.owner_user_id,
      name: input.name,
      amount: input.amount,
      frequency: input.frequency,
      category: input.category || null,
      due_date: input.due_date || null,
      is_paid: false,
      is_active: true,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateExpense(
  id: string,
  updates: Partial<Pick<BudgetExpense, 'name' | 'amount' | 'category' | 'due_date' | 'is_paid' | 'is_active'>>
): Promise<BudgetExpense> {
  const { data, error } = await supabase
    .from('budget_expenses')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function archiveExpense(id: string): Promise<void> {
  const { error } = await supabase
    .from('budget_expenses')
    .update({ is_active: false })
    .eq('id', id)

  if (error) throw error
}

export async function markExpensePaid(id: string, isPaid: boolean): Promise<BudgetExpense> {
  return updateExpense(id, { is_paid: isPaid })
}

// =============================================================================
// ACTUAL EXPENSES (Real transactions)
// =============================================================================

export async function getActualExpenses(ownerId: string): Promise<BudgetActualExpense[]> {
  const { data, error } = await supabase
    .from('budget_actual_expenses')
    .select('*')
    .eq('owner_user_id', ownerId)
    .order('expense_date', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function getActualExpensesForMonth(
  ownerId: string,
  year: number,
  month: number
): Promise<BudgetActualExpense[]> {
  // Month is 1-indexed (1 = January)
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(year, month, 0).toISOString().split('T')[0] // Last day of month

  const { data, error } = await supabase
    .from('budget_actual_expenses')
    .select('*')
    .eq('owner_user_id', ownerId)
    .gte('expense_date', startDate)
    .lte('expense_date', endDate)
    .order('expense_date', { ascending: false })

  if (error) throw error
  return data ?? []
}

export interface CreateActualExpenseInput {
  owner_user_id: string
  name: string
  amount: number
  category?: string | null
  expense_date?: string
  planned_expense_id?: string | null
  notes?: string | null
}

export async function createActualExpense(input: CreateActualExpenseInput): Promise<BudgetActualExpense> {
  const { data, error } = await supabase
    .from('budget_actual_expenses')
    .insert({
      owner_user_id: input.owner_user_id,
      name: input.name,
      amount: input.amount,
      category: input.category || null,
      expense_date: input.expense_date || new Date().toISOString().split('T')[0],
      planned_expense_id: input.planned_expense_id || null,
      notes: input.notes || null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateActualExpense(
  id: string,
  updates: Partial<Pick<BudgetActualExpense, 'name' | 'amount' | 'category' | 'expense_date' | 'notes'>>
): Promise<BudgetActualExpense> {
  const { data, error } = await supabase
    .from('budget_actual_expenses')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteActualExpense(id: string): Promise<void> {
  const { error } = await supabase
    .from('budget_actual_expenses')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Log a planned expense as an actual expense (converts planned to actual)
export async function logPlannedExpense(
  plannedExpense: BudgetExpense,
  actualAmount?: number,
  expenseDate?: string,
  notes?: string
): Promise<BudgetActualExpense> {
  return createActualExpense({
    owner_user_id: plannedExpense.owner_user_id,
    name: plannedExpense.name,
    amount: actualAmount ?? plannedExpense.amount,
    category: plannedExpense.category,
    expense_date: expenseDate,
    planned_expense_id: plannedExpense.id,
    notes,
  })
}

// =============================================================================
// BUDGET SUMMARY CALCULATION
// =============================================================================

export interface CategoryBudgetInfo {
  category: string           // Category name
  label: string
  icon: string
  expenseTotal: number         // Total monthly expenses in this category
  restrictedIncome: number     // Sum of income sources restricted to this category
  restrictedSources: string[]  // Names of restricted income sources
  coveredByRestricted: number  // Min of expenseTotal and restrictedIncome
  remainingRestricted: number  // restrictedIncome - coveredByRestricted (unused restricted funds)
  uncoveredExpenses: number    // expenseTotal - coveredByRestricted (needs general fund)
}

export interface BudgetSummary {
  totalMonthlyIncome: number
  totalMonthlyExpenses: number        // Planned monthly expenses
  totalActualExpenses: number          // Actual expenses this month
  remaining: number                    // Income - Actual spent this month
  plannedRemaining: number             // Income - Planned expenses (for comparison)
  unpaidOneTimeExpenses: number
  // Category breakdown fields (based on planned expenses)
  generalFundIncome: number            // Income with no restrictions
  generalFundSources: string[]         // Names of unrestricted income sources
  generalFundUsed: number              // Actual expenses not covered by restricted income
  generalFundRemaining: number         // generalFundIncome - generalFundUsed (actual)
  categoryBreakdown: CategoryBudgetInfo[]
  warnings: string[]                   // e.g., "Food expenses exceed SNAP allowance"
  // Actual expense breakdown by category
  actualByCategory: Record<string, number>
}

export async function calculateBudgetSummary(ownerId: string): Promise<BudgetSummary> {
  // Get current month for actual expenses
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1 // 1-indexed

  const [incomeSources, expenses, actualExpenses, categories] = await Promise.all([
    getIncomeSources(ownerId),
    getExpenses(ownerId),
    getActualExpensesForMonth(ownerId, currentYear, currentMonth),
    getBudgetExpenseCategories(),
  ])

  const totalMonthlyIncome = incomeSources.reduce((sum, inc) => sum + Number(inc.amount), 0)

  const monthlyExpenses = expenses.filter(e => e.frequency === 'monthly')
  const totalMonthlyExpenses = monthlyExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0)

  // Calculate total actual expenses for this month
  const totalActualExpenses = actualExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0)

  // Calculate actual expenses by category (dynamic)
  const actualByCategory: Record<string, number> = {}
  for (const cat of categories) {
    actualByCategory[cat.name] = 0
  }
  for (const actual of actualExpenses) {
    if (actual.category) {
      actualByCategory[actual.category] = (actualByCategory[actual.category] || 0) + Number(actual.amount)
    }
  }

  const unpaidOneTimeExpenses = expenses
    .filter(e => e.frequency === 'one_time' && !e.is_paid)
    .reduce((sum, exp) => sum + Number(exp.amount), 0)

  // Calculate category breakdown (based on ACTUAL expenses now)
  const categoryBreakdown: CategoryBudgetInfo[] = []
  const warnings: string[] = []

  // General fund calculation
  const generalFundSources = incomeSources.filter(inc => !inc.allowed_categories || inc.allowed_categories.length === 0)
  const generalFundIncome = generalFundSources.reduce((sum, inc) => sum + Number(inc.amount), 0)
  let generalFundUsed = 0

  for (const cat of categories) {
    const categoryName = cat.name
    // Use ACTUAL expenses for this category for remaining calculation
    const actualTotal = actualByCategory[categoryName] || 0

    // Find income sources restricted to this category
    const restrictedSources = incomeSources.filter(inc =>
      inc.allowed_categories && inc.allowed_categories.includes(categoryName)
    )
    const restrictedIncome = restrictedSources.reduce((sum, inc) => sum + Number(inc.amount), 0)

    // Skip categories with no actual expenses AND no restricted income
    if (actualTotal === 0 && restrictedIncome === 0) continue

    // Calculate coverage based on actual spending
    const coveredByRestricted = Math.min(actualTotal, restrictedIncome)
    const remainingRestricted = restrictedIncome - coveredByRestricted
    const uncoveredExpenses = actualTotal - coveredByRestricted

    // Add to general fund usage
    generalFundUsed += uncoveredExpenses

    // Generate warning if actual spending exceeds restricted income
    if (restrictedIncome > 0 && actualTotal > restrictedIncome) {
      const sourceNames = restrictedSources.map(s => s.name).join(', ')
      warnings.push(`${categoryName} spending ($${actualTotal.toFixed(2)}) exceeds ${sourceNames} allowance ($${restrictedIncome.toFixed(2)})`)
    }

    categoryBreakdown.push({
      category: categoryName,
      label: categoryName,
      icon: cat.icon,
      expenseTotal: actualTotal, // Now using actual expenses
      restrictedIncome,
      restrictedSources: restrictedSources.map(s => s.name),
      coveredByRestricted,
      remainingRestricted,
      uncoveredExpenses,
    })
  }

  // Also track actual expenses with no category
  const uncategorizedActual = actualExpenses
    .filter(exp => !exp.category)
    .reduce((sum, exp) => sum + Number(exp.amount), 0)
  generalFundUsed += uncategorizedActual

  // Warning if general fund is insufficient
  const generalFundRemaining = generalFundIncome - generalFundUsed
  if (generalFundRemaining < 0) {
    warnings.push(`General fund deficit: $${Math.abs(generalFundRemaining).toFixed(2)} short`)
  }

  return {
    totalMonthlyIncome,
    totalMonthlyExpenses,
    totalActualExpenses,
    remaining: totalMonthlyIncome - totalActualExpenses, // Based on actual spending
    plannedRemaining: totalMonthlyIncome - totalMonthlyExpenses, // For comparison
    unpaidOneTimeExpenses,
    generalFundIncome,
    generalFundSources: generalFundSources.map(s => s.name),
    generalFundUsed,
    generalFundRemaining,
    categoryBreakdown,
    warnings,
    actualByCategory,
  }
}

