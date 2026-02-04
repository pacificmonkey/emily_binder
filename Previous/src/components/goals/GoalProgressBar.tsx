import { useGoalProgress } from '@/hooks/useGoals'
import styles from './GoalProgressBar.module.css'

interface GoalProgressBarProps {
  goalId: string
}

export function GoalProgressBar({ goalId }: GoalProgressBarProps) {
  const { data: progress, isLoading } = useGoalProgress(goalId)

  if (isLoading || !progress || progress.totalMissions === 0) {
    return null
  }

  return (
    <div className={styles.container}>
      <div className={styles.track}>
        <div
          className={`${styles.fill} ${progress.percentComplete === 100 ? styles.complete : ''}`}
          style={{ width: `${progress.percentComplete}%` }}
        />
      </div>
      <span className={styles.label}>
        {progress.completedMissions}/{progress.totalMissions} missions
      </span>
    </div>
  )
}
