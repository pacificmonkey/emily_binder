import { useState } from 'react'
import { Card, CardContent, Button, EmptyState, LoadingSpinner, ErrorCard, FloatingActionButton } from '@/components/ui'
import { AddEventModal, EditEventModal } from '@/components/calendar'
import { formatDate, getCanonicalNow, getWeekBounds } from '@/lib/timezone'
import { useEventsForDateRange } from '@/hooks/useEvents'
import { useProviders, useMedications } from '@/hooks/useHealth'
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns'
import { cn } from '@/lib/utils'
import type { Event, HealthProvider } from '@/types/database'
import styles from './Calendar.module.css'

type ViewMode = 'week' | 'month'

// Simplified medication type for event linking display
interface LinkedMedication {
  id: string
  name: string
}

interface EventItemProps {
  event: Event
  isExpanded: boolean
  onToggleExpand: () => void
  onEdit: () => void
  providers?: HealthProvider[]
  medications?: LinkedMedication[]
}

function EventItem({ event, isExpanded, onToggleExpand, onEdit, providers, medications }: EventItemProps) {
  const hasDescription = !!event.description_md
  const linkedProvider = providers?.find(p => p.id === event.health_provider_id)
  const linkedMedication = medications?.find(m => m.id === event.health_medication_id)
  const hasLocation = !!event.location
  const isLocationUrl = event.location?.startsWith('http://') || event.location?.startsWith('https://')

  return (
    <div className={styles.eventItem}>
      <div className={styles.eventTime}>
        {event.event_time ? format(new Date(`2000-01-01T${event.event_time}`), 'h:mm a') : 'All day'}
      </div>
      <div className={styles.eventContent}>
        <div className={styles.eventTitleRow}>
          <span className={styles.eventTitle}>{event.title}</span>
          <div className={styles.eventBadges}>
            {event.is_recurring && (
              <span className={styles.recurringBadge} title="Recurring event">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 2l4 4-4 4" />
                  <path d="M3 11v-1a4 4 0 014-4h14" />
                  <path d="M7 22l-4-4 4-4" />
                  <path d="M21 13v1a4 4 0 01-4 4H3" />
                </svg>
              </span>
            )}
            {event.is_mandatory && (
              <span className={styles.mandatoryBadge}>Required</span>
            )}
          </div>
        </div>

        {/* Event Metadata - location, provider, medication */}
        {(hasLocation || linkedProvider || linkedMedication) && (
          <div className={styles.eventMeta}>
            {hasLocation && (
              <div className={styles.eventMetaItem}>
                <svg className={styles.eventMetaIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {isLocationUrl ? (
                  <a href={event.location!} target="_blank" rel="noopener noreferrer" className={styles.eventMetaLink}>
                    Open link
                  </a>
                ) : (
                  <span>{event.location}</span>
                )}
              </div>
            )}
            {linkedProvider && (
              <div className={styles.eventMetaItem}>
                <svg className={styles.eventMetaIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>{linkedProvider.name}{linkedProvider.specialty_or_role ? ` (${linkedProvider.specialty_or_role})` : ''}</span>
              </div>
            )}
            {linkedMedication && (
              <div className={styles.eventMetaItem}>
                <svg className={styles.eventMetaIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.5 20.5L3.5 13.5a4.95 4.95 0 017-7l7 7a4.95 4.95 0 01-7 7z" />
                  <path d="M8.5 8.5l7 7" />
                </svg>
                <span>{linkedMedication.name}</span>
              </div>
            )}
          </div>
        )}

        {hasDescription && (
          <button
            className={styles.descriptionToggle}
            onClick={onToggleExpand}
            aria-expanded={isExpanded}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={isExpanded ? styles.chevronUp : styles.chevronDown}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
            <span>{isExpanded ? 'Hide details' : 'Show details'}</span>
          </button>
        )}
        {isExpanded && event.description_md && (
          <p className={styles.eventDescription}>{event.description_md}</p>
        )}
      </div>
      <button
        className={styles.editButton}
        onClick={onEdit}
        aria-label="Edit event"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>
    </div>
  )
}

export function CalendarPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [currentDate, setCurrentDate] = useState(getCanonicalNow())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())

  const { start: weekStart, end: weekEnd } = getWeekBounds(currentDate)
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Fetch events for the visible range
  const rangeStart = viewMode === 'week' ? weekStart : monthStart
  const rangeEnd = viewMode === 'week' ? weekEnd : monthEnd
  const { data: events, isLoading, error } = useEventsForDateRange(rangeStart, rangeEnd)

  // Fetch providers and medications for linking display
  const { data: providers } = useProviders()
  const { data: medications } = useMedications()

  // Pad the start to align with Monday
  const firstDayOfWeek = monthStart.getDay()
  const paddingStart = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1
  const paddedMonthDays = [
    ...Array(paddingStart).fill(null),
    ...monthDays,
  ]

  const today = getCanonicalNow()

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    if (!events) return []
    const dateStr = format(date, 'yyyy-MM-dd')
    return events.filter(e => e.event_date === dateStr)
  }

  // Events for selected date or today
  const displayDate = selectedDate || today
  const displayEvents = getEventsForDate(displayDate)

  const handleDayClick = (day: Date | null) => {
    if (day) {
      setSelectedDate(day)
    }
  }

  const handleAddEvent = () => {
    setShowAddModal(true)
  }

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event)
    setShowEditModal(true)
  }

  const handleToggleExpand = (eventId: string) => {
    setExpandedEvents(prev => {
      const next = new Set(prev)
      if (next.has(eventId)) {
        next.delete(eventId)
      } else {
        next.add(eventId)
      }
      return next
    })
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Calendar</h1>
        <div className={styles.viewToggle}>
          <button
            className={cn(styles.toggleButton, viewMode === 'week' && styles.active)}
            onClick={() => setViewMode('week')}
          >
            Week
          </button>
          <button
            className={cn(styles.toggleButton, viewMode === 'month' && styles.active)}
            onClick={() => setViewMode('month')}
          >
            Month
          </button>
        </div>
      </header>

      <div className={styles.monthNav}>
        <button
          className={styles.navButton}
          onClick={() => setCurrentDate(addDays(currentDate, viewMode === 'week' ? -7 : -30))}
          aria-label="Previous"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className={styles.monthLabel}>
          {formatDate(currentDate, viewMode === 'week' ? 'MMM d, yyyy' : 'MMMM yyyy')}
        </span>
        <button
          className={styles.navButton}
          onClick={() => setCurrentDate(addDays(currentDate, viewMode === 'week' ? 7 : 30))}
          aria-label="Next"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Error Display */}
      {error && <ErrorCard error={error} resourceName="events" />}

      {viewMode === 'week' ? (
        <Card>
          <CardContent>
            <div className={styles.weekGrid}>
              {weekDays.map((day) => {
                const dayEvents = getEventsForDate(day)
                const isSelected = selectedDate && isSameDay(day, selectedDate)
                return (
                  <button
                    key={day.toISOString()}
                    className={cn(
                      styles.weekDay,
                      isSameDay(day, today) && styles.today,
                      isSelected && styles.selected
                    )}
                    onClick={() => handleDayClick(day)}
                  >
                    <span className={styles.dayName}>{format(day, 'EEE')}</span>
                    <span className={styles.dayNumber}>{format(day, 'd')}</span>
                    {dayEvents.length > 0 && (
                      <span className={styles.eventDot} />
                    )}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <div className={styles.monthHeader}>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <span key={day} className={styles.monthDayName}>{day}</span>
              ))}
            </div>
            <div className={styles.monthGrid}>
              {paddedMonthDays.map((day, i) => {
                const dayEvents = day ? getEventsForDate(day) : []
                const isSelected = day && selectedDate && isSameDay(day, selectedDate)
                return (
                  <button
                    key={i}
                    className={cn(
                      styles.monthDay,
                      day && isSameDay(day, today) && styles.today,
                      day && !isSameMonth(day, currentDate) && styles.otherMonth,
                      isSelected && styles.selected
                    )}
                    onClick={() => handleDayClick(day)}
                    disabled={!day}
                  >
                    {day && (
                      <>
                        <span>{format(day, 'd')}</span>
                        {dayEvents.length > 0 && (
                          <span className={styles.eventDotSmall} />
                        )}
                      </>
                    )}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <section className={styles.eventsSection}>
        <div className={styles.eventsHeader}>
          <h2 className={styles.sectionTitle}>
            {format(displayDate, 'EEEE, MMM d')}
          </h2>
          <Button size="sm" onClick={handleAddEvent}>
            Add
          </Button>
        </div>

        {isLoading ? (
          <Card variant="outlined">
            <CardContent>
              <div className={styles.loadingContainer}>
                <LoadingSpinner size="sm" />
              </div>
            </CardContent>
          </Card>
        ) : displayEvents.length === 0 ? (
          <Card variant="outlined">
            <CardContent>
              <EmptyState
                icon={
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                }
                title="No events"
                description="Add events to see them here"
                action={<Button size="sm" onClick={handleAddEvent}>Add Event</Button>}
              />
            </CardContent>
          </Card>
        ) : (
          <Card variant="outlined">
            <CardContent>
              <div className={styles.eventsList}>
                {displayEvents.map(event => (
                  <EventItem
                    key={event.id}
                    event={event}
                    isExpanded={expandedEvents.has(event.id)}
                    onToggleExpand={() => handleToggleExpand(event.id)}
                    onEdit={() => handleEditEvent(event)}
                    providers={providers}
                    medications={medications}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Floating Add Button */}
      <FloatingActionButton onClick={handleAddEvent} aria-label="Add new event" />

      {/* Add Event Modal */}
      <AddEventModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        defaultDate={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined}
      />

      {/* Edit Event Modal */}
      <EditEventModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setEditingEvent(null)
        }}
        event={editingEvent}
      />
    </div>
  )
}
