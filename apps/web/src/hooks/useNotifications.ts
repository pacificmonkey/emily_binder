import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getNotifications,
  getNotificationCount,
  dismissNotification,
  acknowledgeNotification,
  snoozeNotification,
  createNotification,
  dismissAllNotifications,
} from '@/services/notifications'
import type { NotificationType } from '@/types/database'

// Query keys
export const notificationKeys = {
  all: ['notifications'] as const,
  list: () => [...notificationKeys.all, 'list'] as const,
  count: () => [...notificationKeys.all, 'count'] as const,
}

// Get notifications list
export function useNotifications(limit = 50, includeDismissed = false) {
  return useQuery({
    queryKey: [...notificationKeys.list(), { limit, includeDismissed }],
    queryFn: () => getNotifications(limit, includeDismissed),
    refetchInterval: 60000, // Refetch every minute
  })
}

// Get unread notification count
export function useNotificationCount() {
  return useQuery({
    queryKey: notificationKeys.count(),
    queryFn: getNotificationCount,
    refetchInterval: 30000, // Refetch every 30 seconds
  })
}

// Dismiss a notification
export function useDismissNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: dismissNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    },
  })
}

// Acknowledge a notification
export function useAcknowledgeNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: acknowledgeNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    },
  })
}

// Snooze a notification
export function useSnoozeNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      notificationId,
      minutes,
    }: {
      notificationId: string
      minutes?: number
    }) => snoozeNotification(notificationId, minutes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    },
  })
}

// Create a notification
export function useCreateNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: {
      title: string
      body?: string | null
      type?: NotificationType
      scheduled_for?: string | null
      link_type?: string | null
      link_id?: string | null
    }) => createNotification(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    },
  })
}

// Dismiss all notifications
export function useDismissAllNotifications() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: dismissAllNotifications,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    },
  })
}
