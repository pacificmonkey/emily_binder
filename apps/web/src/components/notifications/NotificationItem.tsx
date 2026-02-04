import { formatDistanceToNow } from 'date-fns'
import type { NotificationListItem } from '@/services/notifications'
import styles from './NotificationItem.module.css'

interface NotificationItemProps {
  notification: NotificationListItem
  onDismiss: (id: string) => void
  onAcknowledge: (id: string) => void
  onSnooze: (id: string) => void
}

const typeIcons: Record<string, string> = {
  reminder: '⏰',
  info: 'ℹ️',
  custom: '📝',
  dose_reminder: '💊',
  low_stock: '📦',
  refill_due: '🔄',
  missed_dose: '⚠️',
  expiration: '📅',
  interaction_warning: '⚡',
}

export function NotificationItem({
  notification,
  onDismiss,
  onAcknowledge,
  onSnooze,
}: NotificationItemProps) {
  const isUnread = notification.status === 'scheduled' || notification.status === 'delivered'
  const icon = typeIcons[notification.type] || '🔔'
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })

  const itemClass = isUnread ? styles.item + ' ' + styles.itemUnread : styles.item

  return (
    <div className={itemClass}>
      <div className={styles.icon}>{icon}</div>
      <div className={styles.content}>
        <h4 className={styles.title}>{notification.title}</h4>
        {notification.body && <p className={styles.body}>{notification.body}</p>}
        <span className={styles.time}>{timeAgo}</span>
      </div>
      <div className={styles.actions}>
        {isUnread && (
          <>
            <button
              className={styles.actionButton}
              onClick={() => onSnooze(notification.notification_id)}
              title="Snooze for 30 minutes"
            >
              💤
            </button>
            <button
              className={styles.actionButton}
              onClick={() => onAcknowledge(notification.notification_id)}
              title="Mark as read"
            >
              ✓
            </button>
          </>
        )}
        <button
          className={styles.actionButton + ' ' + styles.dismissButton}
          onClick={() => onDismiss(notification.notification_id)}
          title="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
