import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getEvents,
  getTodaysEvents,
  getEvent,
  getUpcomingEvents,
  getEventsForMonth,
  createEvent,
  updateEvent,
  deleteEvent,
  cancelEvent,
  completeEvent,
} from '@/services/events'
import type { CreateEventInput, UpdateEventInput } from '@/types/database'

// Query keys
export const eventKeys = {
  all: ['events'] as const,
  today: ['events', 'today'] as const,
  upcoming: ['events', 'upcoming'] as const,
  list: (start?: string, end?: string) => [...eventKeys.all, 'list', { start, end }] as const,
  month: (year: number, month: number) => [...eventKeys.all, 'month', year, month] as const,
  detail: (id: string) => [...eventKeys.all, 'detail', id] as const,
}

// Hook for today's events
export function useTodaysEvents() {
  return useQuery({
    queryKey: eventKeys.today,
    queryFn: getTodaysEvents,
  })
}

// Hook for events in a date range
export function useEvents(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: eventKeys.list(startDate, endDate),
    queryFn: () => getEvents(startDate, endDate),
  })
}

// Hook for events in a month
export function useEventsForMonth(year: number, month: number) {
  return useQuery({
    queryKey: eventKeys.month(year, month),
    queryFn: () => getEventsForMonth(year, month),
  })
}

// Hook for upcoming events
export function useUpcomingEvents(limit = 10) {
  return useQuery({
    queryKey: eventKeys.upcoming,
    queryFn: () => getUpcomingEvents(limit),
  })
}

// Hook for a single event
export function useEvent(eventId: string) {
  return useQuery({
    queryKey: eventKeys.detail(eventId),
    queryFn: () => getEvent(eventId),
    enabled: !!eventId,
  })
}

// Mutation: Create event
export function useCreateEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateEventInput) => createEvent(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.all })
    },
  })
}

// Mutation: Update event
export function useUpdateEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ eventId, input }: { eventId: string; input: UpdateEventInput }) =>
      updateEvent(eventId, input),
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.all })
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) })
    },
  })
}

// Mutation: Delete event
export function useDeleteEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (eventId: string) => deleteEvent(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.all })
    },
  })
}

// Mutation: Cancel event
export function useCancelEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (eventId: string) => cancelEvent(eventId),
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.all })
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) })
    },
  })
}

// Mutation: Complete event
export function useCompleteEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (eventId: string) => completeEvent(eventId),
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.all })
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) })
    },
  })
}
