import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getBudgetAccounts,
  getBudgetCategories,
  createBudgetAccount,
  createBudgetCategory,
  createBudgetTransaction,
  getBudgetTransactions,
  getBudgetSummary,
  deleteBudgetTransaction,
} from '@/services/budget'
import type {
  CreateBudgetAccountInput,
  CreateBudgetCategoryInput,
  CreateBudgetTransactionInput,
} from '@/types/database'

export const budgetKeys = {
  all: ['budget'] as const,
  accounts: ['budget', 'accounts'] as const,
  categories: ['budget', 'categories'] as const,
  transactions: ['budget', 'transactions'] as const,
  summary: ['budget', 'summary'] as const,
}

export function useBudgetAccounts() {
  return useQuery({
    queryKey: budgetKeys.accounts,
    queryFn: getBudgetAccounts,
  })
}

export function useBudgetCategories() {
  return useQuery({
    queryKey: budgetKeys.categories,
    queryFn: getBudgetCategories,
  })
}

export function useBudgetTransactions() {
  return useQuery({
    queryKey: budgetKeys.transactions,
    queryFn: () => getBudgetTransactions(),
  })
}

export function useBudgetSummary() {
  return useQuery({
    queryKey: budgetKeys.summary,
    queryFn: getBudgetSummary,
  })
}

export function useCreateBudgetAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateBudgetAccountInput) => createBudgetAccount(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.accounts })
    },
  })
}

export function useCreateBudgetCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateBudgetCategoryInput) => createBudgetCategory(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.categories })
    },
  })
}

export function useCreateBudgetTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateBudgetTransactionInput) => createBudgetTransaction(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.all })
    },
  })
}

export function useDeleteBudgetTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (transactionId: string) => deleteBudgetTransaction(transactionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.all })
    },
  })
}
