import { useState } from 'react'
import { Modal, Button, Input } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { useCategories } from '@/hooks/useCategories'
import { useCreateMission } from '@/hooks/useMissions'
import { getCanonicalToday, formatDate, getWeekBounds } from '@/lib/timezone'
import type { Category } from '@/types/database'
import styles from './AddMissionModal.module.css'

type WhenOption = 'today' | 'another_day' | 'this_week' | 'recurring'
type RecurrenceType = 'daily' | 'weekly' | 'specific_weekdays'

interface AddMissionModalProps {
  isOpen: boolean
  onClose: () => void
  defaultDate?: string  // Optional date to pre-select (for future date navigation)
  onMissionCreated?: (missionId: string) => void  // Called after mission is created, with the new mission's ID
}

export function AddMissionModal({ isOpen, onClose, defaultDate, onMissionCreated }: AddMissionModalProps) {
  const { user } = useAuth()
  const { data: categories, isLoading: categoriesLoading } = useCategories()
  const createMission = useCreateMission()

  // Check if defaultDate is in the future
  const todayStr = getCanonicalToday()
  const isDefaultFuture = defaultDate && defaultDate > todayStr

  // Form state
  const [step, setStep] = useState(1)
  const [title, setTitle] = useState('')
  const [whenOption, setWhenOption] = useState<WhenOption | null>(isDefaultFuture ? 'another_day' : null)
  const [selectedDate, setSelectedDate] = useState(defaultDate ?? todayStr)
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('daily')
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([])
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [instructions, setInstructions] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const resetForm = () => {
    setStep(1)
    setTitle('')
    // Reset to default values based on whether defaultDate was provided
    setWhenOption(isDefaultFuture ? 'another_day' : null)
    setSelectedDate(defaultDate ?? todayStr)
    setRecurrenceType('daily')
    setSelectedWeekdays([])
    setCategoryId(null)
    setInstructions('')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = async () => {
    if (!user || !categoryId || !whenOption) return

    setIsSubmitting(true)
    try {
      const { start: weekStart } = getWeekBounds(new Date())

      const newMission = await createMission.mutateAsync({
        owner_user_id: user.id,
        created_by_user_id: user.id,
        title,
        instructions_md: instructions || null,
        category_id: categoryId,
        mission_type: whenOption === 'recurring' ? 'recurring' : 'one_time',
        one_time_assignment:
          whenOption === 'today' || whenOption === 'another_day'
            ? 'day_assigned'
            : whenOption === 'this_week'
            ? 'week_assigned'
            : null,
        due_date:
          whenOption === 'today'
            ? getCanonicalToday()
            : whenOption === 'another_day'
            ? selectedDate
            : null,
        week_start_date:
          whenOption === 'this_week' ? formatDate(weekStart, 'yyyy-MM-dd') : null,
        recurrence_pattern: whenOption === 'recurring' ? recurrenceType : null,
        weekdays:
          whenOption === 'recurring' && recurrenceType === 'specific_weekdays'
            ? selectedWeekdays
            : null,
      })

      // Call the callback with the new mission ID if provided
      if (onMissionCreated && newMission) {
        onMissionCreated(newMission.id)
      }

      handleClose()
    } catch (error) {
      console.error('Failed to create mission:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const canProceedStep1 = title.trim().length > 0
  const canProceedStep2 = whenOption !== null && (
    whenOption !== 'another_day' || selectedDate !== ''
  ) && (
    whenOption !== 'recurring' ||
    recurrenceType !== 'specific_weekdays' ||
    selectedWeekdays.length > 0
  )
  const canProceedStep3 = categoryId !== null

  const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Mission">
      <div className={styles.content}>
        {/* Step 1: Title */}
        {step === 1 && (
          <div className={styles.step}>
            <label className={styles.label}>What do you need to do?</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter mission title..."
              autoFocus
              className={styles.titleInput}
            />
            <div className={styles.actions}>
              <Button variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={() => setStep(2)}
                disabled={!canProceedStep1}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: When */}
        {step === 2 && (
          <div className={styles.step}>
            <label className={styles.label}>When should this be done?</label>
            <div className={styles.optionGrid}>
              <button
                className={`${styles.optionCard} ${whenOption === 'today' ? styles.selected : ''}`}
                onClick={() => setWhenOption('today')}
              >
                <span className={styles.optionIcon}>📅</span>
                <span className={styles.optionLabel}>Today</span>
              </button>
              <button
                className={`${styles.optionCard} ${whenOption === 'another_day' ? styles.selected : ''}`}
                onClick={() => setWhenOption('another_day')}
              >
                <span className={styles.optionIcon}>📆</span>
                <span className={styles.optionLabel}>Another Day</span>
              </button>
              <button
                className={`${styles.optionCard} ${whenOption === 'this_week' ? styles.selected : ''}`}
                onClick={() => setWhenOption('this_week')}
              >
                <span className={styles.optionIcon}>🗓️</span>
                <span className={styles.optionLabel}>This Week</span>
              </button>
              <button
                className={`${styles.optionCard} ${whenOption === 'recurring' ? styles.selected : ''}`}
                onClick={() => setWhenOption('recurring')}
              >
                <span className={styles.optionIcon}>🔄</span>
                <span className={styles.optionLabel}>Recurring</span>
              </button>
            </div>

            {/* Date picker for "Another Day" */}
            {whenOption === 'another_day' && (
              <div className={styles.subOption}>
                <label className={styles.subLabel}>Select date:</label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={getCanonicalToday()}
                />
              </div>
            )}

            {/* Recurrence options */}
            {whenOption === 'recurring' && (
              <div className={styles.subOption}>
                <label className={styles.subLabel}>How often?</label>
                <div className={styles.recurrenceOptions}>
                  <button
                    className={`${styles.recurrenceBtn} ${recurrenceType === 'daily' ? styles.selected : ''}`}
                    onClick={() => setRecurrenceType('daily')}
                  >
                    Daily
                  </button>
                  <button
                    className={`${styles.recurrenceBtn} ${recurrenceType === 'weekly' ? styles.selected : ''}`}
                    onClick={() => setRecurrenceType('weekly')}
                  >
                    Weekly
                  </button>
                  <button
                    className={`${styles.recurrenceBtn} ${recurrenceType === 'specific_weekdays' ? styles.selected : ''}`}
                    onClick={() => setRecurrenceType('specific_weekdays')}
                  >
                    Specific Days
                  </button>
                </div>

                {recurrenceType === 'specific_weekdays' && (
                  <div className={styles.weekdayPicker}>
                    {weekdayLabels.map((day, index) => (
                      <button
                        key={day}
                        className={`${styles.weekdayBtn} ${selectedWeekdays.includes(index) ? styles.selected : ''}`}
                        onClick={() => {
                          setSelectedWeekdays(prev =>
                            prev.includes(index)
                              ? prev.filter(d => d !== index)
                              : [...prev, index]
                          )
                        }}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className={styles.actions}>
              <Button variant="ghost" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!canProceedStep2}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Category */}
        {step === 3 && (
          <div className={styles.step}>
            <label className={styles.label}>What type of mission is this?</label>
            {categoriesLoading ? (
              <p className={styles.loading}>Loading categories...</p>
            ) : (
              <div className={styles.categoryGrid}>
                {categories?.map((category: Category) => (
                  <button
                    key={category.id}
                    className={`${styles.categoryCard} ${categoryId === category.id ? styles.selected : ''}`}
                    onClick={() => setCategoryId(category.id)}
                  >
                    <span className={styles.categoryName}>{category.name}</span>
                    <span className={styles.categoryVp}>{category.vp_value} VP</span>
                  </button>
                ))}
              </div>
            )}

            <div className={styles.actions}>
              <Button variant="ghost" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                onClick={() => setStep(4)}
                disabled={!canProceedStep3}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Optional Details */}
        {step === 4 && (
          <div className={styles.step}>
            <label className={styles.label}>Any additional details? (optional)</label>
            <textarea
              className={styles.textarea}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Add instructions, notes, or steps..."
              rows={4}
            />

            <div className={styles.summary}>
              <h4 className={styles.summaryTitle}>Mission Summary</h4>
              <p className={styles.summaryItem}>
                <strong>Title:</strong> {title}
              </p>
              <p className={styles.summaryItem}>
                <strong>When:</strong>{' '}
                {whenOption === 'today' && 'Today'}
                {whenOption === 'another_day' && formatDate(selectedDate, 'MMM d, yyyy')}
                {whenOption === 'this_week' && 'This Week'}
                {whenOption === 'recurring' && (
                  recurrenceType === 'daily' ? 'Every day' :
                  recurrenceType === 'weekly' ? 'Every week' :
                  `On ${selectedWeekdays.map(d => weekdayLabels[d]).join(', ')}`
                )}
              </p>
              <p className={styles.summaryItem}>
                <strong>Category:</strong>{' '}
                {categories?.find((c: Category) => c.id === categoryId)?.name}
              </p>
            </div>

            <div className={styles.actions}>
              <Button variant="ghost" onClick={() => setStep(3)}>
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating...' : 'Create Mission'}
              </Button>
            </div>
          </div>
        )}

        {/* Progress Indicator */}
        <div className={styles.progress}>
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`${styles.progressDot} ${s === step ? styles.active : ''} ${s < step ? styles.completed : ''}`}
            />
          ))}
        </div>
      </div>
    </Modal>
  )
}
