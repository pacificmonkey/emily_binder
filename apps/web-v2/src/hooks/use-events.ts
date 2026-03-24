import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as eventsService from '@/services/events'
import { toast } from '@/components/ui/toaster'

export function useEvents(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['events', startDate, endDate],
    queryFn: () => eventsService.getEvents(startDate, endDate),
    staleTime: 5 * 60 * 1000,
  })
}

export function useTodaysEvents() {
  return useQuery({
    queryKey: ['events', 'today'],
    queryFn: () => eventsService.getTodaysEvents(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: any) => eventsService.createEvent(input),
    onSuccess: () => {
      toast({ title: 'Event added.', variant: 'success' })
    },
    onError: () => {
      toast({ title: "Couldn't create that event. Try again?", variant: 'error' })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

export function useUpdateEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ eventId, input }: { eventId: string; input: any }) =>
      eventsService.updateEvent(eventId, input),
    onSuccess: () => {
      toast({ title: 'Event updated.', variant: 'success' })
    },
    onError: () => {
      toast({ title: "Couldn't update that event. Try again?", variant: 'error' })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

export function useDeleteEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (eventId: string) => eventsService.deleteEvent(eventId),
    onSuccess: () => {
      toast({ title: 'Event deleted.', variant: 'success' })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}
