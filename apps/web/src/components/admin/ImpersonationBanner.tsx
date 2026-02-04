import { useImpersonationStatus, useStopImpersonation } from '@/hooks/useAdmin'
import styles from './ImpersonationBanner.module.css'

export function ImpersonationBanner() {
  const { data: status, isLoading } = useImpersonationStatus()
  const stopImpersonation = useStopImpersonation()

  if (isLoading || !status?.is_impersonating) {
    return null
  }

  const handleStop = () => {
    stopImpersonation.mutate()
  }

  return (
    <div className={styles.banner}>
      <span className={styles.icon}>👤</span>
      <span className={styles.text}>
        Viewing as <strong>{status.target_patient_name}</strong>
      </span>
      <button
        className={styles.stopButton}
        onClick={handleStop}
        disabled={stopImpersonation.isPending}
      >
        {stopImpersonation.isPending ? 'Stopping...' : 'Exit'}
      </button>
    </div>
  )
}
