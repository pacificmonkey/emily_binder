import { useState, type FormEvent } from 'react'
import { useCreateEvent } from '@/hooks/useEvents'
import type { EventType } from '@/types/database'
import styles from './AddEventModal.module.css'

interface AddEventModalProps {
  isOpen: boolean
  onClose: () => void
  defaultDate?: Date
}

const eventTypes: { value: EventType; label: string; icon: string }[] = [
  { value: 'appointment', label: 'Appointment', icon: '🩺' },
  { value: 'therapy', label: 'Therapy', icon: '💬' },
  { value: 'social', label: 'Social', icon: '👥' },
  { value: 'class', label: 'Class', icon: '📚' },
  { value: 'work', label: 'Work', icon: '💼' },
  { value: 'errand', label: 'Errand', icon: '🏃' },
  { value: 'other', label: 'Other', icon: '📅' },
]

function formatDateForInput(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatTimeForInput(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

export function AddEventModal({ isOpen, onClose, defaultDate }: AddEventModalProps) {
  const defaultDateTime = defaultDate || new Date()
  // Round to next hour
  defaultDateTime.setMinutes(0, 0, 0)
  defaultDateTime.setHours(defaultDateTime.getHours() + 1)

  const [title, setTitle] = useState('')
  const [eventType, setEventType] = useState<EventType>('other')
  const [date, setDate] = useState(formatDateForInput(defaultDateTime))
  const [startTime, setStartTime] = useState(formatTimeForInput(defaultDateTime))
  const [endTime, setEndTime] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')

  const [error, setError] = useState<string | null>(null)
  const createEvent = useCreateEvent()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !date || !startTime) return

    setError(null)

    try {
      // Combine date and time into ISO string
      const startsAt = new Date(`${date}T${startTime}:00`).toISOString()
      const endsAt = endTime ? new Date(`${date}T${endTime}:00`).toISOString() : null

      console.log('Creating event:', { title, eventType, startsAt, endsAt })

      await createEvent.mutateAsync({
        title: title.trim(),
        type: eventType,
        starts_at: startsAt,
        ends_at: endsAt,
        location: location.trim() || null,
        notes: notes.trim() || null,
      })

      console.log('Event created successfully')

      // Reset form and close
      setTitle('')
      setEventType('other')
      setDate(formatDateForInput(new Date()))
      setStartTime(formatTimeForInput(new Date()))
      setEndTime('')
      setLocation('')
      setNotes('')
      onClose()
    } catch (err) {
      console.error('Failed to create event:', err)
      setError(err instanceof Error ? err.message : 'Failed to create event')
    }
  }

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Add Event</h2>
          <button className={styles.closeButton} onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          <div className={styles.field}>
            <label htmlFor="title" className={styles.label}>
              Event Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className={styles.input}
              placeholder="What's happening?"
              required
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Event Type</label>
            <div className={styles.typeGrid}>
              {eventTypes.map(type => (
                <button
                  key={type.value}
                  type="button"
                  className={`${styles.typeButton} ${eventType === type.value ? styles.typeButtonActive : ''}`}
                  onClick={() => setEventType(type.value)}
                >
                  <span className={styles.typeIcon}>{type.icon}</span>
                  <span className={styles.typeLabel}>{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="date" className={styles.label}>
                Date
              </label>
              <input
                id="date"
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className={styles.input}
                required
              />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="startTime" className={styles.label}>
                Start Time
              </label>
              <input
                id="startTime"
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className={styles.input}
                required
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="endTime" className={styles.label}>
                End Time (optional)
              </label>
              <input
                id="endTime"
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="location" className={styles.label}>
              Location (optional)
            </label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              className={styles.input}
              placeholder="Where is it?"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="notes" className={styles.label}>
              Notes (optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className={`${styles.input} ${styles.textarea}`}
              placeholder="Any additional details..."
            />
          </div>
        </form>

        <div className={styles.footer}>
          <button type="button" className={styles.cancelButton} onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className={styles.submitButton}
            onClick={handleSubmit}
            disabled={!title.trim() || !date || !startTime || createEvent.isPending}
          >
            {createEvent.isPending ? 'Adding...' : 'Add Event'}
          </button>
        </div>
      </div>
    </div>
  )
}
