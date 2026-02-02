import { useState, useMemo, useRef } from 'react'
import { addDays, subDays, isSameDay, startOfDay, parseISO } from 'date-fns'
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent, EmptyState, Button, FloatingActionButton } from '@/components/ui'
import { AddMissionModal, MissionStepChecklist, SnoozeButton } from '@/components/missions'
import { MissionCardSkeleton } from '@/components/skeletons'
import { MoodCheckinModal, MoodHistory } from '@/components/mood'
import { formatDate, getCanonicalNow } from '@/lib/timezone'
import { useAuth } from '@/contexts/AuthContext'
import {
  useTodayMissions,
  useThisWeekMissions,
  useMissionsForDate,
  useWeekMissionsForDate,
  useCompleteMission,
  useUncompleteMission,
  useReorderMissions,
  useToggleMissionStep,
  useSnoozeMission,
} from '@/hooks/useMissions'
import {
  useTodayEvents,
  useEventsForDate,
  useCompleteEvent,
  useUncompleteEvent,
} from '@/hooks/useEvents'
import { useMoodCheckinStatus } from '@/hooks/useMood'
import { useEconomyDisplay } from '@/hooks/useEconomy'
import { useTopStreaks, useGraceTokens } from '@/hooks/useStreaks'
import type { TodayMission } from '@/services/missions'
import type { TodayEvent } from '@/services/events'
import styles from './Today.module.css'

interface SortableMissionItemProps {
  mission: TodayMission
  currentUserId: string
  isExpanded: boolean
  onComplete: (mission: TodayMission) => void
  onUncomplete: (mission: TodayMission) => void
  onToggleExpand: () => void
  onToggleStep: (stepId: string, completed: boolean) => void
  onSnooze: (until: Date) => void
}

function SortableMissionItem({
  mission,
  currentUserId,
  isExpanded,
  onComplete,
  onUncomplete,
  onToggleExpand,
  onToggleStep,
  onSnooze,
}: SortableMissionItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: mission.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const hasSteps = mission.steps && mission.steps.length > 0
  const completedSteps = mission.steps?.filter(s => s.completed).length ?? 0

  return (
    <div ref={setNodeRef} style={style} className={styles.missionItem}>
      {/* Drag Handle */}
      <button
        className={styles.dragHandle}
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="5" cy="5" r="2" />
          <circle cx="12" cy="5" r="2" />
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="5" cy="19" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>

      {/* Checkbox */}
      <button
        className={`${styles.checkbox} ${mission.isCompleted ? styles.checked : ''}`}
        onClick={() => mission.isCompleted ? onUncomplete(mission) : onComplete(mission)}
        aria-label={mission.isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
      >
        {mission.isCompleted && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M5 12l5 5L20 7" />
          </svg>
        )}
      </button>

      {/* Mission Content */}
      <div className={styles.missionContent}>
        <div className={styles.missionHeader}>
          <div className={styles.missionTitleRow}>
            <span className={`${styles.missionTitle} ${mission.isCompleted ? styles.completed : ''}`}>
              {mission.title}
            </span>
            {hasSteps && (
              <button
                className={styles.expandBtn}
                onClick={onToggleExpand}
                aria-expanded={isExpanded}
                aria-label={isExpanded ? 'Collapse steps' : 'Expand steps'}
              >
                <span className={styles.stepBadge}>{completedSteps}/{mission.steps.length}</span>
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
              </button>
            )}
          </div>
          <span className={styles.missionCategory}>
            {mission.category?.name} • {mission.category?.vp_value} VP
          </span>
        </div>

        {/* Step Checklist */}
        {hasSteps && (
          <MissionStepChecklist
            missionId={mission.id}
            steps={mission.steps}
            onToggleStep={onToggleStep}
            isExpanded={isExpanded}
          />
        )}
      </div>

      {/* Snooze Button */}
      {!mission.isCompleted && (
        <SnoozeButton
          missionOwnerId={mission.owner_user_id}
          currentUserId={currentUserId}
          isSnoozable={mission.is_snoozable ?? false}
          onSnooze={onSnooze}
        />
      )}
    </div>
  )
}

// Read-only mission item for past/future dates
interface ReadOnlyMissionItemProps {
  mission: TodayMission
  isPast: boolean
}

function ReadOnlyMissionItem({ mission, isPast }: ReadOnlyMissionItemProps) {
  const hasSteps = mission.steps && mission.steps.length > 0
  const completedSteps = mission.steps?.filter(s => s.completed).length ?? 0

  return (
    <div className={`${styles.missionItem} ${styles.readOnly}`}>
      {/* Static checkbox (disabled) */}
      <div className={`${styles.checkbox} ${mission.isCompleted ? styles.checked : ''} ${styles.disabled}`}>
        {mission.isCompleted && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M5 12l5 5L20 7" />
          </svg>
        )}
      </div>

      {/* Mission Content */}
      <div className={styles.missionContent}>
        <div className={styles.missionHeader}>
          <div className={styles.missionTitleRow}>
            <span className={`${styles.missionTitle} ${mission.isCompleted ? styles.completed : ''}`}>
              {mission.title}
            </span>
            {hasSteps && (
              <span className={styles.stepBadge}>{completedSteps}/{mission.steps.length}</span>
            )}
          </div>
          <span className={styles.missionCategory}>
            {mission.category?.name} • {mission.category?.vp_value} VP
            {isPast && mission.isCompleted && ' • Completed'}
          </span>
        </div>
      </div>
    </div>
  )
}

// Event item component
interface EventItemProps {
  event: TodayEvent
  onComplete: (event: TodayEvent) => void
  onUncomplete: (event: TodayEvent) => void
}

function EventItem({ event, onComplete, onUncomplete }: EventItemProps) {
  const vpValue = event.vpCategory?.vp_value ?? 10

  return (
    <div className={styles.missionItem}>
      {/* Event type icon instead of drag handle */}
      <div className={styles.eventIcon}>
        {event.category === 'medication' && '💊'}
        {event.category === 'appointment' && '🏥'}
        {event.category === 'refill' && '📦'}
        {event.category === 'general' && '📅'}
      </div>

      {/* Checkbox */}
      <button
        className={`${styles.checkbox} ${event.isCompleted ? styles.checked : ''}`}
        onClick={() => event.isCompleted ? onUncomplete(event) : onComplete(event)}
        aria-label={event.isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
      >
        {event.isCompleted && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M5 12l5 5L20 7" />
          </svg>
        )}
      </button>

      {/* Event Content */}
      <div className={styles.missionContent}>
        <div className={styles.missionHeader}>
          <span className={`${styles.missionTitle} ${event.isCompleted ? styles.completed : ''}`}>
            {event.title}
          </span>
          <span className={styles.missionCategory}>
            {event.event_time && formatDate(parseISO(`2000-01-01T${event.event_time}`), 'h:mm a')}
            {event.event_time && ' • '}
            {event.vpCategory?.name ?? 'Event'} • {vpValue} VP
            {event.is_mandatory && ' • Required'}
          </span>
        </div>
      </div>
    </div>
  )
}

// Read-only event item for past dates
interface ReadOnlyEventItemProps {
  event: TodayEvent
}

function ReadOnlyEventItem({ event }: ReadOnlyEventItemProps) {
  const vpValue = event.vpCategory?.vp_value ?? 10

  return (
    <div className={`${styles.missionItem} ${styles.readOnly}`}>
      {/* Event type icon */}
      <div className={styles.eventIcon}>
        {event.category === 'medication' && '💊'}
        {event.category === 'appointment' && '🏥'}
        {event.category === 'refill' && '📦'}
        {event.category === 'general' && '📅'}
      </div>

      {/* Static checkbox (disabled) */}
      <div className={`${styles.checkbox} ${event.isCompleted ? styles.checked : ''} ${styles.disabled}`}>
        {event.isCompleted && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M5 12l5 5L20 7" />
          </svg>
        )}
      </div>

      {/* Event Content */}
      <div className={styles.missionContent}>
        <div className={styles.missionHeader}>
          <span className={`${styles.missionTitle} ${event.isCompleted ? styles.completed : ''}`}>
            {event.title}
          </span>
          <span className={styles.missionCategory}>
            {event.event_time && formatDate(parseISO(`2000-01-01T${event.event_time}`), 'h:mm a')}
            {event.event_time && ' • '}
            {event.vpCategory?.name ?? 'Event'} • {vpValue} VP
            {event.isCompleted && ' • Completed'}
          </span>
        </div>
      </div>
    </div>
  )
}

export function TodayPage() {
  const now = getCanonicalNow()
  const todayStart = startOfDay(now)
  const { user } = useAuth()

  // Date navigation state
  const [selectedDate, setSelectedDate] = useState(todayStart)
  const selectedDateStr = formatDate(selectedDate, 'yyyy-MM-dd')

  // Date boundaries: 1 month past, 2 months future
  const oneMonthAgo = subDays(todayStart, 30)
  const twoMonthsAhead = addDays(todayStart, 60)

  // View mode determination
  const isToday = isSameDay(selectedDate, todayStart)
  const isPast = selectedDate < todayStart && !isToday
  const isFuture = selectedDate > todayStart

  // Other UI state
  const [showAllWeek, setShowAllWeek] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showMoodModal, setShowMoodModal] = useState(false)
  const [expandedMissions, setExpandedMissions] = useState<Set<string>>(new Set())

  // Data fetching - use date-based hooks when not today
  const { data: todayMissionsData, isLoading: todayLoadingData } = useTodayMissions()
  const { data: dateMissionsData, isLoading: dateLoadingData } = useMissionsForDate(selectedDateStr)
  const { data: thisWeekMissionsData, isLoading: thisWeekLoadingData } = useThisWeekMissions()
  const { data: dateWeekMissionsData, isLoading: dateWeekLoadingData } = useWeekMissionsForDate(selectedDateStr)

  // Use today's data when isToday, otherwise use date-specific data
  const todayMissions = isToday ? todayMissionsData : dateMissionsData
  const todayLoading = isToday ? todayLoadingData : dateLoadingData
  const weekMissions = isToday ? thisWeekMissionsData : dateWeekMissionsData
  const weekLoading = isToday ? thisWeekLoadingData : dateWeekLoadingData

  // Events data fetching
  const { data: todayEventsData, isLoading: todayEventsLoading } = useTodayEvents()
  const { data: dateEventsData, isLoading: dateEventsLoading } = useEventsForDate(selectedDateStr)

  // Use today's events when isToday, otherwise use date-specific events
  const events = isToday ? todayEventsData : dateEventsData
  const eventsLoading = isToday ? todayEventsLoading : dateEventsLoading

  const { data: moodStatus } = useMoodCheckinStatus()
  const { dailyWin } = useEconomyDisplay()
  const { data: topStreaks } = useTopStreaks(3)
  const { data: graceTokens } = useGraceTokens()

  // Mutations
  const completeMission = useCompleteMission()
  const uncompleteMission = useUncompleteMission()
  const reorderMissions = useReorderMissions()
  const toggleStep = useToggleMissionStep()
  const snoozeMission = useSnoozeMission()
  const completeEvent = useCompleteEvent()
  const uncompleteEvent = useUncompleteEvent()

  // Navigation handlers
  const canGoBack = selectedDate > oneMonthAgo
  const canGoForward = selectedDate < twoMonthsAhead

  const goToPreviousDay = () => {
    if (canGoBack) {
      setSelectedDate(prev => subDays(prev, 1))
    }
  }

  const goToNextDay = () => {
    if (canGoForward) {
      setSelectedDate(prev => addDays(prev, 1))
    }
  }

  const goToToday = () => {
    setSelectedDate(todayStart)
  }

  // Date picker ref and handler
  const dateInputRef = useRef<HTMLInputElement>(null)

  const openDatePicker = () => {
    dateInputRef.current?.showPicker()
  }

  const handleDatePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateStr = e.target.value
    if (dateStr) {
      const newDate = parseISO(dateStr)
      // Constrain to allowed range
      if (newDate >= oneMonthAgo && newDate <= twoMonthsAhead) {
        setSelectedDate(startOfDay(newDate))
      }
    }
  }

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const handleCompleteMission = (mission: TodayMission) => {
    completeMission.mutate({
      missionId: mission.id,
      vpValue: mission.category?.vp_value ?? 1,
    })
  }

  const handleUncompleteMission = (mission: TodayMission) => {
    if (!mission.completion) return
    uncompleteMission.mutate({
      missionId: mission.id,
      completionDate: mission.completion.completion_date,
      vpValue: mission.completion.vp_awarded,
    })
  }

  const handleToggleExpand = (missionId: string) => {
    setExpandedMissions(prev => {
      const next = new Set(prev)
      if (next.has(missionId)) {
        next.delete(missionId)
      } else {
        next.add(missionId)
      }
      return next
    })
  }

  const handleToggleStep = (missionId: string, stepId: string, completed: boolean) => {
    toggleStep.mutate({ missionId, stepId, completed })
  }

  const handleSnooze = (missionId: string, until: Date) => {
    snoozeMission.mutate({ id: missionId, until })
  }

  const handleCompleteEvent = (event: TodayEvent) => {
    const vpValue = event.vpCategory?.vp_value ?? 10
    completeEvent.mutate({
      eventId: event.id,
      vpValue,
    })
  }

  const handleUncompleteEvent = (event: TodayEvent) => {
    const vpValue = event.completion?.vp_awarded ?? event.vpCategory?.vp_value ?? 10
    uncompleteEvent.mutate({
      eventId: event.id,
      vpValue,
    })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id || !todayMissions) return

    const oldIndex = todayMissions.findIndex(m => m.id === active.id)
    const newIndex = todayMissions.findIndex(m => m.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    // Create new order
    const newMissions = [...todayMissions]
    const [removed] = newMissions.splice(oldIndex, 1)
    newMissions.splice(newIndex, 0, removed)

    // Update database with new order
    reorderMissions.mutate(newMissions.map(m => m.id))
  }

  // Memoized values
  const missionIds = useMemo(
    () => todayMissions?.map(m => m.id) ?? [],
    [todayMissions]
  )

  // Filter week missions to show
  const visibleWeekMissions = showAllWeek
    ? weekMissions
    : weekMissions?.slice(0, 3)

  const completedTodayCount = todayMissions?.filter(m => m.isCompleted).length ?? 0

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Mission Log</h1>

        {/* Date Navigator */}
        <div className={styles.dateNavigator}>
          <button
            className={styles.navButton}
            onClick={goToPreviousDay}
            disabled={!canGoBack}
            aria-label="Previous day"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <div className={styles.dateCenter}>
            <button
              className={styles.dateButton}
              onClick={goToToday}
              disabled={isToday}
            >
              <span className={styles.dateLabel}>
                {isToday ? 'Today' : formatDate(selectedDate, 'EEE, MMM d')}
              </span>
              {!isToday && <span className={styles.todayHint}>Tap for today</span>}
            </button>

            <button
              className={styles.calendarButton}
              onClick={openDatePicker}
              aria-label="Open date picker"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </button>

            {/* Hidden date input for native picker */}
            <input
              ref={dateInputRef}
              type="date"
              className={styles.hiddenDateInput}
              value={selectedDateStr}
              onChange={handleDatePickerChange}
              min={formatDate(oneMonthAgo, 'yyyy-MM-dd')}
              max={formatDate(twoMonthsAhead, 'yyyy-MM-dd')}
              tabIndex={-1}
            />
          </div>

          <button
            className={styles.navButton}
            onClick={goToNextDay}
            disabled={!canGoForward}
            aria-label="Next day"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {/* View Mode Badge */}
        {isPast && (
          <div className={styles.viewModeBadge}>
            <span>Viewing history (read-only)</span>
          </div>
        )}
        {isFuture && (
          <div className={styles.viewModeBadge}>
            <span>Planning ahead</span>
          </div>
        )}
      </header>

      {/* Daily Win Progress */}
      {dailyWin && (
        <div className={styles.dailyWinBar}>
          <div className={styles.dailyWinLabel}>
            <span>Daily Win</span>
            <span>{dailyWin.vpEarnedToday}/{dailyWin.threshold} VP</span>
          </div>
          <div className={styles.progressTrack}>
            <div
              className={`${styles.progressFill} ${dailyWin.achieved ? styles.achieved : ''}`}
              style={{ width: `${dailyWin.percentComplete}%` }}
            />
          </div>
        </div>
      )}

      {/* Today's Tasks */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            {isToday ? 'Today' : formatDate(selectedDate, 'EEEE')}
          </h2>
          {todayMissions && todayMissions.length > 0 && (
            <span className={styles.taskCount}>
              {completedTodayCount}/{todayMissions.length}
            </span>
          )}
        </div>

        {todayLoading ? (
          <Card>
            <CardContent>
              <MissionCardSkeleton count={3} />
            </CardContent>
          </Card>
        ) : !todayMissions || todayMissions.length === 0 ? (
          <Card>
            <CardContent>
              <EmptyState
                icon={
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M9 11l3 3L22 4" />
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </svg>
                }
                title={isPast ? 'No missions were scheduled' : 'No missions scheduled'}
                description={
                  isPast
                    ? 'Nothing was planned for this day'
                    : isFuture
                      ? 'Tap + to add a mission for this day'
                      : 'Tap the + button to add your first mission'
                }
                action={
                  !isPast && (
                    <Button size="sm" onClick={() => setShowAddModal(true)}>
                      Add Mission
                    </Button>
                  )
                }
              />
            </CardContent>
          </Card>
        ) : isPast || isFuture ? (
          // Read-only view for past dates, planning view for future
          <Card>
            <CardContent className={styles.missionList}>
              {todayMissions.map(mission => (
                <ReadOnlyMissionItem
                  key={mission.id}
                  mission={mission}
                  isPast={isPast}
                />
              ))}
            </CardContent>
          </Card>
        ) : (
          // Full interactive view for today
          <Card>
            <CardContent className={styles.missionList}>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={missionIds} strategy={verticalListSortingStrategy}>
                  {todayMissions.map(mission => (
                    <SortableMissionItem
                      key={mission.id}
                      mission={mission}
                      currentUserId={user?.id ?? ''}
                      isExpanded={expandedMissions.has(mission.id)}
                      onComplete={handleCompleteMission}
                      onUncomplete={handleUncompleteMission}
                      onToggleExpand={() => handleToggleExpand(mission.id)}
                      onToggleStep={(stepId, completed) => handleToggleStep(mission.id, stepId, completed)}
                      onSnooze={(until) => handleSnooze(mission.id, until)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Events Section */}
      {(eventsLoading || (events && events.length > 0)) && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Events</h2>
            {events && events.length > 0 && (
              <span className={styles.taskCount}>
                {events.filter(e => e.isCompleted).length}/{events.length}
              </span>
            )}
          </div>

          {eventsLoading ? (
            <Card>
              <CardContent>
                <MissionCardSkeleton count={2} />
              </CardContent>
            </Card>
          ) : isPast ? (
            // Read-only view for past dates
            <Card>
              <CardContent className={styles.missionList}>
                {events?.map(event => (
                  <ReadOnlyEventItem
                    key={event.id}
                    event={event}
                  />
                ))}
              </CardContent>
            </Card>
          ) : (
            // Interactive view for today and future
            <Card>
              <CardContent className={styles.missionList}>
                {events?.map(event => (
                  <EventItem
                    key={event.id}
                    event={event}
                    onComplete={handleCompleteEvent}
                    onUncomplete={handleUncompleteEvent}
                  />
                ))}
              </CardContent>
            </Card>
          )}
        </section>
      )}

      {/* This Week Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            {isToday ? 'This Week' : `Week of ${formatDate(selectedDate, 'MMM d')}`}
          </h2>
          {weekMissions && weekMissions.length > 3 && (
            <button
              className={styles.showMore}
              onClick={() => setShowAllWeek(!showAllWeek)}
            >
              {showAllWeek ? 'Show less' : `+${weekMissions.length - 3} more`}
            </button>
          )}
        </div>

        {weekLoading ? (
          <Card variant="outlined">
            <CardContent>
              <MissionCardSkeleton count={2} />
            </CardContent>
          </Card>
        ) : !weekMissions || weekMissions.length === 0 ? (
          <Card variant="outlined">
            <CardContent>
              <p className={styles.emptyText}>No weekly missions</p>
            </CardContent>
          </Card>
        ) : isPast ? (
          // Read-only view for past weeks
          <Card variant="outlined">
            <CardContent className={styles.missionList}>
              {visibleWeekMissions?.map(mission => (
                <ReadOnlyMissionItem
                  key={mission.id}
                  mission={mission}
                  isPast={true}
                />
              ))}
            </CardContent>
          </Card>
        ) : (
          <Card variant="outlined">
            <CardContent className={styles.missionList}>
              {visibleWeekMissions?.map(mission => (
                <div key={mission.id} className={styles.missionItem}>
                  <button
                    className={`${styles.checkbox} ${mission.isCompleted ? styles.checked : ''}`}
                    onClick={() => mission.isCompleted ? handleUncompleteMission(mission) : handleCompleteMission(mission)}
                    aria-label={mission.isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
                  >
                    {mission.isCompleted && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M5 12l5 5L20 7" />
                      </svg>
                    )}
                  </button>
                  <div className={styles.missionContent}>
                    <span className={`${styles.missionTitle} ${mission.isCompleted ? styles.completed : ''}`}>
                      {mission.title}
                    </span>
                    <span className={styles.missionCategory}>
                      {mission.category?.name} • {mission.category?.vp_value} VP
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </section>

      {/* Streaks Section */}
      {topStreaks && topStreaks.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Active Streaks</h2>
            {graceTokens && (
              <div className={styles.tokenBadge}>
                <span className={styles.tokenIcon}>🛡️</span>
                <span>{graceTokens.quantity}</span>
              </div>
            )}
          </div>
          <Card variant="outlined">
            <CardContent>
              <div className={styles.streaksList}>
                {topStreaks.map(streak => (
                  <div key={streak.id} className={styles.streakItem}>
                    <span className={styles.streakIcon}>🔥</span>
                    <div className={styles.streakInfo}>
                      <span className={styles.streakCount}>{streak.current_streak} weeks</span>
                      <span className={styles.streakBest}>Best: {streak.longest_streak}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Bonus Objectives */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Bonus</h2>
        <Card variant="outlined">
          <CardContent>
            <button
              className={styles.bonusItemButton}
              onClick={() => setShowMoodModal(true)}
            >
              <span className={styles.bonusIcon}>💭</span>
              <span className={styles.bonusLabel}>Mood check-in</span>
              {moodStatus?.canCheckin ? (
                <span className={styles.bonusStatus}>Available</span>
              ) : moodStatus?.cooldownMinutes ? (
                <span className={styles.bonusStatusCooldown}>
                  {moodStatus.cooldownMinutes}m
                </span>
              ) : (
                <span className={styles.bonusStatusDone}>
                  {moodStatus?.checkinsToday}/{moodStatus?.maxCheckins}
                </span>
              )}
            </button>
          </CardContent>
        </Card>
      </section>

      {/* Mood History */}
      <section className={styles.section}>
        <Card variant="outlined">
          <CardContent>
            <MoodHistory />
          </CardContent>
        </Card>
      </section>

      {/* Floating Add Button - only show for today and future dates */}
      {!isPast && (
        <FloatingActionButton onClick={() => setShowAddModal(true)} aria-label="Add new mission" />
      )}

      {/* Add Mission Modal */}
      <AddMissionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        defaultDate={isFuture ? selectedDateStr : undefined}
      />

      {/* Mood Check-in Modal */}
      <MoodCheckinModal
        isOpen={showMoodModal}
        onClose={() => setShowMoodModal(false)}
      />
    </div>
  )
}
