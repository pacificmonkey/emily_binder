import { useState } from 'react'
import { Modal, Button, Input } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { useCreateEvent } from '@/hooks/useEvents'
import { useProviders, useMedications } from '@/hooks/useHealth'
import { useCategories } from '@/hooks/useCategories'
import { getCanonicalToday } from '@/lib/timezone'
import type { RecurrencePattern, Category } from '@/types/database'
import styles from './AddEventModal.module.css'

type LocationType = 'none' | 'address' | 'link'

interface AddEventModalProps {
  isOpen: boolean
  onClose: () => void
  defaultDate?: string // YYYY-MM-DD
}

const WEEKDAYS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
]

// Convert selected weekdays array to bitflags (bit 0 = Sunday, bit 6 = Saturday)
function weekdaysToBitflags(weekdays: number[]): number {
  return weekdays.reduce((flags, day) => flags | (1 << day), 0)
}

export function AddEventModal({ isOpen, onClose, defaultDate }: AddEventModalProps) {
  const { user } = useAuth()
  const createEvent = useCreateEvent()
  const { data: providers } = useProviders()
  const { data: medications } = useMedications()
  const { data: categories } = useCategories()

  // Form state
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [eventDate, setEventDate] = useState(defaultDate || getCanonicalToday())
  const [eventTime, setEventTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [description, setDescription] = useState('')
  const [isMandatory, setIsMandatory] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Location state
  const [locationType, setLocationType] = useState<LocationType>('none')
  const [location, setLocation] = useState('')

  // Provider/Medication state
  const [selectedProviderId, setSelectedProviderId] = useState('')
  const [selectedMedicationId, setSelectedMedicationId] = useState('')

  // Recurring event state
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern>('weekly')
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([])
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('')

  const resetForm = () => {
    setTitle('')
    setCategoryId(null)
    setEventDate(defaultDate || getCanonicalToday())
    setEventTime('')
    setEndTime('')
    setDescription('')
    setIsMandatory(false)
    setLocationType('none')
    setLocation('')
    setSelectedProviderId('')
    setSelectedMedicationId('')
    setIsRecurring(false)
    setRecurrencePattern('weekly')
    setSelectedWeekdays([])
    setRecurrenceEndDate('')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = async () => {
    if (!user || !title.trim()) return

    setIsSubmitting(true)
    try {
      await createEvent.mutateAsync({
        owner_user_id: user.id,
        created_by_user_id: user.id,
        title: title.trim(),
        description_md: description.trim() || null,
        location: locationType !== 'none' && location.trim() ? location.trim() : null,
        event_date: eventDate,
        event_time: eventTime || null,
        end_time: endTime || null,
        is_mandatory: isMandatory,
        category_id: categoryId,
        is_recurring: isRecurring,
        recurrence_pattern: isRecurring ? recurrencePattern : null,
        weekday_flags: isRecurring && recurrencePattern === 'specific_weekdays'
          ? weekdaysToBitflags(selectedWeekdays)
          : null,
        recurrence_end_date: isRecurring && recurrenceEndDate ? recurrenceEndDate : null,
        health_provider_id: selectedProviderId || null,
        health_medication_id: selectedMedicationId || null,
      })

      handleClose()
    } catch (error) {
      console.error('Failed to create event:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleWeekday = (day: number) => {
    setSelectedWeekdays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  const canSubmit = title.trim().length > 0 && eventDate && categoryId &&
    (!isRecurring || recurrencePattern !== 'specific_weekdays' || selectedWeekdays.length > 0)

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Event">
      <div className={styles.content}>
        <div className={styles.field}>
          <label className={styles.label}>Event title</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What's happening?"
            autoFocus
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Category (for VP)</label>
          <div className={styles.categoryGrid}>
            {categories?.map((category: Category) => (
              <button
                key={category.id}
                type="button"
                className={`${styles.categoryCard} ${categoryId === category.id ? styles.categorySelected : ''}`}
                onClick={() => setCategoryId(category.id)}
              >
                <span className={styles.categoryIcon}>{category.icon}</span>
                <span className={styles.categoryName}>{category.name}</span>
                <span className={styles.categoryVp}>{category.vp_value} VP</span>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>Date</label>
            <Input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Time (optional)</label>
            <Input
              type="time"
              value={eventTime}
              onChange={(e) => setEventTime(e.target.value)}
            />
          </div>
        </div>

        {eventTime && (
          <div className={styles.field}>
            <label className={styles.label}>End time (optional)</label>
            <Input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              min={eventTime}
            />
          </div>
        )}

        <div className={styles.field}>
          <label className={styles.label}>Description (optional)</label>
          <textarea
            className={styles.textarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add any details..."
            rows={3}
          />
        </div>

        {/* Location Section */}
        <div className={styles.field}>
          <label className={styles.label}>Location (optional)</label>
          <div className={styles.locationTypeToggle}>
            <button
              type="button"
              className={`${styles.locationTypeButton} ${locationType === 'none' ? styles.locationTypeSelected : ''}`}
              onClick={() => { setLocationType('none'); setLocation(''); }}
            >
              None
            </button>
            <button
              type="button"
              className={`${styles.locationTypeButton} ${locationType === 'address' ? styles.locationTypeSelected : ''}`}
              onClick={() => setLocationType('address')}
            >
              Address
            </button>
            <button
              type="button"
              className={`${styles.locationTypeButton} ${locationType === 'link' ? styles.locationTypeSelected : ''}`}
              onClick={() => setLocationType('link')}
            >
              Link
            </button>
          </div>
          {locationType !== 'none' && (
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={locationType === 'address' ? '123 Main St, City, State' : 'https://...'}
              type={locationType === 'link' ? 'url' : 'text'}
            />
          )}
        </div>

        {/* Provider/Medication Linking */}
        {(providers && providers.length > 0) && (
          <div className={styles.field}>
            <label className={styles.label}>Link to provider (optional)</label>
            <select
              className={styles.select}
              value={selectedProviderId}
              onChange={(e) => setSelectedProviderId(e.target.value)}
            >
              <option value="">None</option>
              {providers.map(provider => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}{provider.specialty_or_role ? ` (${provider.specialty_or_role})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {(medications && medications.length > 0) && (
          <div className={styles.field}>
            <label className={styles.label}>Link to medication (optional)</label>
            <select
              className={styles.select}
              value={selectedMedicationId}
              onChange={(e) => setSelectedMedicationId(e.target.value)}
            >
              <option value="">None</option>
              {medications.map(med => (
                <option key={med.id} value={med.id}>{med.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className={styles.checkboxField}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={isMandatory}
              onChange={(e) => setIsMandatory(e.target.checked)}
              className={styles.checkbox}
            />
            <span>Mandatory event</span>
          </label>
          <p className={styles.checkboxHint}>
            Mandatory events award extra VP when completed
          </p>
        </div>

        {/* Recurring Event Options */}
        <div className={styles.checkboxField}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className={styles.checkbox}
            />
            <span>Repeat this event</span>
          </label>
        </div>

        {isRecurring && (
          <div className={styles.recurringOptions}>
            <div className={styles.field}>
              <label className={styles.label}>Repeats</label>
              <select
                className={styles.select}
                value={recurrencePattern}
                onChange={(e) => setRecurrencePattern(e.target.value as RecurrencePattern)}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="specific_weekdays">Specific days</option>
              </select>
            </div>

            {recurrencePattern === 'specific_weekdays' && (
              <div className={styles.field}>
                <label className={styles.label}>Select days</label>
                <div className={styles.weekdayPicker}>
                  {WEEKDAYS.map(day => (
                    <button
                      key={day.value}
                      type="button"
                      className={`${styles.weekdayButton} ${
                        selectedWeekdays.includes(day.value) ? styles.weekdaySelected : ''
                      }`}
                      onClick={() => toggleWeekday(day.value)}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.field}>
              <label className={styles.label}>End date (optional)</label>
              <Input
                type="date"
                value={recurrenceEndDate}
                onChange={(e) => setRecurrenceEndDate(e.target.value)}
                min={eventDate}
              />
              <p className={styles.checkboxHint}>
                Leave empty to repeat indefinitely
              </p>
            </div>
          </div>
        )}

        <div className={styles.actions}>
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Event'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
