import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as budgetService from '@/services/budget'
import type {
  CreateBudgetAccountInput,
  CreateBudgetTransactionInput,
} from '@/types/database'

/**
 * Query hook for fetching all budget accounts
 */
export function useBudgetAccounts() {
  return useQuery({
    queryKey: ['budget-accounts'],
    queryFn: () => budgetService.getBudgetAccounts(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Query hook for fetching all budget categories
 */
export function useBudgetCategories() {
  return useQuery({
    queryKey: ['budget-categories'],
    queryFn: () => budgetService.getBudgetCategories(),
    staleTime: 30 * 60 * 1000, // 30 minutes
  })
}

/**
 * Query hook for fetching budget transactions with optional filters
 */
export function useBudgetTransactions(
  accountId?: string,
  categoryId?: string,
  startDate?: string,
  endDate?: string
) {
  return useQuery({
    queryKey: ['budget-transactions', accountId, categoryId, startDate, endDate],
    queryFn: () =>
      budgetService.getBudgetTransactions(accountId, categoryId, startDate, endDate),
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

/**
 * Query hook for fetching budget summary for a specific month or current month
 */
export function useBudgetSummary(year?: number, month?: number) {
  return useQuery({
    queryKey: ['budget-summary', year, month],
    queryFn: () => budgetService.getBudgetSummary(year, month),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Query hook for fetching monthly spending summary
 */
export function useMonthlySpending(months = 6) {
  return useQuery({
    queryKey: ['monthly-spending', months],
    queryFn: () => budgetService.getMonthlySpendingSummary(months),
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Mutation hook for creating a budget transaction
 */
export function useCreateTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateBudgetTransactionInput) =>
      budgetService.createBudgetTransaction(input),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-transactions'] })
      queryClient.invalidateQueries({ queryKey: ['budget-summary'] })
      queryClient.invalidateQueries({ queryKey: ['budget-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['monthly-spending'] })
    },
  })
}

/**
 * Mutation hook for deleting a budget transaction
 */
export function useDeleteTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (transactionId: string) =>
      budgetService.deleteBudgetTransaction(transactionId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-transactions'] })
      queryClient.invalidateQueries({ queryKey: ['budget-summary'] })
      queryClient.invalidateQueries({ queryKey: ['budget-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['monthly-spending'] })
    },
  })
}

/**
 * Mutation hook for creating a budget account
 */
export function useCreateAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateBudgetAccountInput) =>
      budgetService.createBudgetAccount(input),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-accounts'] })
    },
  })
}
