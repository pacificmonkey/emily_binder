import { useState, type FormEvent } from 'react'
import { useCreateMedicationPrescription } from '@/hooks/useMedications'
import type { DosageForm, FrequencyType, WithFood } from '@/types/database'
import styles from './AddMedicationModal.module.css'

interface AddMedicationModalProps {
  isOpen: boolean
  onClose: () => void
}

const dosageForms: { value: DosageForm; label: string; icon: string }[] = [
  { value: 'tablet', label: 'Tablet', icon: '💊' },
  { value: 'capsule', label: 'Capsule', icon: '🔴' },
  { value: 'liquid', label: 'Liquid', icon: '🧴' },
  { value: 'inhaler', label: 'Inhaler', icon: '🫁' },
  { value: 'injection', label: 'Injection', icon: '💉' },
  { value: 'patch', label: 'Patch', icon: '🩹' },
  { value: 'drops', label: 'Drops', icon: '💧' },
  { value: 'cream', label: 'Cream', icon: '🧴' },
]

const frequencyOptions: { value: FrequencyType; label: string }[] = [
  { value: 'scheduled', label: 'Scheduled (regular times)' },
  { value: 'prn', label: 'As Needed (PRN)' },
  { value: 'both', label: 'Scheduled + As Needed' },
]

const withFoodOptions: { value: WithFood; label: string }[] = [
  { value: 'none', label: 'No requirement' },
  { value: 'with_food', label: 'Take with food' },
  { value: 'without_food', label: 'Take without food' },
  { value: 'empty_stomach', label: 'Take on empty stomach' },
]

export function AddMedicationModal({ isOpen, onClose }: AddMedicationModalProps) {
  const [displayName, setDisplayName] = useState('')
  const [strengthValue, setStrengthValue] = useState('')
  const [strengthUnit, setStrengthUnit] = useState('mg')
  const [dosageForm, setDosageForm] = useState<DosageForm>('tablet')
  const [doseQuantity, setDoseQuantity] = useState('1')
  const [doseUnit, setDoseUnit] = useState('tablet')
  const [frequencyType, setFrequencyType] = useState<FrequencyType>('scheduled')
  const [frequencyDescription, setFrequencyDescription] = useState('')
  const [timesPerDay, setTimesPerDay] = useState('')
  const [withFood, setWithFood] = useState<WithFood>('none')
  const [prnReason, setPrnReason] = useState('')
  const [notes, setNotes] = useState('')
  const [initialInventory, setInitialInventory] = useState('')

  const [error, setError] = useState<string | null>(null)
  const createMedication = useCreateMedicationPrescription()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!displayName.trim()) return

    setError(null)

    try {
      await createMedication.mutateAsync({
        display_name: displayName.trim(),
        strength_value: strengthValue ? parseFloat(strengthValue) : null,
        strength_unit: strengthUnit as any,
        dosage_form: dosageForm,
        dose_quantity: parseFloat(doseQuantity) || 1,
        dose_unit: doseUnit || 'tablet',
        frequency_type: frequencyType,
        frequency_description: frequencyDescription.trim() || null,
        times_per_day: timesPerDay ? parseInt(timesPerDay) : null,
        with_food: withFood,
        is_prn: frequencyType === 'prn' || frequencyType === 'both',
        prn_reason: prnReason.trim() || null,
        notes: notes.trim() || null,
        initial_inventory: initialInventory ? parseFloat(initialInventory) : null,
      })

      // Reset form and close
      setDisplayName('')
      setStrengthValue('')
      setStrengthUnit('mg')
      setDosageForm('tablet')
      setDoseQuantity('1')
      setDoseUnit('tablet')
      setFrequencyType('scheduled')
      setFrequencyDescription('')
      setTimesPerDay('')
      setWithFood('none')
      setPrnReason('')
      setNotes('')
      setInitialInventory('')
      onClose()
    } catch (err) {
      console.error('Failed to add medication:', err)
      setError(err instanceof Error ? err.message : 'Failed to add medication')
    }
  }

  // Update dose unit when dosage form changes
  const handleDosageFormChange = (form: DosageForm) => {
    setDosageForm(form)
    switch (form) {
      case 'tablet':
        setDoseUnit('tablet')
        break
      case 'capsule':
        setDoseUnit('capsule')
        break
      case 'liquid':
        setDoseUnit('mL')
        break
      case 'injection':
        setDoseUnit('injection')
        break
      case 'inhaler':
        setDoseUnit('puff')
        break
      case 'drops':
        setDoseUnit('drop')
        break
      case 'patch':
        setDoseUnit('patch')
        break
      case 'cream':
        setDoseUnit('application')
        break
      default:
        setDoseUnit('dose')
    }
  }

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Add Medication</h2>
          <button className={styles.closeButton} onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          <div className={styles.field}>
            <label htmlFor="displayName" className={styles.label}>
              Medication Name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className={styles.input}
              placeholder="e.g., Lisinopril, Metformin"
              required
              autoFocus
            />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="strengthValue" className={styles.label}>
                Strength
              </label>
              <input
                id="strengthValue"
                type="number"
                step="any"
                value={strengthValue}
                onChange={e => setStrengthValue(e.target.value)}
                className={styles.input}
                placeholder="10"
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="strengthUnit" className={styles.label}>
                Unit
              </label>
              <select
                id="strengthUnit"
                value={strengthUnit}
                onChange={e => setStrengthUnit(e.target.value)}
                className={styles.select}
              >
                <option value="mg">mg</option>
                <option value="mcg">mcg</option>
                <option value="g">g</option>
                <option value="ml">mL</option>
                <option value="units">units</option>
                <option value="puffs">puffs</option>
                <option value="other">other</option>
              </select>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Form</label>
            <div className={styles.formGrid}>
              {dosageForms.map(form => (
                <button
                  key={form.value}
                  type="button"
                  className={`${styles.formButton} ${dosageForm === form.value ? styles.formButtonActive : ''}`}
                  onClick={() => handleDosageFormChange(form.value)}
                >
                  <span className={styles.formIcon}>{form.icon}</span>
                  <span className={styles.formLabel}>{form.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="doseQuantity" className={styles.label}>
                Dose Amount
              </label>
              <input
                id="doseQuantity"
                type="number"
                step="any"
                value={doseQuantity}
                onChange={e => setDoseQuantity(e.target.value)}
                className={styles.input}
                placeholder="1"
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="doseUnit" className={styles.label}>
                Per Dose
              </label>
              <input
                id="doseUnit"
                type="text"
                value={doseUnit}
                onChange={e => setDoseUnit(e.target.value)}
                className={styles.input}
                placeholder="tablet"
              />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="frequencyType" className={styles.label}>
              Frequency Type
            </label>
            <select
              id="frequencyType"
              value={frequencyType}
              onChange={e => setFrequencyType(e.target.value as FrequencyType)}
              className={styles.select}
            >
              {frequencyOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {(frequencyType === 'scheduled' || frequencyType === 'both') && (
            <div className={styles.row}>
              <div className={styles.field}>
                <label htmlFor="frequencyDescription" className={styles.label}>
                  Schedule
                </label>
                <input
                  id="frequencyDescription"
                  type="text"
                  value={frequencyDescription}
                  onChange={e => setFrequencyDescription(e.target.value)}
                  className={styles.input}
                  placeholder="e.g., twice daily, every 8 hours"
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="timesPerDay" className={styles.label}>
                  Times/Day
                </label>
                <input
                  id="timesPerDay"
                  type="number"
                  value={timesPerDay}
                  onChange={e => setTimesPerDay(e.target.value)}
                  className={styles.input}
                  placeholder="2"
                />
              </div>
            </div>
          )}

          {(frequencyType === 'prn' || frequencyType === 'both') && (
            <div className={styles.field}>
              <label htmlFor="prnReason" className={styles.label}>
                Take as needed for...
              </label>
              <input
                id="prnReason"
                type="text"
                value={prnReason}
                onChange={e => setPrnReason(e.target.value)}
                className={styles.input}
                placeholder="e.g., pain, anxiety, nausea"
              />
            </div>
          )}

          <div className={styles.field}>
            <label htmlFor="withFood" className={styles.label}>
              Food Requirements
            </label>
            <select
              id="withFood"
              value={withFood}
              onChange={e => setWithFood(e.target.value as WithFood)}
              className={styles.select}
            >
              {withFoodOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label htmlFor="initialInventory" className={styles.label}>
              Current Quantity on Hand (optional)
            </label>
            <input
              id="initialInventory"
              type="number"
              step="any"
              value={initialInventory}
              onChange={e => setInitialInventory(e.target.value)}
              className={styles.input}
              placeholder="e.g., 30"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="notes" className={styles.label}>
              Notes (optional)
            </label>
            <input
              id="notes"
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className={styles.input}
              placeholder="Any additional notes..."
            />
          </div>
        </form>

        <div className={styles.footer}>
          <button type="button" className={styles.cancelButton} onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className={styles.submitButton}
            onClick={handleSubmit}
            disabled={!displayName.trim() || createMedication.isPending}
          >
            {createMedication.isPending ? 'Adding...' : 'Add Medication'}
          </button>
        </div>
      </div>
    </div>
  )
}
