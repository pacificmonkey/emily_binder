import { useState, useRef, useEffect } from 'react'
import { addHours, addDays } from 'date-fns'
import styles from './SnoozeButton.module.css'

interface SnoozeButtonProps {
  missionOwnerId: string
  currentUserId: string
  isSnoozable: boolean
  onSnooze: (until: Date) => void
}

const SNOOZE_OPTIONS = [
  { label: '1 hour', getDate: () => addHours(new Date(), 1) },
  { label: '3 hours', getDate: () => addHours(new Date(), 3) },
  { label: 'Tomorrow', getDate: () => addDays(new Date(), 1) },
  { label: 'Next week', getDate: () => addDays(new Date(), 7) },
]

export function SnoozeButton({
  missionOwnerId,
  currentUserId,
  isSnoozable,
  onSnooze,
}: SnoozeButtonProps) {
  const [showPicker, setShowPicker] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Only show if user owns the mission OR is_snoozable is true
  const canSnooze = currentUserId === missionOwnerId || isSnoozable
  if (!canSnooze) return null

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowPicker(false)
      }
    }

    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showPicker])

  const handleSnooze = (getDate: () => Date) => {
    onSnooze(getDate())
    setShowPicker(false)
  }

  return (
    <div ref={containerRef} className={styles.container}>
      <button
        className={styles.snoozeBtn}
        onClick={(e) => {
          e.stopPropagation()
          setShowPicker(!showPicker)
        }}
        aria-label="Snooze mission"
        aria-expanded={showPicker}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      </button>
      {showPicker && (
        <div className={styles.picker}>
          <div className={styles.pickerHeader}>Snooze until...</div>
          {SNOOZE_OPTIONS.map(option => (
            <button
              key={option.label}
              className={styles.pickerOption}
              onClick={(e) => {
                e.stopPropagation()
                handleSnooze(option.getDate)
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
