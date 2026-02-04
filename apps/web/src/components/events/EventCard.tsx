import type { Event } from '@/types/database'
import styles from './EventCard.module.css'

interface EventCardProps {
  event: Event
  onClick?: () => void
}

const eventTypeIcons: Record<string, string> = {
  appointment: '🩺',
  social: '👥',
  errand: '🏃',
  class: '📚',
  therapy: '💬',
  work: '💼',
  other: '📅',
}

const eventTypeLabels: Record<string, string> = {
  appointment: 'Appointment',
  social: 'Social',
  errand: 'Errand',
  class: 'Class',
  therapy: 'Therapy',
  work: 'Work',
  other: 'Event',
}

function formatTime(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function formatDate(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function EventCard({ event, onClick }: EventCardProps) {
  const icon = eventTypeIcons[event.type] || '📅'
  const typeLabel = eventTypeLabels[event.type] || 'Event'

  const cardClasses = [
    styles.card,
    event.status === 'completed' && styles.completed,
    event.status === 'canceled' && styles.canceled,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={cardClasses} onClick={onClick} role={onClick ? 'button' : undefined}>
      <div className={styles.icon}>{icon}</div>
      <div className={styles.content}>
        <h3 className={styles.title}>{event.title}</h3>
        <div className={styles.meta}>
          <span className={styles.time}>
            {formatTime(event.starts_at)}
            {event.ends_at && ` - ${formatTime(event.ends_at)}`}
          </span>
          <span className={styles.badge}>{typeLabel}</span>
        </div>
        {event.location && (
          <div className={styles.location}>
            <span className={styles.locationIcon}>📍</span>
            {event.location}
          </div>
        )}
      </div>
      {event.status === 'completed' && (
        <span className={styles.statusBadge}>Done</span>
      )}
      {event.status === 'canceled' && (
        <span className={`${styles.statusBadge} ${styles.canceledBadge}`}>Canceled</span>
      )}
    </div>
  )
}

// Compact variant for showing in lists
interface EventCardCompactProps {
  event: Event
  showDate?: boolean
  onClick?: () => void
}

export function EventCardCompact({ event, showDate = false, onClick }: EventCardCompactProps) {
  const icon = eventTypeIcons[event.type] || '📅'

  return (
    <div className={styles.compactCard} onClick={onClick} role={onClick ? 'button' : undefined}>
      <span className={styles.compactIcon}>{icon}</span>
      <div className={styles.compactContent}>
        <span className={styles.compactTitle}>{event.title}</span>
        <span className={styles.compactTime}>
          {showDate && `${formatDate(event.starts_at)} · `}
          {formatTime(event.starts_at)}
        </span>
      </div>
    </div>
  )
}
