/**
 * Goals hooks using React Query
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import {
  getUserGoals,
  getGoalsByType,
  getGoal,
  createGoal,
  updateGoal,
  deleteGoal,
  addGoalItem,
  removeGoalItem,
  reorderGoalItems,
  getActiveGoals,
  getCompletedGoals,
  getGoalProgress,
} from '@/services/goals'
import type { GoalType } from '@/types/database'
import type { CreateGoalInput, CreateGoalItemInput } from '@/services/goals'

// Query keys
export const goalKeys = {
  all: ['goals'] as const,
  user: (userId: string) => [...goalKeys.all, 'user', userId] as const,
  byType: (userId: string, type: GoalType) => [...goalKeys.all, 'byType', userId, type] as const,
  active: (userId: string) => [...goalKeys.all, 'active', userId] as const,
  completed: (userId: string) => [...goalKeys.all, 'completed', userId] as const,
  detail: (goalId: string) => [...goalKeys.all, 'detail', goalId] as const,
  progress: (goalId: string) => [...goalKeys.all, 'progress', goalId] as const,
}

/**
 * Fetch all goals for the current user
 */
export function useUserGoals() {
  const { user } = useAuth()

  return useQuery({
    queryKey: goalKeys.user(user?.id ?? ''),
    queryFn: () => getUserGoals(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60, // 1 minute
  })
}

/**
 * Fetch goals by type (destiny or quest)
 */
export function useGoalsByType(goalType: GoalType) {
  const { user } = useAuth()

  return useQuery({
    queryKey: goalKeys.byType(user?.id ?? '', goalType),
    queryFn: () => getGoalsByType(user!.id, goalType),
    enabled: !!user,
    staleTime: 1000 * 60,
  })
}

/**
 * Fetch destinies (Emily-created goals)
 */
export function useDestinies() {
  return useGoalsByType('destiny')
}

/**
 * Fetch quests (Support-created goals)
 */
export function useQuests() {
  return useGoalsByType('quest')
}

/**
 * Fetch active goals
 */
export function useActiveGoals() {
  const { user } = useAuth()

  return useQuery({
    queryKey: goalKeys.active(user?.id ?? ''),
    queryFn: () => getActiveGoals(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60,
  })
}

/**
 * Fetch completed goals
 */
export function useCompletedGoals() {
  const { user } = useAuth()

  return useQuery({
    queryKey: goalKeys.completed(user?.id ?? ''),
    queryFn: () => getCompletedGoals(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60,
  })
}

/**
 * Fetch a single goal
 */
export function useGoal(goalId: string) {
  return useQuery({
    queryKey: goalKeys.detail(goalId),
    queryFn: () => getGoal(goalId),
    enabled: !!goalId,
    staleTime: 1000 * 60,
  })
}

/**
 * Create a new goal
 */
export function useCreateGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateGoalInput) => createGoal(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.all })
    },
  })
}

/**
 * Update a goal
 */
export function useUpdateGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      goalId,
      updates,
    }: {
      goalId: string
      updates: Parameters<typeof updateGoal>[1]
    }) => updateGoal(goalId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.all })
    },
  })
}

/**
 * Delete a goal
 */
export function useDeleteGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (goalId: string) => deleteGoal(goalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.all })
    },
  })
}

/**
 * Add item to a goal
 */
export function useAddGoalItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateGoalItemInput) => addGoalItem(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: goalKeys.detail(variables.goal_id) })
      queryClient.invalidateQueries({ queryKey: goalKeys.all })
    },
  })
}

/**
 * Remove item from a goal
 */
export function useRemoveGoalItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ itemId }: { goalId: string; itemId: string }) =>
      removeGoalItem(itemId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: goalKeys.detail(variables.goalId) })
      queryClient.invalidateQueries({ queryKey: goalKeys.all })
    },
  })
}

/**
 * Reorder goal items
 */
export function useReorderGoalItems() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ goalId, itemIds }: { goalId: string; itemIds: string[] }) =>
      reorderGoalItems(goalId, itemIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: goalKeys.detail(variables.goalId) })
    },
  })
}

/**
 * Get goal progress (completed/total linked missions)
 */
export function useGoalProgress(goalId: string) {
  return useQuery({
    queryKey: goalKeys.progress(goalId),
    queryFn: () => getGoalProgress(goalId),
    enabled: !!goalId,
    staleTime: 1000 * 60,
  })
}
