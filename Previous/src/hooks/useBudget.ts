/**
 * Budget hooks using React Query
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import {
  getIncomeSources,
  createIncomeSource,
  updateIncomeSource,
  archiveIncomeSource,
  getExpenses,
  getExpensesByFrequency,
  createExpense,
  updateExpense,
  archiveExpense,
  markExpensePaid,
  getActualExpenses,
  getActualExpensesForMonth,
  createActualExpense,
  updateActualExpense,
  deleteActualExpense,
  logPlannedExpense,
  calculateBudgetSummary,
  getBudgetExpenseCategories,
  getAllBudgetExpenseCategories,
  createBudgetExpenseCategory,
  updateBudgetExpenseCategory,
  deleteBudgetExpenseCategory,
} from '@/services/budget'
import type { BudgetIncomeSource, BudgetExpense, BudgetActualExpense, BudgetExpenseCategory, ExpenseFrequency } from '@/types/database'
import type { CreateIncomeInput, CreateExpenseInput, CreateActualExpenseInput, CreateBudgetExpenseCategoryInput } from '@/services/budget'

// Query keys
export const budgetKeys = {
  all: ['budget'] as const,
  categories: () => [...budgetKeys.all, 'categories'] as const,
  categoriesAll: () => [...budgetKeys.all, 'categories', 'all'] as const,
  income: (userId: string) => [...budgetKeys.all, 'income', userId] as const,
  expenses: (userId: string) => [...budgetKeys.all, 'expenses', userId] as const,
  expensesByFrequency: (userId: string, frequency: ExpenseFrequency) =>
    [...budgetKeys.all, 'expenses', userId, frequency] as const,
  actualExpenses: (userId: string) => [...budgetKeys.all, 'actual', userId] as const,
  actualExpensesForMonth: (userId: string, year: number, month: number) =>
    [...budgetKeys.all, 'actual', userId, year, month] as const,
  summary: (userId: string) => [...budgetKeys.all, 'summary', userId] as const,
}

// =============================================================================
// INCOME SOURCES
// =============================================================================

export function useIncomeSources() {
  const { user } = useAuth()

  return useQuery({
    queryKey: budgetKeys.income(user?.id ?? ''),
    queryFn: () => getIncomeSources(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60, // 1 minute
  })
}

export function useCreateIncome() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateIncomeInput) => createIncomeSource(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.all })
    },
  })
}

export function useUpdateIncome() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string
      updates: Partial<Pick<BudgetIncomeSource, 'name' | 'amount' | 'allowed_categories' | 'is_active'>>
    }) => updateIncomeSource(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.all })
    },
  })
}

export function useArchiveIncome() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => archiveIncomeSource(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.all })
    },
  })
}

// =============================================================================
// EXPENSES
// =============================================================================

export function useExpenses() {
  const { user } = useAuth()

  return useQuery({
    queryKey: budgetKeys.expenses(user?.id ?? ''),
    queryFn: () => getExpenses(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60,
  })
}

export function useExpensesByFrequency(frequency: ExpenseFrequency) {
  const { user } = useAuth()

  return useQuery({
    queryKey: budgetKeys.expensesByFrequency(user?.id ?? '', frequency),
    queryFn: () => getExpensesByFrequency(user!.id, frequency),
    enabled: !!user,
    staleTime: 1000 * 60,
  })
}

export function useMonthlyExpenses() {
  return useExpensesByFrequency('monthly')
}

export function useOneTimeExpenses() {
  return useExpensesByFrequency('one_time')
}

export function useCreateExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateExpenseInput) => createExpense(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.all })
    },
  })
}

export function useUpdateExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string
      updates: Partial<Pick<BudgetExpense, 'name' | 'amount' | 'category' | 'due_date' | 'is_paid' | 'is_active'>>
    }) => updateExpense(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.all })
    },
  })
}

export function useArchiveExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => archiveExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.all })
    },
  })
}

export function useMarkExpensePaid() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, isPaid }: { id: string; isPaid: boolean }) => markExpensePaid(id, isPaid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.all })
    },
  })
}

// =============================================================================
// ACTUAL EXPENSES
// =============================================================================

export function useActualExpenses() {
  const { user } = useAuth()

  return useQuery({
    queryKey: budgetKeys.actualExpenses(user?.id ?? ''),
    queryFn: () => getActualExpenses(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60,
  })
}

export function useActualExpensesForMonth(year: number, month: number) {
  const { user } = useAuth()

  return useQuery({
    queryKey: budgetKeys.actualExpensesForMonth(user?.id ?? '', year, month),
    queryFn: () => getActualExpensesForMonth(user!.id, year, month),
    enabled: !!user,
    staleTime: 1000 * 60,
  })
}

export function useCurrentMonthActualExpenses() {
  const now = new Date()
  return useActualExpensesForMonth(now.getFullYear(), now.getMonth() + 1)
}

export function useCreateActualExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateActualExpenseInput) => createActualExpense(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.all })
    },
  })
}

export function useUpdateActualExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string
      updates: Partial<Pick<BudgetActualExpense, 'name' | 'amount' | 'category' | 'expense_date' | 'notes'>>
    }) => updateActualExpense(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.all })
    },
  })
}

export function useDeleteActualExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteActualExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.all })
    },
  })
}

export function useLogPlannedExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      plannedExpense,
      actualAmount,
      expenseDate,
      notes,
    }: {
      plannedExpense: BudgetExpense
      actualAmount?: number
      expenseDate?: string
      notes?: string
    }) => logPlannedExpense(plannedExpense, actualAmount, expenseDate, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.all })
    },
  })
}

// =============================================================================
// BUDGET SUMMARY
// =============================================================================

export function useBudgetSummary() {
  const { user } = useAuth()

  return useQuery({
    queryKey: budgetKeys.summary(user?.id ?? ''),
    queryFn: () => calculateBudgetSummary(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60,
  })
}

// =============================================================================
// BUDGET EXPENSE CATEGORIES
// =============================================================================

export function useBudgetExpenseCategories() {
  return useQuery({
    queryKey: budgetKeys.categories(),
    queryFn: () => getBudgetExpenseCategories(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useAllBudgetExpenseCategories() {
  // For admin - includes inactive categories
  return useQuery({
    queryKey: budgetKeys.categoriesAll(),
    queryFn: () => getAllBudgetExpenseCategories(),
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateBudgetExpenseCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateBudgetExpenseCategoryInput) => createBudgetExpenseCategory(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.all })
    },
  })
}

export function useUpdateBudgetExpenseCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string
      updates: Partial<Pick<BudgetExpenseCategory, 'name' | 'icon' | 'vp_value' | 'sort_order' | 'is_active'>>
    }) => updateBudgetExpenseCategory(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.all })
    },
  })
}

export function useDeleteBudgetExpenseCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteBudgetExpenseCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.all })
    },
  })
}
