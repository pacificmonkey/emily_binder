import { useState } from 'react'
import { useDeleteEvent, useCompleteEvent, useCancelEvent } from '@/hooks/useEvents'
import type { Event } from '@/types/database'
import styles from './EventDetailModal.module.css'

interface EventDetailModalProps {
  event: Event | null
  isOpen: boolean
  onClose: () => void
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

const eventTypeIcons: Record<string, string> = {
  appointment: '🩺',
  social: '👥',
  errand: '🏃',
  class: '📚',
  therapy: '💬',
  work: '💼',
  other: '📅',
}

function formatDateTime(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function formatTime(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function EventDetailModal({ event, isOpen, onClose }: EventDetailModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const completeEvent = useCompleteEvent()
  const cancelEvent = useCancelEvent()
  const deleteEvent = useDeleteEvent()

  if (!isOpen || !event) return null

  const icon = eventTypeIcons[event.type] || '📅'
  const typeLabel = eventTypeLabels[event.type] || 'Event'

  const handleComplete = async () => {
    setError(null)
    try {
      await completeEvent.mutateAsync(event.event_id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete event')
    }
  }

  const handleCancel = async () => {
    setError(null)
    try {
      await cancelEvent.mutateAsync(event.event_id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel event')
    }
  }

  const handleDelete = async () => {
    setError(null)
    try {
      await deleteEvent.mutateAsync(event.event_id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete event')
    }
  }

  const isPending = completeEvent.isPending || cancelEvent.isPending || deleteEvent.isPending

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <span className={styles.icon}>{icon}</span>
            <div>
              <h2 className={styles.title}>{event.title}</h2>
              <span className={styles.typeBadge}>{typeLabel}</span>
            </div>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            &times;
          </button>
        </div>

        <div className={styles.content}>
          {error && (
            <div className={styles.error}>{error}</div>
          )}

          <div className={styles.detail}>
            <span className={styles.detailIcon}>🗓️</span>
            <div>
              <div className={styles.detailLabel}>When</div>
              <div className={styles.detailValue}>
                {formatDateTime(event.starts_at)}
                {event.ends_at && (
                  <> — {formatTime(event.ends_at)}</>
                )}
              </div>
            </div>
          </div>

          {event.location && (
            <div className={styles.detail}>
              <span className={styles.detailIcon}>📍</span>
              <div>
                <div className={styles.detailLabel}>Location</div>
                <div className={styles.detailValue}>{event.location}</div>
              </div>
            </div>
          )}

          {event.notes && (
            <div className={styles.detail}>
              <span className={styles.detailIcon}>📝</span>
              <div>
                <div className={styles.detailLabel}>Notes</div>
                <div className={styles.detailValue}>{event.notes}</div>
              </div>
            </div>
          )}

          <div className={styles.detail}>
            <span className={styles.detailIcon}>📊</span>
            <div>
              <div className={styles.detailLabel}>Status</div>
              <div className={styles.detailValue}>
                <span className={`${styles.statusBadge} ${styles[event.status]}`}>
                  {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {showDeleteConfirm ? (
          <div className={styles.footer}>
            <p className={styles.confirmText}>Delete this event?</p>
            <div className={styles.confirmButtons}>
              <button
                className={styles.cancelButton}
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isPending}
              >
                No, keep it
              </button>
              <button
                className={styles.deleteButton}
                onClick={handleDelete}
                disabled={isPending}
              >
                {deleteEvent.isPending ? 'Deleting...' : 'Yes, delete'}
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.footer}>
            {event.status === 'scheduled' && (
              <>
                <button
                  className={styles.completeButton}
                  onClick={handleComplete}
                  disabled={isPending}
                >
                  {completeEvent.isPending ? '...' : '✓ Done'}
                </button>
                <button
                  className={styles.cancelEventButton}
                  onClick={handleCancel}
                  disabled={isPending}
                >
                  {cancelEvent.isPending ? '...' : 'Cancel Event'}
                </button>
              </>
            )}
            <button
              className={styles.deleteTextButton}
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isPending}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
