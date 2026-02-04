import { useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { usePrescriptions, useTodaysIntakes, useLogIntake } from '@/hooks/useMedications'
import { AddMedicationModal } from '@/components/medications/AddMedicationModal'
import type { PrescriptionWithMedication, IntakeStatus } from '@/types/database'
import styles from './Health.module.css'

const dosageFormLabels: Record<string, string> = {
  tablet: 'Tablet',
  capsule: 'Capsule',
  liquid: 'Liquid',
  injection: 'Injection',
  patch: 'Patch',
  inhaler: 'Inhaler',
  drops: 'Drops',
  cream: 'Cream',
  suppository: 'Suppository',
  other: 'Other',
}

const withFoodLabels: Record<string, string> = {
  with_food: 'Take with food',
  without_food: 'Take without food',
  empty_stomach: 'Take on empty stomach',
}

function formatTime(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function Health() {
  const [showAddMedication, setShowAddMedication] = useState(false)
  const [loggingPrescription, setLoggingPrescription] = useState<string | null>(null)

  const { data: prescriptions = [], isLoading: loadingPrescriptions, error: prescriptionsError } = usePrescriptions()
  const { data: todaysIntakes = [], isLoading: loadingIntakes } = useTodaysIntakes()
  const logIntake = useLogIntake()

  const handleTake = async (prescription: PrescriptionWithMedication) => {
    setLoggingPrescription(prescription.prescription_id)
    try {
      await logIntake.mutateAsync({
        prescription_id: prescription.prescription_id,
        status: 'taken' as IntakeStatus,
      })
    } catch (err) {
      console.error('Failed to log intake:', err)
    } finally {
      setLoggingPrescription(null)
    }
  }

  const handleSkip = async (prescription: PrescriptionWithMedication) => {
    setLoggingPrescription(prescription.prescription_id)
    try {
      await logIntake.mutateAsync({
        prescription_id: prescription.prescription_id,
        status: 'skipped' as IntakeStatus,
      })
    } catch (err) {
      console.error('Failed to log skip:', err)
    } finally {
      setLoggingPrescription(null)
    }
  }

  const isLowStock = (prescription: PrescriptionWithMedication): boolean => {
    if (!prescription.inventory) return false
    const threshold = prescription.inventory.low_stock_threshold || 7
    return prescription.inventory.current_on_hand <= threshold
  }

  return (
    <AppLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Medications</h1>
          <button
            className={styles.addButton}
            onClick={() => setShowAddMedication(true)}
          >
            + Add Medication
          </button>
        </header>

        {prescriptionsError && (
          <div className={styles.error}>
            Failed to load medications. Please try again.
          </div>
        )}

        {loadingPrescriptions ? (
          <div className={styles.loading}>Loading medications...</div>
        ) : prescriptions.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>💊</div>
            <p className={styles.emptyText}>No medications added yet</p>
            <button
              className={styles.emptyAddButton}
              onClick={() => setShowAddMedication(true)}
            >
              Add your first medication
            </button>
          </div>
        ) : (
          <>
            <section className={styles.section}>
              <h2 className={styles.sectionHeader}>Your Medications</h2>
              <div className={styles.medicationList}>
                {prescriptions.map((prescription) => (
                  <div key={prescription.prescription_id} className={styles.medicationCard}>
                    <div className={styles.medicationHeader}>
                      <div>
                        <span className={styles.medicationName}>
                          {prescription.medication.display_name}
                        </span>
                        {prescription.medication.strength_value && (
                          <span className={styles.medicationStrength}>
                            {prescription.medication.strength_value}
                            {prescription.medication.strength_unit}
                          </span>
                        )}
                      </div>
                      <span className={styles.medicationForm}>
                        {dosageFormLabels[prescription.medication.dosage_form] || prescription.medication.dosage_form}
                      </span>
                    </div>

                    <p className={styles.medicationInstructions}>
                      {prescription.instructions_sig}
                    </p>

                    <div className={styles.medicationMeta}>
                      {prescription.frequency_description && (
                        <span className={styles.metaBadge}>
                          {prescription.frequency_description}
                        </span>
                      )}
                      {prescription.frequency_type === 'prn' && (
                        <span className={`${styles.metaBadge} ${styles.prn}`}>
                          PRN (As needed)
                        </span>
                      )}
                      {prescription.with_food && prescription.with_food !== 'none' && (
                        <span className={`${styles.metaBadge} ${styles.withFood}`}>
                          {withFoodLabels[prescription.with_food]}
                        </span>
                      )}
                      {prescription.inventory && (
                        <span className={`${styles.metaBadge} ${isLowStock(prescription) ? styles.lowStock : ''}`}>
                          {prescription.inventory.current_on_hand} left
                        </span>
                      )}
                    </div>

                    <div className={styles.medicationActions}>
                      <button
                        className={styles.takeButton}
                        onClick={() => handleTake(prescription)}
                        disabled={loggingPrescription === prescription.prescription_id}
                      >
                        {loggingPrescription === prescription.prescription_id ? '...' : 'Take Now'}
                      </button>
                      <button
                        className={styles.skipButton}
                        onClick={() => handleSkip(prescription)}
                        disabled={loggingPrescription === prescription.prescription_id}
                      >
                        Skip
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionHeader}>Today's Intake History</h2>
              {loadingIntakes ? (
                <div className={styles.loading}>Loading intake history...</div>
              ) : todaysIntakes.length === 0 ? (
                <div className={styles.empty}>
                  <p className={styles.emptyText}>No medications taken today yet</p>
                </div>
              ) : (
                <div className={styles.intakeHistory}>
                  {todaysIntakes.map((intake) => (
                    <div key={intake.intake_event_id} className={styles.intakeItem}>
                      <div className={styles.intakeInfo}>
                        <span className={styles.intakeMedName}>{intake.medication_name}</span>
                        <span className={styles.intakeTime}>
                          {intake.taken_time ? formatTime(intake.taken_time) : 'Not recorded'}
                        </span>
                      </div>
                      <span className={`${styles.intakeStatus} ${styles[intake.status]}`}>
                        {intake.status.charAt(0).toUpperCase() + intake.status.slice(1)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        <button
          className={styles.fab}
          onClick={() => setShowAddMedication(true)}
          aria-label="Add medication"
        >
          +
        </button>

        <AddMedicationModal
          isOpen={showAddMedication}
          onClose={() => setShowAddMedication(false)}
        />
      </div>
    </AppLayout>
  )
}
