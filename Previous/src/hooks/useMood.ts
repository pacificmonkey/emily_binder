/**
 * Mood hooks using React Query
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import {
  getMoodFeelings,
  getMoodCheckinStatus,
  createMoodLog,
  getMoodStats,
  getMoodLogsForDateRange,
  groupFeelingsByQuadrant,
  type CreateMoodLogInput,
} from '@/services/mood'
import { getCanonicalToday, formatDate } from '@/lib/timezone'

// Query keys
export const moodKeys = {
  all: ['mood'] as const,
  feelings: () => [...moodKeys.all, 'feelings'] as const,
  checkinStatus: (userId: string) => [...moodKeys.all, 'checkinStatus', userId] as const,
  stats: (userId: string) => [...moodKeys.all, 'stats', userId] as const,
  history: (userId: string, days: number) => [...moodKeys.all, 'history', userId, days] as const,
}

/**
 * Fetch all mood feelings (vocabulary)
 */
export function useMoodFeelings() {
  return useQuery({
    queryKey: moodKeys.feelings(),
    queryFn: getMoodFeelings,
    staleTime: 1000 * 60 * 60, // 1 hour (rarely changes)
  })
}

/**
 * Get mood feelings grouped by quadrant
 */
export function useMoodFeelingsByQuadrant() {
  const { data: feelings, ...rest } = useMoodFeelings()

  return {
    ...rest,
    data: feelings ? groupFeelingsByQuadrant(feelings) : undefined,
  }
}

/**
 * Fetch mood check-in status (can check in, cooldown, etc.)
 */
export function useMoodCheckinStatus() {
  const { user } = useAuth()

  return useQuery({
    queryKey: moodKeys.checkinStatus(user?.id ?? ''),
    queryFn: () => getMoodCheckinStatus(user!.id),
    enabled: !!user,
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Refetch every minute to update cooldown
  })
}

/**
 * Create a mood check-in
 */
export function useCreateMoodLog() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (input: Omit<CreateMoodLogInput, 'user_id'>) =>
      createMoodLog({ ...input, user_id: user!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: moodKeys.all })
    },
  })
}

/**
 * Fetch mood stats (for Joey's view)
 */
export function useMoodStats(userId: string, days: number = 30) {
  return useQuery({
    queryKey: [...moodKeys.stats(userId), days],
    queryFn: () => getMoodStats(userId, days),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Fetch recent mood logs for user (last N days)
 */
export function useRecentMoodLogs(userId: string, days: number = 7) {
  return useQuery({
    queryKey: moodKeys.history(userId, days),
    queryFn: async () => {
      const today = getCanonicalToday()
      const startDate = new Date(today)
      startDate.setDate(startDate.getDate() - days + 1)
      const startDateStr = formatDate(startDate, 'yyyy-MM-dd')
      const todayStr = formatDate(today, 'yyyy-MM-dd')
      return getMoodLogsForDateRange(userId, startDateStr, todayStr)
    },
    enabled: !!userId,
    staleTime: 1000 * 60, // 1 minute
  })
}
