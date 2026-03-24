import { supabase } from '@/lib/supabase'
import type { NotificationType } from '@/types/database'

export interface NotificationListItem {
  notification_id: string
  type: NotificationType
  title: string
  body: string | null
  channel: string
  status: string
  scheduled_for: string | null
  delivered_at: string | null
  acknowledged_at: string | null
  snooze_until: string | null
  link_type: string | null
  link_id: string | null
  payload: Record<string, unknown> | null
  created_at: string
}

// Get notifications for current user
export async function getNotifications(
  limit = 50,
  includeDismissed = false
): Promise<NotificationListItem[]> {
  const { data, error } = await supabase.rpc('get_notifications', {
    p_limit: limit,
    p_include_dismissed: includeDismissed,
  })

  if (error) {
    throw error
  }

  return (data as NotificationListItem[]) || []
}

// Get unread notification count
export async function getNotificationCount(): Promise<number> {
  const { data, error } = await supabase.rpc('get_notification_count')

  if (error) {
    throw error
  }

  return (data as number) || 0
}

// Dismiss a notification
export async function dismissNotification(notificationId: string): Promise<void> {
  const { data, error } = await supabase.rpc('dismiss_notification', {
    p_notification_id: notificationId,
  })

  if (error) {
    throw error
  }

  const result = data as { success: boolean; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to dismiss notification')
  }
}

// Acknowledge a notification
export async function acknowledgeNotification(notificationId: string): Promise<void> {
  const { data, error } = await supabase.rpc('acknowledge_notification', {
    p_notification_id: notificationId,
  })

  if (error) {
    throw error
  }

  const result = data as { success: boolean; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to acknowledge notification')
  }
}

// Snooze a notification
export async function snoozeNotification(
  notificationId: string,
  minutes = 30
): Promise<string> {
  const { data, error } = await supabase.rpc('snooze_notification', {
    p_notification_id: notificationId,
    p_snooze_minutes: minutes,
  })

  if (error) {
    throw error
  }

  const result = data as { success: boolean; snooze_until: string; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to snooze notification')
  }

  return result.snooze_until
}

// Create a custom notification/reminder
export async function createNotification(input: {
  title: string
  body?: string | null
  type?: NotificationType
  scheduled_for?: string | null
  link_type?: string | null
  link_id?: string | null
}): Promise<string> {
  const { data, error } = await supabase.rpc('create_notification', {
    p_title: input.title,
    p_body: input.body || null,
    p_type: input.type || 'reminder',
    p_scheduled_for: input.scheduled_for || null,
    p_link_type: input.link_type || null,
    p_link_id: input.link_id || null,
  })

  if (error) {
    throw error
  }

  const result = data as { success: boolean; notification_id: string; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to create notification')
  }

  return result.notification_id
}

// Dismiss all notifications
export async function dismissAllNotifications(): Promise<number> {
  const { data, error } = await supabase.rpc('dismiss_all_notifications')

  if (error) {
    throw error
  }

  const result = data as { success: boolean; dismissed_count: number; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to dismiss all notifications')
  }

  return result.dismissed_count
}

// Admin: Send notification to impersonated patient
export async function adminCreateNotification(input: {
  title: string
  body?: string | null
  type?: string
}): Promise<string> {
  const { data, error } = await supabase.rpc('admin_create_notification', {
    p_title: input.title,
    p_body: input.body || null,
    p_type: input.type || 'info',
  })

  if (error) {
    throw error
  }

  const result = data as { success: boolean; notification_id?: string; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to send notification')
  }

  return result.notification_id!
}

// Helper to create event reminder
export async function createEventReminder(
  eventId: string,
  eventTitle: string,
  reminderTime: string
): Promise<string> {
  return createNotification({
    title: `Reminder: ${eventTitle}`,
    body: 'Your event is coming up soon',
    type: 'reminder',
    scheduled_for: reminderTime,
    link_type: 'event',
    link_id: eventId,
  })
}
