/**
 * Events service - CRUD and query operations for calendar events
 */

import { supabase } from '@/lib/supabase'
import type { Event, EventCompletion, EventCategory, RecurrencePattern, Category } from '@/types/database'
import { getCanonicalToday, formatDate } from '@/lib/timezone'
import { eachDayOfInterval, parseISO, differenceInDays, getDay } from 'date-fns'

// Event with joined category for VP values
export interface EventWithCategory extends Event {
  vpCategory: Category | null
}

export interface TodayEvent extends EventWithCategory {
  isCompleted: boolean
  completion?: EventCompletion
}

// =============================================================================
// RECURRING EVENT HELPERS
// =============================================================================

/**
 * Check if a recurring event matches a specific target date
 */
export function doesRecurringEventMatchDate(event: Event, targetDate: Date): boolean {
  if (!event.is_recurring) return false

  const eventStartDate = parseISO(event.event_date)

  // Target date must be on or after the event start date
  if (targetDate < eventStartDate) return false

  // Check recurrence end date
  if (event.recurrence_end_date) {
    const endDate = parseISO(event.recurrence_end_date)
    if (targetDate > endDate) return false
  }

  const daysDiff = differenceInDays(targetDate, eventStartDate)

  switch (event.recurrence_pattern) {
    case 'daily':
      // Every day matches
      return true

    case 'weekly':
      // Every 7 days from the start date
      return daysDiff % 7 === 0

    case 'specific_weekdays':
      // Check if target date's weekday matches the weekday_flags
      if (!event.weekday_flags) return false
      const targetWeekday = getDay(targetDate) // 0 = Sunday, 6 = Saturday
      return (event.weekday_flags & (1 << targetWeekday)) !== 0

    default:
      return false
  }
}

/**
 * Expand recurring events for a date range, creating virtual occurrences
 * Returns events with their occurrence date set (not the original event_date)
 */
export function expandRecurringEvents(
  recurringEvents: Event[],
  startDate: Date,
  endDate: Date
): Event[] {
  const expandedEvents: Event[] = []

  const daysInRange = eachDayOfInterval({ start: startDate, end: endDate })

  for (const day of daysInRange) {
    const dayStr = formatDate(day, 'yyyy-MM-dd')

    for (const event of recurringEvents) {
      // Skip if this is the original date (already included in regular query)
      if (event.event_date === dayStr) continue

      if (doesRecurringEventMatchDate(event, day)) {
        // Create a virtual occurrence with the target date
        expandedEvents.push({
          ...event,
          event_date: dayStr,
          // Keep the original id so we can still edit/complete it
        })
      }
    }
  }

  return expandedEvents
}

// Legacy type for backwards compatibility
export interface EventWithCompletion extends Event {
  isCompleted: boolean
  completion?: EventCompletion
}

// Helper to get default category ID for event types
async function getDefaultCategoryId(eventCategory: EventCategory): Promise<string | null> {
  // Map event categories to mission category names
  const categoryName = eventCategory === 'medication' || eventCategory === 'appointment' || eventCategory === 'refill'
    ? 'Health'
    : 'Self-Care'

  const { data } = await supabase
    .from('categories')
    .select('id')
    .eq('name', categoryName)
    .eq('active', true)
    .single()

  return data?.id ?? null
}

// =============================================================================
// EVENT CRUD
// =============================================================================

export async function getEvents(userId: string): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('owner_user_id', userId)
    .order('event_date', { ascending: true })
    .order('event_time', { ascending: true, nullsFirst: false })

  if (error) throw error
  return data ?? []
}

export async function getEventById(id: string): Promise<Event | null> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data
}

export interface CreateEventInput {
  owner_user_id: string
  created_by_user_id: string
  title: string
  description_md?: string | null
  location?: string | null
  event_date: string
  event_time?: string | null
  end_time?: string | null
  all_day?: boolean
  is_mandatory: boolean
  category?: EventCategory
  category_id?: string | null
  is_recurring?: boolean
  recurrence_pattern?: RecurrencePattern | null
  weekday_flags?: number | null
  recurrence_end_date?: string | null
  health_medication_id?: string | null
  health_provider_id?: string | null
}

// Helper to create medication reminder events
export interface CreateMedicationReminderInput {
  owner_user_id: string
  created_by_user_id: string
  medication_id: string
  medication_name: string
  time: string
  recurrence_pattern: RecurrencePattern
  weekday_flags?: number | null
  instructions?: string | null
}

export async function createMedicationReminder(input: CreateMedicationReminderInput): Promise<Event> {
  const todayStr = getCanonicalToday()

  return createEvent({
    owner_user_id: input.owner_user_id,
    created_by_user_id: input.created_by_user_id,
    title: `Take ${input.medication_name}`,
    description_md: input.instructions || null,
    event_date: todayStr,
    event_time: input.time,
    is_mandatory: false,
    category: 'medication',
    is_recurring: true,
    recurrence_pattern: input.recurrence_pattern,
    weekday_flags: input.weekday_flags,
    health_medication_id: input.medication_id,
  })
}

// Helper to create appointment events
export interface CreateAppointmentInput {
  owner_user_id: string
  created_by_user_id: string
  provider_id: string
  provider_name: string
  title?: string
  event_date: string
  event_time?: string | null
  end_time?: string | null
  location?: string | null
  notes?: string | null
  is_recurring?: boolean
  recurrence_pattern?: RecurrencePattern | null
  weekday_flags?: number | null
}

export async function createAppointment(input: CreateAppointmentInput): Promise<Event> {
  return createEvent({
    owner_user_id: input.owner_user_id,
    created_by_user_id: input.created_by_user_id,
    title: input.title || `Appointment with ${input.provider_name}`,
    description_md: input.notes || null,
    location: input.location,
    event_date: input.event_date,
    event_time: input.event_time,
    end_time: input.end_time,
    is_mandatory: true,
    category: 'appointment',
    is_recurring: input.is_recurring || false,
    recurrence_pattern: input.recurrence_pattern,
    weekday_flags: input.weekday_flags,
    health_provider_id: input.provider_id,
  })
}

export async function createEvent(input: CreateEventInput): Promise<Event> {
  // Auto-assign category_id if not provided
  let categoryId = input.category_id
  if (!categoryId && input.category) {
    categoryId = await getDefaultCategoryId(input.category)
  }

  const { data, error } = await supabase
    .from('events')
    .insert({
      ...input,
      category_id: categoryId,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateEvent(
  id: string,
  updates: Partial<Omit<Event, 'id' | 'created_at' | 'updated_at'>>
): Promise<Event> {
  const { data, error } = await supabase
    .from('events')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// =============================================================================
// EVENT QUERIES
// =============================================================================

export async function getTodayEvents(userId: string): Promise<TodayEvent[]> {
  const todayStr = getCanonicalToday()
  const todayDate = parseISO(todayStr)

  // Fetch non-recurring events for today with category
  const { data: regularEvents, error: regularError } = await supabase
    .from('events')
    .select('*, vpCategory:categories(*)')
    .eq('owner_user_id', userId)
    .eq('is_recurring', false)
    .eq('event_date', todayStr)

  if (regularError) throw regularError

  // Fetch recurring events that could appear today with category
  const { data: recurringEvents, error: recurringError } = await supabase
    .from('events')
    .select('*, vpCategory:categories(*)')
    .eq('owner_user_id', userId)
    .eq('is_recurring', true)
    .lte('event_date', todayStr)

  if (recurringError) throw recurringError

  // Filter recurring events by recurrence_end_date and matching pattern
  const matchingRecurring = (recurringEvents ?? []).filter(event => {
    if (event.recurrence_end_date && event.recurrence_end_date < todayStr) return false
    return doesRecurringEventMatchDate(event as Event, todayDate)
  }).map(event => ({
    ...event,
    event_date: todayStr, // Set to today for display purposes
  }))

  // Combine all events
  const allEvents = [...(regularEvents ?? []), ...matchingRecurring]

  // Sort by time
  allEvents.sort((a, b) => {
    if (!a.event_time && !b.event_time) return 0
    if (!a.event_time) return -1
    if (!b.event_time) return 1
    return a.event_time.localeCompare(b.event_time)
  })

  // Fetch completions for all events
  const eventIds = allEvents.map(e => e.id)
  if (eventIds.length === 0) return []

  const { data: completions, error: completionsError } = await supabase
    .from('event_completions')
    .select('*')
    .in('event_id', eventIds)

  if (completionsError) throw completionsError

  const completionMap = new Map(completions?.map(c => [c.event_id, c]) ?? [])

  return allEvents.map(event => ({
    ...event,
    isCompleted: completionMap.has(event.id),
    completion: completionMap.get(event.id),
  })) as TodayEvent[]
}

export async function getEventsForDateRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<Event[]> {
  // Fetch regular (non-recurring) events in the date range
  const { data: regularEvents, error: regularError } = await supabase
    .from('events')
    .select('*')
    .eq('owner_user_id', userId)
    .eq('is_recurring', false)
    .gte('event_date', startDate)
    .lte('event_date', endDate)

  if (regularError) throw regularError

  // Fetch recurring events that could appear in this range
  // These are events where:
  // - event_date <= endDate (started before or during range)
  // - recurrence_end_date is null OR >= startDate (hasn't ended before range)
  const { data: recurringEvents, error: recurringError } = await supabase
    .from('events')
    .select('*')
    .eq('owner_user_id', userId)
    .eq('is_recurring', true)
    .lte('event_date', endDate)

  if (recurringError) throw recurringError

  // Filter recurring events by recurrence_end_date
  const validRecurringEvents = (recurringEvents ?? []).filter(event => {
    if (!event.recurrence_end_date) return true
    return event.recurrence_end_date >= startDate
  })

  // Expand recurring events for each day in the range
  const startDateObj = parseISO(startDate)
  const endDateObj = parseISO(endDate)
  const expandedEvents = expandRecurringEvents(validRecurringEvents, startDateObj, endDateObj)

  // Also include original recurring events if their original date is in range
  const originalRecurringInRange = validRecurringEvents.filter(
    event => event.event_date >= startDate && event.event_date <= endDate
  )

  // Combine all events and sort
  const allEvents = [...(regularEvents ?? []), ...originalRecurringInRange, ...expandedEvents]
  allEvents.sort((a, b) => {
    const dateCompare = a.event_date.localeCompare(b.event_date)
    if (dateCompare !== 0) return dateCompare
    // Sort by time, nulls first (all-day events)
    if (!a.event_time && !b.event_time) return 0
    if (!a.event_time) return -1
    if (!b.event_time) return 1
    return a.event_time.localeCompare(b.event_time)
  })

  return allEvents
}

export async function getEventsForDate(
  userId: string,
  date: string
): Promise<TodayEvent[]> {
  const targetDate = parseISO(date)

  // Fetch non-recurring events for this date with category
  const { data: regularEvents, error: regularError } = await supabase
    .from('events')
    .select('*, vpCategory:categories(*)')
    .eq('owner_user_id', userId)
    .eq('is_recurring', false)
    .eq('event_date', date)

  if (regularError) throw regularError

  // Fetch recurring events that could appear on this date with category
  const { data: recurringEvents, error: recurringError } = await supabase
    .from('events')
    .select('*, vpCategory:categories(*)')
    .eq('owner_user_id', userId)
    .eq('is_recurring', true)
    .lte('event_date', date)

  if (recurringError) throw recurringError

  // Filter recurring events by recurrence_end_date and matching pattern
  const matchingRecurring = (recurringEvents ?? []).filter(event => {
    if (event.recurrence_end_date && event.recurrence_end_date < date) return false
    return doesRecurringEventMatchDate(event as Event, targetDate)
  }).map(event => ({
    ...event,
    event_date: date, // Set to target date for display purposes
  }))

  // Combine all events
  const allEvents = [...(regularEvents ?? []), ...matchingRecurring]

  // Sort by time
  allEvents.sort((a, b) => {
    if (!a.event_time && !b.event_time) return 0
    if (!a.event_time) return -1
    if (!b.event_time) return 1
    return a.event_time.localeCompare(b.event_time)
  })

  // Fetch completions for all events
  const eventIds = allEvents.map(e => e.id)
  if (eventIds.length === 0) return []

  const { data: completions, error: completionsError } = await supabase
    .from('event_completions')
    .select('*')
    .in('event_id', eventIds)

  if (completionsError) throw completionsError

  const completionMap = new Map(completions?.map(c => [c.event_id, c]) ?? [])

  return allEvents.map(event => ({
    ...event,
    isCompleted: completionMap.has(event.id),
    completion: completionMap.get(event.id),
  })) as TodayEvent[]
}

export async function getUpcomingEvents(
  userId: string,
  daysAhead: number = 7
): Promise<Event[]> {
  const todayStr = getCanonicalToday()
  const todayDate = parseISO(todayStr)
  const futureDate = new Date(todayDate)
  futureDate.setDate(futureDate.getDate() + daysAhead)

  const futureStr = formatDate(futureDate, 'yyyy-MM-dd')

  return getEventsForDateRange(userId, todayStr, futureStr)
}

// =============================================================================
// EVENT COMPLETION
// =============================================================================

export async function completeEvent(
  eventId: string,
  userId: string,
  vpAwarded: number
): Promise<EventCompletion> {
  const { data, error } = await supabase
    .from('event_completions')
    .insert({
      event_id: eventId,
      completed_by_user_id: userId,
      vp_awarded: vpAwarded,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function uncompleteEvent(eventId: string): Promise<void> {
  const { error } = await supabase
    .from('event_completions')
    .delete()
    .eq('event_id', eventId)

  if (error) throw error
}
