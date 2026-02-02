/**
 * StreakTimeline - Visual timeline showing streak history
 */

import { useMemo } from 'react'
import { useTopStreaks } from '@/hooks/useStreaks'
import styles from './StreakTimeline.module.css'

// The streaks include joined mission data from the query
interface StreakWithMission {
  id: string
  user_id: string
  mission_id: string
  current_streak: number
  longest_streak: number
  last_completed_week: string | null
  updated_at: string
  mission?: { id: string; title: string; category_id: string } | null
}

interface StreakTimelineProps {
  limit?: number
}

export function StreakTimeline({ limit = 5 }: StreakTimelineProps) {
  const { data: streaks, isLoading } = useTopStreaks(limit)

  // Generate a simple visual timeline for each streak
  const streakData = useMemo(() => {
    if (!streaks) return []

    // Cast to include joined mission data
    const streaksWithMission = streaks as unknown as StreakWithMission[]

    return streaksWithMission.map((streak) => {
      const currentStreak = streak.current_streak
      const longestStreak = streak.longest_streak

      // Generate bars for visualization (show last 8 weeks)
      const bars: ('active' | 'inactive' | 'current')[] = []
      const weeksToShow = 8

      for (let i = weeksToShow - 1; i >= 0; i--) {
        if (i < currentStreak) {
          bars.push(i === 0 ? 'current' : 'active')
        } else {
          bars.push('inactive')
        }
      }

      return {
        ...streak,
        bars,
        percentOfBest: longestStreak > 0 ? Math.round((currentStreak / longestStreak) * 100) : 0,
      }
    })
  }, [streaks])

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading streaks...</div>
      </div>
    )
  }

  if (!streakData || streakData.length === 0) {
    return (
      <div className={styles.container}>
        <p className={styles.empty}>No active streaks yet</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.streakList}>
        {streakData.map((streak) => (
          <div key={streak.id} className={styles.streakItem}>
            <div className={styles.header}>
              <span className={styles.title}>{streak.mission?.title ?? 'Unknown Mission'}</span>
              <span className={styles.count}>{streak.current_streak} weeks</span>
            </div>

            <div className={styles.timeline}>
              {streak.bars.map((status, idx) => (
                <div
                  key={idx}
                  className={`${styles.bar} ${styles[status]}`}
                />
              ))}
            </div>

            <div className={styles.footer}>
              <span className={styles.best}>Best: {streak.longest_streak} weeks</span>
              {streak.percentOfBest >= 100 ? (
                <span className={styles.record}>New Record!</span>
              ) : (
                <span className={styles.progress}>{streak.percentOfBest}% of best</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
