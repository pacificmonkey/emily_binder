import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as notificationsService from '@/services/notifications'

export function useNotificationCount() {
  return useQuery({
    queryKey: ['notification-count'],
    queryFn: () => notificationsService.getNotificationCount(),
    staleTime: 30 * 1000,
  })
}

export function useNotifications(limit?: number, includeDismissed?: boolean) {
  return useQuery({
    queryKey: ['notifications', limit, includeDismissed],
    queryFn: () => notificationsService.getNotifications(limit, includeDismissed),
    staleTime: 30 * 1000,
  })
}

export function useDismissNotification() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => notificationsService.dismissNotification(id),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notification-count'] })
    },
  })
}

export function useAcknowledgeNotification() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => notificationsService.acknowledgeNotification(id),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notification-count'] })
    },
  })
}

export function useSnoozeNotification() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: { id: string; minutes?: number }) =>
      notificationsService.snoozeNotification(params.id, params.minutes),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useDismissAllNotifications() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => notificationsService.dismissAllNotifications(),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notification-count'] })
    },
  })
}
