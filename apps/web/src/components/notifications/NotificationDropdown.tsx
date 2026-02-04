import { useState, useRef, useEffect } from 'react'
import {
  useNotifications,
  useNotificationCount,
  useDismissNotification,
  useAcknowledgeNotification,
  useSnoozeNotification,
  useDismissAllNotifications,
} from '@/hooks/useNotifications'
import { NotificationItem } from './NotificationItem'
import styles from './NotificationDropdown.module.css'

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const { data: notifications = [], isLoading } = useNotifications()
  const { data: count = 0 } = useNotificationCount()

  const dismissMutation = useDismissNotification()
  const acknowledgeMutation = useAcknowledgeNotification()
  const snoozeMutation = useSnoozeNotification()
  const dismissAllMutation = useDismissAllNotifications()

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleDismiss = (id: string) => {
    dismissMutation.mutate(id)
  }

  const handleAcknowledge = (id: string) => {
    acknowledgeMutation.mutate(id)
  }

  const handleSnooze = (id: string) => {
    snoozeMutation.mutate({ notificationId: id, minutes: 30 })
  }

  const handleDismissAll = () => {
    dismissAllMutation.mutate()
  }

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        className={styles.bellButton}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={count > 0 ? `${count} notifications` : 'No notifications'}
      >
        🔔
        {count > 0 && (
          <span className={styles.badge}>{count > 99 ? '99+' : count}</span>
        )}
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.header}>
            <h3 className={styles.headerTitle}>Notifications</h3>
            {notifications.length > 0 && (
              <button
                className={styles.clearButton}
                onClick={handleDismissAll}
                disabled={dismissAllMutation.isPending}
              >
                Clear all
              </button>
            )}
          </div>

          <div className={styles.list}>
            {isLoading ? (
              <div className={styles.empty}>Loading...</div>
            ) : notifications.length === 0 ? (
              <div className={styles.empty}>
                <span className={styles.emptyIcon}>🔔</span>
                No notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <NotificationItem
                  key={notification.notification_id}
                  notification={notification}
                  onDismiss={handleDismiss}
                  onAcknowledge={handleAcknowledge}
                  onSnooze={handleSnooze}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
