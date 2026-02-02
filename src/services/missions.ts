/**
 * Missions service - CRUD, completion, and query operations
 */

import { supabase } from '@/lib/supabase'
import { parseISO } from 'date-fns'
import type { Mission, MissionCompletion, MissionStep, Category } from '@/types/database'
import { getCanonicalToday, getWeekBounds, formatDate } from '@/lib/timezone'

// Types for mission queries
export interface MissionWithCategory extends Mission {
  category: Category
}

export interface TodayMission extends MissionWithCategory {
  isCompleted: boolean
  completion?: MissionCompletion
}

// =============================================================================
// MISSION CRUD
// =============================================================================

export async function getMissions(userId: string): Promise<MissionWithCategory[]> {
  const { data, error } = await supabase
    .from('missions')
    .select('*, category:categories(*)')
    .eq('owner_user_id', userId)
    .eq('archived', false)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function getMissionById(id: string): Promise<MissionWithCategory | null> {
  const { data, error } = await supabase
    .from('missions')
    .select('*, category:categories(*)')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data
}

export interface CreateMissionInput {
  owner_user_id: string
  created_by_user_id: string
  title: string
  instructions_md?: string | null
  steps?: MissionStep[]
  category_id: string
  mission_type: 'one_time' | 'recurring'
  one_time_assignment?: 'day_assigned' | 'week_assigned' | null
  due_date?: string | null
  week_start_date?: string | null
  deadline?: string | null
  recurrence_pattern?: 'daily' | 'weekly' | 'specific_weekdays' | null
  weekdays?: number[] | null
}

export async function createMission(input: CreateMissionInput): Promise<Mission> {
  const { data, error } = await supabase
    .from('missions')
    .insert({
      ...input,
      steps: input.steps ?? [],
      archived: false,
      snoozed_until: null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateMission(
  id: string,
  updates: Partial<Omit<Mission, 'id' | 'created_at' | 'updated_at' | 'category'>>
): Promise<Mission> {
  const { data, error } = await supabase
    .from('missions')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function archiveMission(id: string): Promise<void> {
  const { error } = await supabase
    .from('missions')
    .update({ archived: true })
    .eq('id', id)

  if (error) throw error
}

export async function snoozeMission(id: string, until: Date): Promise<void> {
  const { error } = await supabase
    .from('missions')
    .update({ snoozed_until: until.toISOString() })
    .eq('id', id)

  if (error) throw error
}

export async function unsnoozeMission(id: string): Promise<void> {
  const { error } = await supabase
    .from('missions')
    .update({ snoozed_until: null })
    .eq('id', id)

  if (error) throw error
}

// =============================================================================
// TODAY'S MISSIONS
// =============================================================================

export async function getTodayMissions(userId: string): Promise<TodayMission[]> {
  const todayStr = getCanonicalToday()
  const now = new Date()
  const dayOfWeek = now.getDay() // 0 = Sunday, 1 = Monday, etc.
  const { start: weekStart } = getWeekBounds(now)
  const weekStartStr = formatDate(weekStart, 'yyyy-MM-dd')

  // Fetch all non-archived missions for user
  const { data: missions, error: missionsError } = await supabase
    .from('missions')
    .select('*, category:categories(*)')
    .eq('owner_user_id', userId)
    .eq('archived', false)
    .or(`snoozed_until.is.null,snoozed_until.lte.${new Date().toISOString()}`)

  if (missionsError) throw missionsError

  // Fetch today's completions
  const { data: completions, error: completionsError } = await supabase
    .from('mission_completions')
    .select('*')
    .eq('completion_date', todayStr)

  if (completionsError) throw completionsError

  const completionMap = new Map(completions?.map(c => [c.mission_id, c]) ?? [])

  // Filter missions that are active today
  const todayMissions: TodayMission[] = []

  for (const mission of missions ?? []) {
    let isActiveToday = false

    if (mission.mission_type === 'one_time') {
      // One-time day-assigned: active on due_date
      if (mission.one_time_assignment === 'day_assigned') {
        isActiveToday = mission.due_date === todayStr
      }
      // One-time week-assigned: active if in current week and not yet completed
      else if (mission.one_time_assignment === 'week_assigned') {
        isActiveToday = mission.week_start_date === weekStartStr
      }
    } else if (mission.mission_type === 'recurring') {
      // Recurring missions
      if (mission.recurrence_pattern === 'daily') {
        isActiveToday = true
      } else if (mission.recurrence_pattern === 'weekly') {
        // Weekly missions are always "this week" missions
        isActiveToday = false // They show in "This Week" section
      } else if (mission.recurrence_pattern === 'specific_weekdays') {
        isActiveToday = mission.weekdays?.includes(dayOfWeek) ?? false
      }
    }

    if (isActiveToday) {
      const completion = completionMap.get(mission.id)
      todayMissions.push({
        ...mission,
        isCompleted: !!completion,
        completion,
      })
    }
  }

  // Sort by sort_order for consistent drag-and-drop ordering
  return todayMissions.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
}

// =============================================================================
// MISSIONS FOR SPECIFIC DATE (for date navigation)
// =============================================================================

/**
 * Get missions for a specific date (for date navigation feature)
 * Similar to getTodayMissions but date-parameterized
 */
export async function getMissionsForDate(
  userId: string,
  dateStr: string
): Promise<TodayMission[]> {
  const date = parseISO(dateStr)
  const dayOfWeek = date.getDay() // 0 = Sunday, 1 = Monday, etc.
  const { start: weekStart } = getWeekBounds(date)
  const weekStartStr = formatDate(weekStart, 'yyyy-MM-dd')

  // Fetch all non-archived missions for user
  // Note: We don't filter by snoozed_until for historical/future views
  const { data: missions, error: missionsError } = await supabase
    .from('missions')
    .select('*, category:categories(*)')
    .eq('owner_user_id', userId)
    .eq('archived', false)

  if (missionsError) throw missionsError

  // Fetch completions for the target date
  const { data: completions, error: completionsError } = await supabase
    .from('mission_completions')
    .select('*')
    .eq('completion_date', dateStr)

  if (completionsError) throw completionsError

  const completionMap = new Map(completions?.map(c => [c.mission_id, c]) ?? [])

  // Filter missions that are active on the target date
  const dateMissions: TodayMission[] = []

  for (const mission of missions ?? []) {
    let isActiveOnDate = false

    if (mission.mission_type === 'one_time') {
      if (mission.one_time_assignment === 'day_assigned') {
        isActiveOnDate = mission.due_date === dateStr
      } else if (mission.one_time_assignment === 'week_assigned') {
        isActiveOnDate = mission.week_start_date === weekStartStr
      }
    } else if (mission.mission_type === 'recurring') {
      if (mission.recurrence_pattern === 'daily') {
        isActiveOnDate = true
      } else if (mission.recurrence_pattern === 'weekly') {
        // Weekly missions show in "This Week" section only
        isActiveOnDate = false
      } else if (mission.recurrence_pattern === 'specific_weekdays') {
        isActiveOnDate = mission.weekdays?.includes(dayOfWeek) ?? false
      }
    }

    if (isActiveOnDate) {
      const completion = completionMap.get(mission.id)
      dateMissions.push({
        ...mission,
        isCompleted: !!completion,
        completion,
      })
    }
  }

  return dateMissions.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
}

/**
 * Get weekly missions for a specific date's week
 */
export async function getWeekMissionsForDate(
  userId: string,
  dateStr: string
): Promise<TodayMission[]> {
  const date = parseISO(dateStr)
  const { start: weekStart } = getWeekBounds(date)
  const weekStartStr = formatDate(weekStart, 'yyyy-MM-dd')

  const { data: missions, error: missionsError } = await supabase
    .from('missions')
    .select('*, category:categories(*)')
    .eq('owner_user_id', userId)
    .eq('archived', false)
    .or(
      `and(mission_type.eq.recurring,recurrence_pattern.eq.weekly),` +
      `and(mission_type.eq.one_time,one_time_assignment.eq.week_assigned,week_start_date.eq.${weekStartStr})`
    )

  if (missionsError) throw missionsError

  const missionIds = missions?.map(m => m.id) ?? []
  if (missionIds.length === 0) return []

  const { data: completions, error: completionsError } = await supabase
    .from('mission_completions')
    .select('*')
    .in('mission_id', missionIds)
    .gte('completion_date', weekStartStr)

  if (completionsError) throw completionsError

  const completionMap = new Map(completions?.map(c => [c.mission_id, c]) ?? [])

  return (missions ?? []).map(mission => ({
    ...mission,
    isCompleted: completionMap.has(mission.id),
    completion: completionMap.get(mission.id),
  })).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
}

// =============================================================================
// THIS WEEK'S MISSIONS
// =============================================================================

export async function getThisWeekMissions(userId: string): Promise<TodayMission[]> {
  const { start: weekStart } = getWeekBounds(new Date())
  const weekStartStr = formatDate(weekStart, 'yyyy-MM-dd')

  // Fetch weekly recurring missions and week-assigned one-time missions
  const { data: missions, error: missionsError } = await supabase
    .from('missions')
    .select('*, category:categories(*)')
    .eq('owner_user_id', userId)
    .eq('archived', false)
    .or(
      `and(mission_type.eq.recurring,recurrence_pattern.eq.weekly),` +
      `and(mission_type.eq.one_time,one_time_assignment.eq.week_assigned,week_start_date.eq.${weekStartStr})`
    )

  if (missionsError) throw missionsError

  // Fetch this week's completions for these missions
  const missionIds = missions?.map(m => m.id) ?? []
  if (missionIds.length === 0) return []

  const { data: completions, error: completionsError } = await supabase
    .from('mission_completions')
    .select('*')
    .in('mission_id', missionIds)
    .gte('completion_date', weekStartStr)

  if (completionsError) throw completionsError

  const completionMap = new Map(completions?.map(c => [c.mission_id, c]) ?? [])

  const result = (missions ?? []).map(mission => ({
    ...mission,
    isCompleted: completionMap.has(mission.id),
    completion: completionMap.get(mission.id),
  }))

  // Sort by sort_order for consistent ordering
  return result.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
}

// =============================================================================
// MISSION COMPLETION
// =============================================================================

export interface CompleteMissionResult {
  completion: MissionCompletion
  vpAwarded: number
  leveledUp: boolean
  newLevel?: number
  coinsAwarded?: number
}

export async function completeMission(
  missionId: string,
  userId: string,
  vpValue: number
): Promise<MissionCompletion> {
  const today = getCanonicalToday()
  const todayStr = formatDate(today, 'yyyy-MM-dd')

  const { data, error } = await supabase
    .from('mission_completions')
    .insert({
      mission_id: missionId,
      completion_date: todayStr,
      completed_by_user_id: userId,
      vp_awarded: vpValue,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function uncompleteMission(
  missionId: string,
  completionDate: string
): Promise<void> {
  const { error } = await supabase
    .from('mission_completions')
    .delete()
    .eq('mission_id', missionId)
    .eq('completion_date', completionDate)

  if (error) throw error
}

// =============================================================================
// STEP MANAGEMENT
// =============================================================================

export async function updateMissionSteps(
  missionId: string,
  steps: MissionStep[]
): Promise<void> {
  const { error } = await supabase
    .from('missions')
    .update({ steps })
    .eq('id', missionId)

  if (error) throw error
}

export async function toggleMissionStep(
  missionId: string,
  stepId: string,
  completed: boolean
): Promise<void> {
  const mission = await getMissionById(missionId)
  if (!mission) throw new Error('Mission not found')

  const updatedSteps = mission.steps.map(step =>
    step.id === stepId ? { ...step, completed } : step
  )

  await updateMissionSteps(missionId, updatedSteps)
}

// =============================================================================
// MISSION QUERIES
// =============================================================================

export async function getMissionsWithDeadlines(
  userId: string,
  daysAhead: number = 7
): Promise<MissionWithCategory[]> {
  const today = getCanonicalToday()
  const futureDate = new Date(today)
  futureDate.setDate(futureDate.getDate() + daysAhead)

  const todayStr = formatDate(today, 'yyyy-MM-dd')
  const futureStr = formatDate(futureDate, 'yyyy-MM-dd')

  const { data, error } = await supabase
    .from('missions')
    .select('*, category:categories(*)')
    .eq('owner_user_id', userId)
    .eq('archived', false)
    .not('deadline', 'is', null)
    .gte('deadline', todayStr)
    .lte('deadline', futureStr)
    .order('deadline', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function getCompletionsForDateRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<MissionCompletion[]> {
  const { data, error } = await supabase
    .from('mission_completions')
    .select('*')
    .eq('completed_by_user_id', userId)
    .gte('completion_date', startDate)
    .lte('completion_date', endDate)

  if (error) throw error
  return data ?? []
}

// =============================================================================
// MISSION REORDERING
// =============================================================================

export async function reorderMissions(
  missionIds: string[]
): Promise<void> {
  // Update sort_order for each mission based on array position
  const updates = missionIds.map((id, index) => ({
    id,
    sort_order: index,
  }))

  // Use Promise.all for parallel updates
  await Promise.all(
    updates.map(({ id, sort_order }) =>
      supabase
        .from('missions')
        .update({ sort_order })
        .eq('id', id)
    )
  )
}
