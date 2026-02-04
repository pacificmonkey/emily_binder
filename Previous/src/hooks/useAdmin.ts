/**
 * Admin hooks using React Query
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import {
  getPendingProposals,
  getAllProposals,
  reviewProposal,
  getProposalCounts,
  getOpenTodos,
  getAllTodos,
  resolveTodo,
  getEconomyConfigAdmin,
  updateEconomyConfig,
  getAllMoodFeelings,
  createMoodFeeling,
  updateMoodFeeling,
  getMoodHistory,
  getMoodSummary,
  getAllStickers,
  createSticker,
  updateSticker,
  deleteSticker,
  getAllGoals,
  updateGoalAdmin,
  deleteGoalAdmin,
} from '@/services/admin'
import { getCategories } from '@/services/categories'
import type { EconomyConfig, MoodFeeling, StickerCatalog, Goal } from '@/types/database'

// Query keys
export const adminKeys = {
  all: ['admin'] as const,
  proposals: () => [...adminKeys.all, 'proposals'] as const,
  proposalsPending: () => [...adminKeys.proposals(), 'pending'] as const,
  proposalsAll: () => [...adminKeys.proposals(), 'all'] as const,
  proposalCounts: () => [...adminKeys.proposals(), 'counts'] as const,
  todos: () => [...adminKeys.all, 'todos'] as const,
  todosOpen: () => [...adminKeys.todos(), 'open'] as const,
  todosAll: () => [...adminKeys.todos(), 'all'] as const,
  economyConfig: () => [...adminKeys.all, 'economyConfig'] as const,
  moodFeelings: () => [...adminKeys.all, 'moodFeelings'] as const,
  moodHistory: (userId: string) => [...adminKeys.all, 'moodHistory', userId] as const,
  moodSummary: (userId: string) => [...adminKeys.all, 'moodSummary', userId] as const,
  stickers: () => [...adminKeys.all, 'stickers'] as const,
  goals: () => [...adminKeys.all, 'goals'] as const,
  categories: () => [...adminKeys.all, 'categories'] as const,
}

// =============================================================================
// PROPOSALS
// =============================================================================

export function usePendingProposals() {
  return useQuery({
    queryKey: adminKeys.proposalsPending(),
    queryFn: getPendingProposals,
    staleTime: 1000 * 30, // 30 seconds
  })
}

export function useAllProposals(limit?: number) {
  return useQuery({
    queryKey: [...adminKeys.proposalsAll(), limit],
    queryFn: () => getAllProposals(limit),
    staleTime: 1000 * 60,
  })
}

export function useProposalCounts() {
  return useQuery({
    queryKey: adminKeys.proposalCounts(),
    queryFn: getProposalCounts,
    staleTime: 1000 * 30,
  })
}

export function useReviewProposal() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: ({
      proposalId,
      status,
    }: {
      proposalId: string
      status: 'approved' | 'rejected'
    }) => reviewProposal(proposalId, user!.id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.proposals() })
      queryClient.invalidateQueries({ queryKey: ['missions'] })
    },
  })
}

// =============================================================================
// JOEY TODOS
// =============================================================================

export function useOpenTodos() {
  return useQuery({
    queryKey: adminKeys.todosOpen(),
    queryFn: getOpenTodos,
    staleTime: 1000 * 30,
  })
}

export function useAllTodos(limit?: number) {
  return useQuery({
    queryKey: [...adminKeys.todosAll(), limit],
    queryFn: () => getAllTodos(limit),
    staleTime: 1000 * 60,
  })
}

export function useResolveTodo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (todoId: string) => resolveTodo(todoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.todos() })
    },
  })
}

// =============================================================================
// ECONOMY CONFIG
// =============================================================================

export function useEconomyConfigAdmin() {
  return useQuery({
    queryKey: adminKeys.economyConfig(),
    queryFn: getEconomyConfigAdmin,
    staleTime: 1000 * 60 * 5,
  })
}

export function useUpdateEconomyConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (updates: Partial<Omit<EconomyConfig, 'id' | 'created_at' | 'updated_at'>>) =>
      updateEconomyConfig(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.economyConfig() })
      queryClient.invalidateQueries({ queryKey: ['economy'] })
    },
  })
}

// =============================================================================
// MOOD VOCABULARY
// =============================================================================

export function useAllMoodFeelings() {
  return useQuery({
    queryKey: adminKeys.moodFeelings(),
    queryFn: getAllMoodFeelings,
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateMoodFeeling() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: Omit<MoodFeeling, 'id'>) => createMoodFeeling(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.moodFeelings() })
    },
  })
}

export function useUpdateMoodFeeling() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Omit<MoodFeeling, 'id'>> }) =>
      updateMoodFeeling(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.moodFeelings() })
    },
  })
}

// =============================================================================
// MOOD HISTORY
// =============================================================================

export function useMoodHistory(userId: string, limit?: number) {
  return useQuery({
    queryKey: [...adminKeys.moodHistory(userId), limit],
    queryFn: () => getMoodHistory(userId, limit),
    enabled: !!userId,
    staleTime: 1000 * 60,
  })
}

export function useMoodSummary(userId: string, days?: number) {
  return useQuery({
    queryKey: [...adminKeys.moodSummary(userId), days],
    queryFn: () => getMoodSummary(userId, days),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  })
}

// =============================================================================
// STICKER CATALOG
// =============================================================================

export function useAllStickers() {
  return useQuery({
    queryKey: adminKeys.stickers(),
    queryFn: getAllStickers,
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateSticker() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: {
      name: string
      image_url: string
      cost_coins: number
      category?: string | null
      tags?: string[] | null
      sort_order?: number
    }) => createSticker(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.stickers() })
      queryClient.invalidateQueries({ queryKey: ['stickers'] })
    },
  })
}

export function useUpdateSticker() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Omit<StickerCatalog, 'id' | 'created_at'>> }) =>
      updateSticker(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.stickers() })
      queryClient.invalidateQueries({ queryKey: ['stickers'] })
    },
  })
}

export function useDeleteSticker() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteSticker(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.stickers() })
      queryClient.invalidateQueries({ queryKey: ['stickers'] })
    },
  })
}

// =============================================================================
// GOALS MANAGEMENT
// =============================================================================

export function useAllGoalsAdmin() {
  return useQuery({
    queryKey: adminKeys.goals(),
    queryFn: getAllGoals,
    staleTime: 1000 * 60,
  })
}

export function useUpdateGoalAdmin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Pick<Goal, 'title' | 'description_md' | 'is_completed' | 'archived'>> }) =>
      updateGoalAdmin(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.goals() })
      queryClient.invalidateQueries({ queryKey: ['goals'] })
    },
  })
}

export function useDeleteGoalAdmin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteGoalAdmin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.goals() })
      queryClient.invalidateQueries({ queryKey: ['goals'] })
    },
  })
}

// =============================================================================
// CATEGORIES (use hooks from useCategories.ts for CRUD operations)
// =============================================================================

export function useAdminCategories() {
  return useQuery({
    queryKey: adminKeys.categories(),
    queryFn: getCategories,
    staleTime: 1000 * 60 * 5,
  })
}
