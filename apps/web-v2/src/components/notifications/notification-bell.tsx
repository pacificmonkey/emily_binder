'use client'

import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useNotificationCount, useNotifications, useDismissNotification, useAcknowledgeNotification, useSnoozeNotification } from '@/hooks/use-notifications'
import { NotificationItem } from './notification-item'

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const { data: count = 0 } = useNotificationCount()
  const { data: notifications = [] } = useNotifications(5, false)
  const dismissMutation = useDismissNotification()
  const acknowledgeMutation = useAcknowledgeNotification()
  const snoozeMutation = useSnoozeNotification()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  const handleDismiss = (id: string) => {
    dismissMutation.mutate(id)
  }

  const handleAcknowledge = (id: string) => {
    acknowledgeMutation.mutate(id)
  }

  const handleSnooze = (id: string, minutes: number) => {
    snoozeMutation.mutate({ id, minutes })
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'relative inline-flex items-center justify-center w-10 h-10 rounded-soft',
          'hover:bg-surface-sunken transition-colors',
          'focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2'
        )}
        aria-label={`Notifications, ${count} unread`}
      >
        <span className="text-2xl">🔔</span>
        {count > 0 && (
          <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-danger rounded-full">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-surface rounded-soft shadow-raised border border-border z-50 max-h-96 overflow-y-auto">
          {notifications.length > 0 ? (
            <div className="p-3 space-y-2">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.notification_id}
                  notification={notification}
                  onDismiss={handleDismiss}
                  onAcknowledge={handleAcknowledge}
                  onSnooze={handleSnooze}
                  compact
                />
              ))}
              <button
                onClick={() => {
                  navigate('/notifications')
                  setOpen(false)
                }}
                className="w-full text-center text-sm text-accent hover:text-accent-hover font-medium py-2 border-t border-border mt-2"
              >
                View all notifications
              </button>
            </div>
          ) : (
            <div className="p-6 text-center text-content-secondary">
              <p className="text-sm">All caught up! No notifications.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
