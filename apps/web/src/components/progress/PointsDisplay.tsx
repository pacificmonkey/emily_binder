import { useUserProgress } from '@/hooks/useTasks'
import styles from './PointsDisplay.module.css'

export function PointsDisplay() {
  const { data: progress, isLoading } = useUserProgress()

  if (isLoading || !progress) {
    return (
      <div className={styles.container}>
        <div className={styles.icon}>⭐</div>
        <div className={styles.content}>
          <p className={styles.level}>Level 1</p>
          <p className={styles.points}>0 points</p>
        </div>
      </div>
    )
  }

  // Calculate progress percentage
  // points_into_level = points earned in current level
  // points_to_next_level = points remaining to reach next level
  const totalForLevel = progress.points_into_level + progress.points_to_next_level
  const progressPercent = totalForLevel > 0
    ? (progress.points_into_level / totalForLevel) * 100
    : 0

  return (
    <div className={styles.container}>
      <div className={styles.icon}>⭐</div>
      <div className={styles.content}>
        <p className={styles.level}>Level {progress.current_level}</p>
        <p className={styles.points}>{progress.total_points} points</p>

        {progress.current_level < 10 && (
          <>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${Math.max(0, progressPercent)}%` }}
              />
            </div>
            <div className={styles.nextLevel}>
              <span>{progress.points_to_next_level} to next level</span>
              <span>Level {progress.current_level + 1}</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
