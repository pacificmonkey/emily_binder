import { useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { EventCard, AddEventModal, EventDetailModal } from '@/components/events'
import { useEventsForMonth } from '@/hooks/useEvents'
import type { Event } from '@/types/database'
import styles from './Calendar.module.css'

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
}

function isToday(year: number, month: number, day: number): boolean {
  const today = new Date()
  return today.getFullYear() === year &&
    today.getMonth() === month &&
    today.getDate() === day
}

export function Calendar() {
  const today = new Date()
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showAddEvent, setShowAddEvent] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)

  const { data: events = [], isLoading } = useEventsForMonth(currentYear, currentMonth)

  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const goToToday = () => {
    setCurrentYear(today.getFullYear())
    setCurrentMonth(today.getMonth())
    setSelectedDate(today)
  }

  const handleDayClick = (day: number) => {
    setSelectedDate(new Date(currentYear, currentMonth, day))
  }

  // Get events for a specific day
  const getEventsForDay = (day: number): Event[] => {
    const targetDate = new Date(currentYear, currentMonth, day)
    return events.filter(event => {
      const eventDate = new Date(event.starts_at)
      return isSameDay(eventDate, targetDate)
    })
  }

  // Get events for the selected date
  const selectedDayEvents = selectedDate
    ? events.filter(event => {
        const eventDate = new Date(event.starts_at)
        return isSameDay(eventDate, selectedDate)
      })
    : []

  // Generate calendar grid
  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDayOfMonth = getFirstDayOfMonth(currentYear, currentMonth)
  const calendarDays: (number | null)[] = []

  // Add empty cells for days before the first of the month
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null)
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day)
  }

  return (
    <AppLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Calendar</h1>
          <button
            className={styles.addButton}
            onClick={() => setShowAddEvent(true)}
          >
            + Add Event
          </button>
        </header>

        <div className={styles.calendarCard}>
          <div className={styles.calendarHeader}>
            <button className={styles.navButton} onClick={goToPreviousMonth}>
              &lt;
            </button>
            <h2 className={styles.monthYear}>
              {MONTHS[currentMonth]} {currentYear}
            </h2>
            <button className={styles.navButton} onClick={goToNextMonth}>
              &gt;
            </button>
          </div>

          <button className={styles.todayButton} onClick={goToToday}>
            Today
          </button>

          <div className={styles.calendarGrid}>
            {DAYS_OF_WEEK.map(day => (
              <div key={day} className={styles.dayHeader}>
                {day}
              </div>
            ))}

            {calendarDays.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className={styles.emptyCell} />
              }

              const dayEvents = getEventsForDay(day)
              const isSelected = selectedDate &&
                selectedDate.getDate() === day &&
                selectedDate.getMonth() === currentMonth &&
                selectedDate.getFullYear() === currentYear
              const isTodayDate = isToday(currentYear, currentMonth, day)

              return (
                <button
                  key={day}
                  className={`${styles.dayCell} ${isSelected ? styles.selected : ''} ${isTodayDate ? styles.today : ''}`}
                  onClick={() => handleDayClick(day)}
                >
                  <span className={styles.dayNumber}>{day}</span>
                  {dayEvents.length > 0 && (
                    <div className={styles.eventDots}>
                      {dayEvents.slice(0, 3).map((event) => (
                        <span
                          key={event.event_id}
                          className={styles.eventDot}
                          title={event.title}
                        />
                      ))}
                      {dayEvents.length > 3 && (
                        <span className={styles.moreDots}>+{dayEvents.length - 3}</span>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <div className={styles.eventsList}>
          <h3 className={styles.eventsHeader}>
            {selectedDate
              ? selectedDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })
              : 'Select a day to see events'}
          </h3>

          {isLoading ? (
            <div className={styles.loading}>Loading events...</div>
          ) : selectedDate && selectedDayEvents.length === 0 ? (
            <div className={styles.noEvents}>
              <p>No events for this day</p>
              <button
                className={styles.addEventButton}
                onClick={() => setShowAddEvent(true)}
              >
                Add an event
              </button>
            </div>
          ) : (
            <div className={styles.eventsGrid}>
              {selectedDayEvents.map(event => (
                <EventCard
                  key={event.event_id}
                  event={event}
                  onClick={() => setSelectedEvent(event)}
                />
              ))}
            </div>
          )}
        </div>

        <AddEventModal
          isOpen={showAddEvent}
          onClose={() => setShowAddEvent(false)}
          defaultDate={selectedDate || undefined}
        />

        <EventDetailModal
          event={selectedEvent}
          isOpen={selectedEvent !== null}
          onClose={() => setSelectedEvent(null)}
        />
      </div>
    </AppLayout>
  )
}
