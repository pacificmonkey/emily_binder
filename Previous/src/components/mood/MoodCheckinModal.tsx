import { useState } from 'react'
import { Modal, Button } from '@/components/ui'
import { useMoodFeelingsByQuadrant, useCreateMoodLog, useMoodCheckinStatus } from '@/hooks/useMood'
import type { MoodQuadrant } from '@/types/database'
import { QUADRANT_LABELS, QUADRANT_EMOJIS, QUADRANT_COLORS } from '@/services/mood'
import styles from './MoodCheckinModal.module.css'

interface MoodCheckinModalProps {
  isOpen: boolean
  onClose: () => void
}

export function MoodCheckinModal({ isOpen, onClose }: MoodCheckinModalProps) {
  const { data: feelingsByQuadrant, isLoading } = useMoodFeelingsByQuadrant()
  const { data: checkinStatus } = useMoodCheckinStatus()
  const createMoodLog = useCreateMoodLog()

  // Form state
  const [step, setStep] = useState(1)
  const [selectedQuadrant, setSelectedQuadrant] = useState<MoodQuadrant | null>(null)
  const [selectedFeelings, setSelectedFeelings] = useState<string[]>([])
  const [intensity, setIntensity] = useState<number>(3)
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const resetForm = () => {
    setStep(1)
    setSelectedQuadrant(null)
    setSelectedFeelings([])
    setIntensity(3)
    setNote('')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleFeelingToggle = (feelingName: string) => {
    setSelectedFeelings(prev => {
      if (prev.includes(feelingName)) {
        return prev.filter(f => f !== feelingName)
      }
      if (prev.length >= 2) {
        // Replace the first one
        return [prev[1], feelingName]
      }
      return [...prev, feelingName]
    })
  }

  const handleSubmit = async () => {
    if (!selectedQuadrant || selectedFeelings.length === 0) return

    setIsSubmitting(true)
    try {
      await createMoodLog.mutateAsync({
        quadrant: selectedQuadrant,
        feelings: selectedFeelings,
        intensity,
        note: note.trim() || null,
      })
      handleClose()
    } catch (error) {
      console.error('Failed to create mood log:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const quadrants: MoodQuadrant[] = [
    'high_energy_pleasant',
    'high_energy_unpleasant',
    'low_energy_pleasant',
    'low_energy_unpleasant',
  ]

  const cannotCheckin = !checkinStatus?.canCheckin

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="How are you feeling?">
      <div className={styles.content}>
        {cannotCheckin ? (
          <div className={styles.unavailable}>
            <p className={styles.unavailableText}>
              {checkinStatus?.cooldownMinutes
                ? `Please wait ${checkinStatus.cooldownMinutes} minutes before your next check-in.`
                : `You've completed all ${checkinStatus?.maxCheckins} check-ins for today.`}
            </p>
            <Button onClick={handleClose}>Close</Button>
          </div>
        ) : (
          <>
            {/* Step 1: Quadrant Selection */}
            {step === 1 && (
              <div className={styles.step}>
                <p className={styles.instruction}>
                  Tap the area that best matches your energy and mood right now.
                </p>
                <div className={styles.quadrantGrid}>
                  {quadrants.map(quadrant => (
                    <button
                      key={quadrant}
                      className={`${styles.quadrantCard} ${selectedQuadrant === quadrant ? styles.selected : ''}`}
                      style={{
                        '--quadrant-color': QUADRANT_COLORS[quadrant],
                      } as React.CSSProperties}
                      onClick={() => setSelectedQuadrant(quadrant)}
                    >
                      <span className={styles.quadrantEmoji}>{QUADRANT_EMOJIS[quadrant]}</span>
                      <span className={styles.quadrantLabel}>{QUADRANT_LABELS[quadrant]}</span>
                    </button>
                  ))}
                </div>
                <div className={styles.axisLabels}>
                  <span className={styles.axisLabel} style={{ gridArea: 'top' }}>High Energy</span>
                  <span className={styles.axisLabel} style={{ gridArea: 'bottom' }}>Low Energy</span>
                  <span className={styles.axisLabel} style={{ gridArea: 'left' }}>Unpleasant</span>
                  <span className={styles.axisLabel} style={{ gridArea: 'right' }}>Pleasant</span>
                </div>
                <div className={styles.actions}>
                  <Button variant="ghost" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => setStep(2)}
                    disabled={!selectedQuadrant}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Feelings Selection */}
            {step === 2 && selectedQuadrant && (
              <div className={styles.step}>
                <p className={styles.instruction}>
                  Select 1-2 words that describe how you're feeling.
                </p>
                {isLoading ? (
                  <p className={styles.loading}>Loading feelings...</p>
                ) : (
                  <div className={styles.feelingsGrid}>
                    {feelingsByQuadrant?.[selectedQuadrant]?.map(feeling => (
                      <button
                        key={feeling.id}
                        className={`${styles.feelingChip} ${selectedFeelings.includes(feeling.name) ? styles.selected : ''}`}
                        onClick={() => handleFeelingToggle(feeling.name)}
                      >
                        {feeling.name}
                      </button>
                    ))}
                  </div>
                )}
                <p className={styles.selectionHint}>
                  {selectedFeelings.length === 0
                    ? 'Select at least one'
                    : `Selected: ${selectedFeelings.join(', ')}`}
                </p>
                <div className={styles.actions}>
                  <Button variant="ghost" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button
                    onClick={() => setStep(3)}
                    disabled={selectedFeelings.length === 0}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Intensity & Note */}
            {step === 3 && (
              <div className={styles.step}>
                <div className={styles.intensitySection}>
                  <label className={styles.label}>How intense is this feeling?</label>
                  <div className={styles.intensitySlider}>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={intensity}
                      onChange={(e) => setIntensity(Number(e.target.value))}
                      className={styles.slider}
                    />
                    <div className={styles.intensityLabels}>
                      <span>Mild</span>
                      <span>{intensity}</span>
                      <span>Intense</span>
                    </div>
                  </div>
                </div>

                <div className={styles.noteSection}>
                  <label className={styles.label}>Want to add a note? (optional)</label>
                  <textarea
                    className={styles.textarea}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="What's on your mind..."
                    rows={3}
                  />
                </div>

                <div className={styles.summary}>
                  <span className={styles.summaryEmoji}>{QUADRANT_EMOJIS[selectedQuadrant!]}</span>
                  <span className={styles.summaryText}>
                    {selectedFeelings.join(' & ')}
                  </span>
                </div>

                <div className={styles.actions}>
                  <Button variant="ghost" onClick={() => setStep(2)}>
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Saving...' : 'Save Check-in'}
                  </Button>
                </div>
              </div>
            )}

            {/* Progress Indicator */}
            <div className={styles.progress}>
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`${styles.progressDot} ${s === step ? styles.active : ''} ${s < step ? styles.completed : ''}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
