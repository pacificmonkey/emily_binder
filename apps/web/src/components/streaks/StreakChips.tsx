import { useStreaks } from '@/hooks/useStreaks'
import type { StreakWithState } from '@/types/database'
import styles from './StreakChips.module.css'

function StreakChip({ streak }: { streak: StreakWithState }) {
  const state = streak.state
  const count = state?.current_count || 0
  const satisfied = state?.period_satisfied || false
  const status = state?.status || 'ongoing'

  const getStatusEmoji = () => {
    if (status === 'broken') return '💔'
    if (status === 'shielded') return '🛡️'
    if (satisfied) return '✅'
    return streak.period === 'daily' ? '📅' : '📆'
  }

  const getChipStyle = () => {
    if (status === 'broken') return styles.chipBroken
    if (status === 'shielded') return styles.chipShielded
    if (satisfied) return styles.chipSatisfied
    return ''
  }

  return (
    <div className={`${styles.chip} ${getChipStyle()}`}>
      <span className={styles.chipEmoji}>{getStatusEmoji()}</span>
      <span className={styles.chipName}>{streak.name}</span>
      <span className={styles.chipCount}>{count}</span>
      {streak.coin_reward > 0 && !satisfied && (
        <span className={styles.chipReward}>+{streak.coin_reward}🪙</span>
      )}
    </div>
  )
}

export function StreakChips() {
  const { data: streaks = [], isLoading, error } = useStreaks()

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading streaks...</div>
      </div>
    )
  }

  if (error || streaks.length === 0) {
    return null // Don't show anything if no streaks
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Streaks</h3>
      <div className={styles.chips}>
        {streaks.map((streak) => (
          <StreakChip key={streak.streak_definition_id} streak={streak} />
        ))}
      </div>
    </div>
  )
}
