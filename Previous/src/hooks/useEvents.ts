/**
 * Events hooks using React Query
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import {
  getEventsForDateRange,
  getEventsForDate,
  getTodayEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  completeEvent,
  uncompleteEvent,
} from '@/services/events'
import type { CreateEventInput } from '@/services/events'
import { formatDate } from '@/lib/timezone'
import { awardVp, deductVp, getDailyWinStatus } from '@/services/economy'
import { awardDailyWinCoins } from '@/services/bonus'

// Query keys
export const eventKeys = {
  all: ['events'] as const,
  today: (userId: string) => [...eventKeys.all, 'today', userId] as const,
  forDate: (userId: string, dateStr: string) => [...eventKeys.all, 'forDate', userId, dateStr] as const,
  dateRange: (userId: string, start: string, end: string) =>
    [...eventKeys.all, 'range', userId, start, end] as const,
}

/**
 * Fetch today's events
 */
export function useTodayEvents() {
  const { user } = useAuth()

  return useQuery({
    queryKey: eventKeys.today(user?.id ?? ''),
    queryFn: () => getTodayEvents(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60, // 1 minute
  })
}

/**
 * Fetch events for a specific date (for date navigation)
 */
export function useEventsForDate(dateStr: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: eventKeys.forDate(user?.id ?? '', dateStr),
    queryFn: () => getEventsForDate(user!.id, dateStr),
    enabled: !!user && !!dateStr,
    staleTime: 1000 * 60,
  })
}

/**
 * Fetch events for a date range
 */
export function useEventsForDateRange(startDate: Date, endDate: Date) {
  const { user } = useAuth()
  const startStr = formatDate(startDate, 'yyyy-MM-dd')
  const endStr = formatDate(endDate, 'yyyy-MM-dd')

  return useQuery({
    queryKey: eventKeys.dateRange(user?.id ?? '', startStr, endStr),
    queryFn: () => getEventsForDateRange(user!.id, startStr, endStr),
    enabled: !!user,
    staleTime: 1000 * 60,
  })
}

/**
 * Create a new event
 */
export function useCreateEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateEventInput) => createEvent(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.all })
    },
  })
}

/**
 * Update an event
 */
export function useUpdateEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof updateEvent>[1] }) =>
      updateEvent(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.all })
    },
  })
}

/**
 * Delete an event
 */
export function useDeleteEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.all })
    },
  })
}

/**
 * Complete an event (awards VP from category)
 */
export function useCompleteEvent() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ eventId, vpValue }: { eventId: string; vpValue: number }) => {
      const completion = await completeEvent(eventId, user!.id, vpValue)
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
      queryClient.invalidateQueries({ queryKey: eventKeys.all })
      queryClient.invalidateQueries({ queryKey: ['economy'] })
    },
  })
}

/**
 * Uncomplete an event (deducts VP)
 */
export function useUncompleteEvent() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ eventId, vpValue }: { eventId: string; vpValue: number }) => {
      await uncompleteEvent(eventId)
      // Deduct the VP that was awarded
      if (user && vpValue > 0) {
        await deductVp(user.id, vpValue)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.all })
      queryClient.invalidateQueries({ queryKey: ['economy'] })
    },
  })
}
