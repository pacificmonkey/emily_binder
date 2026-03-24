import { supabase } from '@/lib/supabase'
import type {
  Event,
  CreateEventInput,
  UpdateEventInput,
  EventStatus,
} from '@/types/database'

// Create a new event using RPC function
export async function createEvent(input: CreateEventInput): Promise<Event> {
  const { data, error } = await supabase.rpc('create_event', {
    p_title: input.title,
    p_type: input.type || 'other',
    p_starts_at: input.starts_at,
    p_ends_at: input.ends_at || null,
    p_timezone: input.timezone || 'America/Los_Angeles',
    p_location: input.location || null,
    p_notes: input.notes || null,
    p_recurrence: input.recurrence || 'none',
    p_recurrence_end_date: input.recurrence_end_date || null,
  })

  if (error) {
    throw error
  }

  const result = data as { success: boolean; event_id: string; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to create event')
  }

  // Fetch the created event
  const { data: event, error: fetchError } = await supabase
    .from('event')
    .select('*')
    .eq('event_id', result.event_id)
    .single()

  if (fetchError || !event) {
    throw fetchError || new Error('Failed to fetch created event')
  }

  return event as Event
}

// Update an event
export async function updateEvent(eventId: string, input: UpdateEventInput): Promise<Event> {
  const { data, error } = await supabase.rpc('update_event', {
    p_event_id: eventId,
    p_title: input.title || null,
    p_type: input.type || null,
    p_starts_at: input.starts_at || null,
    p_ends_at: input.ends_at,
    p_timezone: input.timezone || null,
    p_location: input.location,
    p_notes: input.notes,
    p_status: input.status || null,
  })

  if (error) {
    throw error
  }

  const result = data as { success: boolean; event_id: string; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to update event')
  }

  // Fetch the updated event
  const { data: event, error: fetchError } = await supabase
    .from('event')
    .select('*')
    .eq('event_id', eventId)
    .single()

  if (fetchError || !event) {
    throw fetchError || new Error('Failed to fetch updated event')
  }

  return event as Event
}

// Delete an event
export async function deleteEvent(eventId: string): Promise<void> {
  const { data, error } = await supabase.rpc('delete_event', {
    p_event_id: eventId,
  })

  if (error) {
    throw error
  }

  const result = data as { success: boolean; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to delete event')
  }
}

// Get events for a date range
export async function getEvents(startDate?: string, endDate?: string): Promise<Event[]> {
  const { data, error } = await supabase.rpc('get_events', {
    p_start_date: startDate || null,
    p_end_date: endDate || null,
  })

  if (error) {
    throw error
  }

  const result = data as { success: boolean; events: Event[]; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch events')
  }

  return result.events || []
}

// Get today's events
export async function getTodaysEvents(): Promise<Event[]> {
  const { data, error } = await supabase.rpc('get_todays_events')

  if (error) {
    throw error
  }

  const result = data as { success: boolean; events: Event[]; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch today\'s events')
  }

  return result.events || []
}

// Get a single event by ID (scoped to user's workspace)
export async function getEvent(eventId: string): Promise<Event | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: membership } = await supabase
    .from('workspace_membership')
    .select('workspace_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!membership) throw new Error('No active workspace membership')

  const { data, error } = await supabase
    .from('event')
    .select('*')
    .eq('event_id', eventId)
    .eq('workspace_id', membership.workspace_id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    throw error
  }

  return data as Event
}

// Update event status
export async function updateEventStatus(eventId: string, status: EventStatus): Promise<Event> {
  return updateEvent(eventId, { status })
}

// Cancel an event
export async function cancelEvent(eventId: string): Promise<Event> {
  return updateEventStatus(eventId, 'canceled')
}

// Mark event as completed
export async function completeEvent(eventId: string): Promise<Event> {
  return updateEventStatus(eventId, 'completed')
}

// Get upcoming events (from now onwards)
export async function getUpcomingEvents(limit = 10): Promise<Event[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: membership } = await supabase
    .from('workspace_membership')
    .select('workspace_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!membership) throw new Error('No active workspace membership')

  const { data: patient } = await supabase
    .from('patient_profile')
    .select('patient_id')
    .eq('workspace_id', membership.workspace_id)
    .single()

  if (!patient) throw new Error('No patient profile found')

  const { data, error } = await supabase
    .from('event')
    .select('*')
    .eq('workspace_id', membership.workspace_id)
    .eq('patient_id', patient.patient_id)
    .gte('starts_at', new Date().toISOString())
    .in('status', ['scheduled', 'rescheduled'])
    .order('starts_at', { ascending: true })
    .limit(limit)

  if (error) {
    throw error
  }

  return (data || []) as Event[]
}

// Get events for a specific month
export async function getEventsForMonth(year: number, month: number): Promise<Event[]> {
  const startDate = new Date(year, month, 1).toISOString().split('T')[0]
  const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0]
  return getEvents(startDate, endDate)
}
