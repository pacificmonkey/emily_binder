import type { MissionStep } from '@/types/database'
import styles from './MissionStepChecklist.module.css'

interface MissionStepChecklistProps {
  missionId: string
  steps: MissionStep[]
  onToggleStep: (stepId: string, completed: boolean) => void
  isExpanded: boolean
}

export function MissionStepChecklist({
  steps,
  onToggleStep,
  isExpanded,
}: MissionStepChecklistProps) {
  if (!isExpanded || steps.length === 0) return null

  const completedCount = steps.filter(s => s.completed).length

  return (
    <div className={styles.container}>
      <div className={styles.progress}>
        <span className={styles.progressText}>
          {completedCount}/{steps.length} steps
        </span>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${(completedCount / steps.length) * 100}%` }}
          />
        </div>
      </div>
      <div className={styles.stepList}>
        {steps.map(step => (
          <div key={step.id} className={styles.stepItem}>
            <button
              className={`${styles.stepCheckbox} ${step.completed ? styles.checked : ''}`}
              onClick={() => onToggleStep(step.id, !step.completed)}
              aria-label={step.completed ? 'Mark step incomplete' : 'Mark step complete'}
            >
              {step.completed && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M5 12l5 5L20 7" />
                </svg>
              )}
            </button>
            <span className={`${styles.stepText} ${step.completed ? styles.completed : ''}`}>
              {step.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
