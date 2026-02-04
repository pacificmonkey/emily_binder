import { useState, useEffect } from 'react'
import {
  useIsAdmin,
  usePatientsForImpersonation,
  useImpersonationStatus,
  useStartImpersonation,
} from '@/hooks/useAdmin'
import styles from './AdminPatientSelector.module.css'

export function AdminPatientSelector() {
  const { data: isAdmin, isLoading: isLoadingAdmin } = useIsAdmin()
  const { data: patients, refetch: refetchPatients } = usePatientsForImpersonation()
  const { data: status } = useImpersonationStatus()
  const startImpersonation = useStartImpersonation()
  const [isOpen, setIsOpen] = useState(false)

  // Fetch patients when dropdown is opened
  useEffect(() => {
    if (isOpen && !patients) {
      refetchPatients()
    }
  }, [isOpen, patients, refetchPatients])

  if (isLoadingAdmin || !isAdmin) {
    return null
  }

  const handleSelect = (patientId: string) => {
    startImpersonation.mutate({ targetPatientId: patientId })
    setIsOpen(false)
  }

  return (
    <div className={styles.container}>
      <button
        className={styles.trigger}
        onClick={() => setIsOpen(!isOpen)}
        title="Switch patient view"
      >
        <span className={styles.adminBadge}>Admin</span>
        <span className={styles.icon}>⚙️</span>
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.header}>View as patient:</div>
          {patients?.length === 0 && (
            <div className={styles.empty}>No patients found</div>
          )}
          {patients?.map((patient) => (
            <button
              key={patient.patient_id}
              className={`${styles.option} ${status?.target_patient_id === patient.patient_id ? styles.active : ''}`}
              onClick={() => handleSelect(patient.patient_id)}
              disabled={startImpersonation.isPending}
            >
              <span className={styles.patientName}>{patient.full_name}</span>
              <span className={styles.patientEmail}>{patient.email}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
