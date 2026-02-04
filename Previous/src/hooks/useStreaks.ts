/**
 * Streaks hooks using React Query
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import {
  getUserStreaks,
  getMissionStreak,
  getGraceTokens,
  useGraceToken,
  checkAndResetBrokenStreaks,
} from '@/services/streaks'

// Query keys
export const streakKeys = {
  all: ['streaks'] as const,
  user: (userId: string) => [...streakKeys.all, 'user', userId] as const,
  mission: (userId: string, missionId: string) =>
    [...streakKeys.all, 'mission', userId, missionId] as const,
  graceTokens: (userId: string) => [...streakKeys.all, 'graceTokens', userId] as const,
}

/**
 * Fetch all streaks for the current user
 */
export function useUserStreaks() {
  const { user } = useAuth()

  return useQuery({
    queryKey: streakKeys.user(user?.id ?? ''),
    queryFn: () => getUserStreaks(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60, // 1 minute
  })
}

/**
 * Fetch streak for a specific mission
 */
export function useMissionStreak(missionId: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: streakKeys.mission(user?.id ?? '', missionId),
    queryFn: () => getMissionStreak(user!.id, missionId),
    enabled: !!user && !!missionId,
    staleTime: 1000 * 60,
  })
}

/**
 * Fetch grace tokens for the current user
 */
export function useGraceTokens() {
  const { user } = useAuth()

  return useQuery({
    queryKey: streakKeys.graceTokens(user?.id ?? ''),
    queryFn: () => getGraceTokens(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Use a grace token to save a streak
 */
export function useUseGraceToken() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (missionId: string) => useGraceToken(user!.id, missionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: streakKeys.all })
    },
  })
}

/**
 * Check and reset broken streaks (on app open)
 */
export function useCheckBrokenStreaks() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: () => checkAndResetBrokenStreaks(user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: streakKeys.all })
    },
  })
}

/**
 * Get top streaks for display
 */
export function useTopStreaks(limit: number = 3) {
  const { data: streaks, ...rest } = useUserStreaks()

  const topStreaks = streaks
    ?.filter(s => s.current_streak > 0)
    .slice(0, limit) ?? []

  return { data: topStreaks, ...rest }
}
