import { useState, type FormEvent } from 'react'
import { useCreateSymptomEntry } from '@/hooks/useWellbeing'
import type { SymptomDomain, SymptomSeverity } from '@/types/database'
import styles from './LogSymptomModal.module.css'

interface LogSymptomModalProps {
  isOpen: boolean
  onClose: () => void
}

const domains: { value: SymptomDomain; label: string; icon: string }[] = [
  { value: 'physical', label: 'Physical', icon: '💪' },
  { value: 'mental', label: 'Mental', icon: '🧠' },
  { value: 'sensory', label: 'Sensory', icon: '👁️' },
  { value: 'sleep', label: 'Sleep', icon: '😴' },
  { value: 'other', label: 'Other', icon: '📋' },
]

const severities: { value: SymptomSeverity; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'mild', label: 'Mild' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'severe', label: 'Severe' },
]

export function LogSymptomModal({ isOpen, onClose }: LogSymptomModalProps) {
  const [domain, setDomain] = useState<SymptomDomain>('physical')
  const [label, setLabel] = useState('')
  const [severity, setSeverity] = useState<SymptomSeverity>('mild')
  const [durationMinutes, setDurationMinutes] = useState('')
  const [possibleTrigger, setPossibleTrigger] = useState('')
  const [whatHelped, setWhatHelped] = useState('')
  const [notes, setNotes] = useState('')

  const [error, setError] = useState<string | null>(null)
  const createSymptom = useCreateSymptomEntry()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!label.trim()) return

    setError(null)

    try {
      await createSymptom.mutateAsync({
        domain,
        label: label.trim(),
        severity,
        duration_minutes: durationMinutes ? parseInt(durationMinutes) : null,
        possible_trigger: possibleTrigger.trim() || null,
        what_helped: whatHelped.trim() || null,
        notes: notes.trim() || null,
      })

      // Reset form and close
      setDomain('physical')
      setLabel('')
      setSeverity('mild')
      setDurationMinutes('')
      setPossibleTrigger('')
      setWhatHelped('')
      setNotes('')
      onClose()
    } catch (err) {
      console.error('Failed to log symptom:', err)
      setError(err instanceof Error ? err.message : 'Failed to log symptom')
    }
  }

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Log Symptom</h2>
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
            <label className={styles.label}>Category</label>
            <div className={styles.domainGrid}>
              {domains.map(d => (
                <button
                  key={d.value}
                  type="button"
                  className={`${styles.domainButton} ${domain === d.value ? styles.domainButtonActive : ''}`}
                  onClick={() => setDomain(d.value)}
                >
                  <span className={styles.domainIcon}>{d.icon}</span>
                  <span className={styles.domainLabel}>{d.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="label" className={styles.label}>
              What are you experiencing?
            </label>
            <input
              id="label"
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              className={styles.input}
              placeholder="e.g., Headache, Anxiety, Fatigue"
              required
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Severity</label>
            <div className={styles.severityGrid}>
              {severities.map(s => (
                <button
                  key={s.value}
                  type="button"
                  className={`${styles.severityButton} ${severity === s.value ? styles.severityButtonActive : ''}`}
                  onClick={() => setSeverity(s.value)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="duration" className={styles.label}>
              Duration (minutes) - optional
            </label>
            <input
              id="duration"
              type="number"
              min="0"
              value={durationMinutes}
              onChange={e => setDurationMinutes(e.target.value)}
              className={styles.input}
              placeholder="How long has this been going on?"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="trigger" className={styles.label}>
              Possible trigger - optional
            </label>
            <input
              id="trigger"
              type="text"
              value={possibleTrigger}
              onChange={e => setPossibleTrigger(e.target.value)}
              className={styles.input}
              placeholder="What might have caused this?"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="helped" className={styles.label}>
              What helped? - optional
            </label>
            <input
              id="helped"
              type="text"
              value={whatHelped}
              onChange={e => setWhatHelped(e.target.value)}
              className={styles.input}
              placeholder="Anything that made it better?"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="notes" className={styles.label}>
              Notes - optional
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className={`${styles.input} ${styles.textarea}`}
              placeholder="Any other details..."
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
            disabled={!label.trim() || createSymptom.isPending}
          >
            {createSymptom.isPending ? 'Logging...' : 'Log Symptom'}
          </button>
        </div>
      </div>
    </div>
  )
}
