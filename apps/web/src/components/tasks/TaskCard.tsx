import { useState } from 'react'
import type { TaskWithInstance } from '@/types/database'
import styles from './TaskCard.module.css'

interface TaskCardProps {
  task: TaskWithInstance
  onComplete: (taskId: string) => Promise<void>
  onUncomplete: (taskId: string) => Promise<void>
}

export function TaskCard({ task, onComplete, onUncomplete }: TaskCardProps) {
  const [loading, setLoading] = useState(false)
  const isCompleted = task.task_instance?.completion_status === 'done'

  const handleToggle = async () => {
    setLoading(true)
    try {
      if (isCompleted) {
        await onUncomplete(task.task_id)
      } else {
        await onComplete(task.task_id)
      }
    } finally {
      setLoading(false)
    }
  }

  const cardClasses = [
    styles.card,
    isCompleted && styles.completed,
    task.must_do && styles.mustDo,
    loading && styles.loading,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={cardClasses}>
      <button
        className={`${styles.checkbox} ${isCompleted ? styles.checked : ''}`}
        onClick={handleToggle}
        disabled={loading}
        aria-label={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
      >
        {isCompleted && <span className={styles.checkmark}>✓</span>}
      </button>

      <div className={styles.content}>
        <h3 className={styles.title}>{task.title}</h3>
        <div className={styles.meta}>
          <span className={styles.points}>
            <span className={styles.pointsIcon}>⭐</span>
            {task.points} pts
          </span>

          {task.task_type_key === 'recurring' && (
            <span className={styles.badge}>Recurring</span>
          )}

          {task.task_type_key === 'bonus' && (
            <span className={styles.badge}>Bonus</span>
          )}

          {task.must_do && (
            <span className={`${styles.badge} ${styles.mustDoBadge}`}>Must Do</span>
          )}
        </div>
      </div>
    </div>
  )
}
