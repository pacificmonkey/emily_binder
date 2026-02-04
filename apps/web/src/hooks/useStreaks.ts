import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getStreaks, useShieldToken, createStreak } from '@/services/streaks'
import type { CreateStreakInput } from '@/types/database'
import { storeKeys } from './useStore'

// Query keys
export const streakKeys = {
  all: ['streaks'] as const,
  list: ['streaks', 'list'] as const,
}

// Hook for all streaks
export function useStreaks() {
  return useQuery({
    queryKey: streakKeys.list,
    queryFn: getStreaks,
  })
}

// Mutation: Use shield token
export function useUseShieldToken() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (streakDefinitionId: string) => useShieldToken(streakDefinitionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: streakKeys.all })
      queryClient.invalidateQueries({ queryKey: storeKeys.inventory })
    },
  })
}

// Admin mutation: Create streak
export function useCreateStreak() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateStreakInput) => createStreak(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: streakKeys.all })
    },
  })
}
