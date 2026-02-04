import { useRefillLogs } from '@/hooks/useHealth'
import { format } from 'date-fns'
import styles from './RefillHistory.module.css'

interface RefillHistoryProps {
  medicationId: string
  limit?: number
}

export function RefillHistory({ medicationId, limit = 5 }: RefillHistoryProps) {
  const { data: refillLogs, isLoading } = useRefillLogs(medicationId, limit)

  if (isLoading) {
    return <div className={styles.loading}>Loading refill history...</div>
  }

  if (!refillLogs || refillLogs.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No refills recorded yet</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.timeline}>
        {refillLogs.map((log, index) => (
          <div key={log.id} className={styles.timelineItem}>
            <div className={styles.timelineDot}>
              <div className={`${styles.dot} ${index === 0 ? styles.current : ''}`} />
              {index < refillLogs.length - 1 && <div className={styles.line} />}
            </div>
            <div className={styles.content}>
              <div className={styles.header}>
                <span className={styles.date}>
                  {format(new Date(log.refill_date), 'MMM d, yyyy')}
                </span>
                <span className={styles.pillsAdded}>+{log.pills_added} pills</span>
              </div>
              <div className={styles.details}>
                {log.refills_remaining_after !== null && (
                  <span className={styles.detail}>
                    {log.refills_remaining_after} refills remaining
                  </span>
                )}
                {log.note && (
                  <span className={styles.notes}>{log.note}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
