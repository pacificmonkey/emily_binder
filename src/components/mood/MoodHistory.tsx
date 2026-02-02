/**
 * MoodHistory - 7-day mood grid showing quadrant-colored dots
 */

import { useMemo } from 'react'
import { useRecentMoodLogs } from '@/hooks/useMood'
import { useAuth } from '@/contexts/AuthContext'
import { QUADRANT_COLORS, QUADRANT_EMOJIS } from '@/services/mood'
import { getCanonicalToday, formatDate } from '@/lib/timezone'
import type { MoodQuadrant } from '@/types/database'
import styles from './MoodHistory.module.css'

interface MoodHistoryProps {
  userId?: string
  days?: number
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function MoodHistory({ userId, days = 7 }: MoodHistoryProps) {
  const { user } = useAuth()
  const targetUserId = userId ?? user?.id ?? ''
  const { data: moodLogs, isLoading } = useRecentMoodLogs(targetUserId, days)

  // Build a map of date -> mood quadrants for that day
  const moodsByDate = useMemo(() => {
    const map = new Map<string, MoodQuadrant[]>()
    if (!moodLogs) return map

    for (const log of moodLogs) {
      const date = log.logged_at.split('T')[0]
      const existing = map.get(date) ?? []
      existing.push(log.quadrant)
      map.set(date, existing)
    }
    return map
  }, [moodLogs])

  // Generate array of last N days
  const dayArray = useMemo(() => {
    const today = getCanonicalToday()
    const result: { date: string; dayName: string; isToday: boolean }[] = []

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = formatDate(date, 'yyyy-MM-dd')
      result.push({
        date: dateStr,
        dayName: DAY_NAMES[date.getDay()],
        isToday: i === 0,
      })
    }

    return result
  }, [days])

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading mood history...</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Mood History</h3>
        <div className={styles.legend}>
          {(Object.keys(QUADRANT_EMOJIS) as MoodQuadrant[]).map((quadrant) => (
            <span
              key={quadrant}
              className={styles.legendItem}
              style={{ color: QUADRANT_COLORS[quadrant] }}
            >
              {QUADRANT_EMOJIS[quadrant]}
            </span>
          ))}
        </div>
      </div>

      <div className={styles.grid}>
        {dayArray.map(({ date, dayName, isToday }) => {
          const moods = moodsByDate.get(date) ?? []

          return (
            <div
              key={date}
              className={`${styles.day} ${isToday ? styles.today : ''}`}
            >
              <span className={styles.dayLabel}>{dayName}</span>
              <div className={styles.dots}>
                {moods.length === 0 ? (
                  <span className={styles.emptyDot} />
                ) : (
                  moods.slice(0, 3).map((quadrant, idx) => (
                    <span
                      key={idx}
                      className={styles.dot}
                      style={{ backgroundColor: QUADRANT_COLORS[quadrant] }}
                      title={QUADRANT_EMOJIS[quadrant]}
                    />
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
