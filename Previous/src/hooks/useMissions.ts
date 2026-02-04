/**
 * Missions hooks using React Query
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import {
  getMissions,
  getTodayMissions,
  getThisWeekMissions,
  getMissionsForDate,
  getWeekMissionsForDate,
  getMissionsWithDeadlines,
  completeMission,
  uncompleteMission,
  createMission,
  updateMission,
  archiveMission,
  snoozeMission,
  reorderMissions,
  toggleMissionStep,
} from '@/services/missions'
import type { CreateMissionInput } from '@/services/missions'
import { awardVp, deductVp, getDailyWinStatus } from '@/services/economy'
import { awardDailyWinCoins } from '@/services/bonus'

// Query keys
export const missionKeys = {
  all: ['missions'] as const,
  list: (userId: string) => [...missionKeys.all, 'list', userId] as const,
  today: (userId: string) => [...missionKeys.all, 'today', userId] as const,
  forDate: (userId: string, dateStr: string) => [...missionKeys.all, 'forDate', userId, dateStr] as const,
  weekForDate: (userId: string, dateStr: string) => [...missionKeys.all, 'weekForDate', userId, dateStr] as const,
  thisWeek: (userId: string) => [...missionKeys.all, 'thisWeek', userId] as const,
  deadlines: (userId: string) => [...missionKeys.all, 'deadlines', userId] as const,
}

/**
 * Fetch all non-archived missions for the user
 */
export function useAllMissions() {
  const { user } = useAuth()

  return useQuery({
    queryKey: missionKeys.list(user?.id ?? ''),
    queryFn: () => getMissions(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60, // 1 minute
  })
}

/**
 * Fetch today's missions
 */
export function useTodayMissions() {
  const { user } = useAuth()

  return useQuery({
    queryKey: missionKeys.today(user?.id ?? ''),
    queryFn: () => getTodayMissions(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60, // 1 minute
  })
}

/**
 * Fetch this week's missions (weekly recurring + week-assigned)
 */
export function useThisWeekMissions() {
  const { user } = useAuth()

  return useQuery({
    queryKey: missionKeys.thisWeek(user?.id ?? ''),
    queryFn: () => getThisWeekMissions(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60,
  })
}

/**
 * Fetch missions for a specific date (for date navigation)
 */
export function useMissionsForDate(dateStr: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: missionKeys.forDate(user?.id ?? '', dateStr),
    queryFn: () => getMissionsForDate(user!.id, dateStr),
    enabled: !!user && !!dateStr,
    staleTime: 1000 * 60,
  })
}

/**
 * Fetch weekly missions for a specific date's week
 */
export function useWeekMissionsForDate(dateStr: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: missionKeys.weekForDate(user?.id ?? '', dateStr),
    queryFn: () => getWeekMissionsForDate(user!.id, dateStr),
    enabled: !!user && !!dateStr,
    staleTime: 1000 * 60,
  })
}

/**
 * Fetch missions with upcoming deadlines
 */
export function useDeadlineMissions(daysAhead: number = 7) {
  const { user } = useAuth()

  return useQuery({
    queryKey: [...missionKeys.deadlines(user?.id ?? ''), daysAhead],
    queryFn: () => getMissionsWithDeadlines(user!.id, daysAhead),
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Complete a mission
 */
export function useCompleteMission() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ missionId, vpValue }: { missionId: string; vpValue: number }) => {
      const completion = await completeMission(missionId, user!.id, vpValue)
      // Award VP to user
      await awardVp(user!.id, vpValue)

      // Check if daily win was achieved and award coins (idempotent)
      const dailyWinStatus = await getDailyWinStatus(user!.id)
      if (dailyWinStatus.achieved) {
        await awardDailyWinCoins(user!.id)
      }

      return completion
    },
    onSuccess: () => {
      // Invalidate missions and economy queries
      queryClient.invalidateQueries({ queryKey: missionKeys.all })
      queryClient.invalidateQueries({ queryKey: ['economy'] })
    },
  })
}

/**
 * Uncomplete a mission (undo completion)
 */
export function useUncompleteMission() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({
      missionId,
      completionDate,
      vpValue,
    }: {
      missionId: string
      completionDate: string
      vpValue: number
    }) => {
      await uncompleteMission(missionId, completionDate)
      // Deduct the VP that was awarded
      if (user && vpValue > 0) {
        await deductVp(user.id, vpValue)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: missionKeys.all })
      queryClient.invalidateQueries({ queryKey: ['economy'] })
    },
  })
}

/**
 * Create a new mission
 */
export function useCreateMission() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateMissionInput) => createMission(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: missionKeys.all })
    },
  })
}

/**
 * Update a mission
 */
export function useUpdateMission() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof updateMission>[1] }) =>
      updateMission(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: missionKeys.all })
    },
  })
}

/**
 * Archive a mission
 */
export function useArchiveMission() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => archiveMission(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: missionKeys.all })
    },
  })
}

/**
 * Snooze a mission
 */
export function useSnoozeMission() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, until }: { id: string; until: Date }) => snoozeMission(id, until),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: missionKeys.all })
    },
  })
}

/**
 * Reorder missions (for drag-and-drop)
 */
export function useReorderMissions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (missionIds: string[]) => reorderMissions(missionIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: missionKeys.all })
    },
  })
}

/**
 * Toggle a mission step completion
 */
export function useToggleMissionStep() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      missionId,
      stepId,
      completed,
    }: {
      missionId: string
      stepId: string
      completed: boolean
    }) => toggleMissionStep(missionId, stepId, completed),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: missionKeys.all })
    },
  })
}
