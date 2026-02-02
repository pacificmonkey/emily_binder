/**
 * Rollover service - Lazy evaluation of past-due missions
 *
 * When the app opens, we check for missions that were due yesterday (or earlier)
 * and apply the appropriate end-of-day policy from their category:
 *
 * - carryover_next_day: Move due_date to today
 * - never_carryover: Archive the mission
 * - convert_to_this_week: Convert to week-assigned mission
 */

import { supabase } from '@/lib/supabase'
import type { Mission, Category } from '@/types/database'
import { getCanonicalToday, getWeekBounds, formatDate } from '@/lib/timezone'

// Key for localStorage to track last rollover check
const LAST_ROLLOVER_KEY = 'emily_mission_log_last_rollover'

export interface RolloverResult {
  processed: number
  carriedOver: number
  archived: number
  convertedToWeek: number
}

/**
 * Check if rollover needs to run (hasn't run today)
 */
export function needsRollover(): boolean {
  const today = formatDate(getCanonicalToday(), 'yyyy-MM-dd')
  const lastRollover = localStorage.getItem(LAST_ROLLOVER_KEY)
  return lastRollover !== today
}

/**
 * Mark rollover as complete for today
 */
function markRolloverComplete(): void {
  const today = formatDate(getCanonicalToday(), 'yyyy-MM-dd')
  localStorage.setItem(LAST_ROLLOVER_KEY, today)
}

/**
 * Get missions that need rollover processing
 */
async function getMissionsNeedingRollover(userId: string): Promise<(Mission & { category: Category })[]> {
  const today = getCanonicalToday()
  const todayStr = formatDate(today, 'yyyy-MM-dd')

  // Get one-time day-assigned missions with due_date before today
  const { data, error } = await supabase
    .from('missions')
    .select('*, category:categories(*)')
    .eq('owner_user_id', userId)
    .eq('archived', false)
    .eq('mission_type', 'one_time')
    .eq('one_time_assignment', 'day_assigned')
    .lt('due_date', todayStr)

  if (error) throw error
  return data ?? []
}

/**
 * Check if a mission was completed on its due date
 */
async function wasCompletedOnDueDate(missionId: string, dueDate: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('mission_completions')
    .select('id')
    .eq('mission_id', missionId)
    .eq('completion_date', dueDate)
    .limit(1)

  if (error) throw error
  return (data?.length ?? 0) > 0
}

/**
 * Apply carryover policy: move due_date to today
 */
async function applyCarryover(missionId: string): Promise<void> {
  const today = formatDate(getCanonicalToday(), 'yyyy-MM-dd')

  const { error } = await supabase
    .from('missions')
    .update({ due_date: today })
    .eq('id', missionId)

  if (error) throw error
}

/**
 * Apply archive policy: mark mission as archived
 */
async function applyArchive(missionId: string): Promise<void> {
  const { error } = await supabase
    .from('missions')
    .update({ archived: true })
    .eq('id', missionId)

  if (error) throw error
}

/**
 * Apply convert-to-week policy: change to week-assigned
 */
async function applyConvertToWeek(missionId: string): Promise<void> {
  const { start: weekStart } = getWeekBounds(new Date())
  const weekStartStr = formatDate(weekStart, 'yyyy-MM-dd')

  const { error } = await supabase
    .from('missions')
    .update({
      one_time_assignment: 'week_assigned',
      due_date: null,
      week_start_date: weekStartStr,
    })
    .eq('id', missionId)

  if (error) throw error
}

/**
 * Run the rollover process for a user
 * This should be called on app startup/focus
 */
export async function runRollover(userId: string): Promise<RolloverResult> {
  const result: RolloverResult = {
    processed: 0,
    carriedOver: 0,
    archived: 0,
    convertedToWeek: 0,
  }

  // Skip if already run today
  if (!needsRollover()) {
    return result
  }

  const missions = await getMissionsNeedingRollover(userId)

  for (const mission of missions) {
    // Skip if mission was completed on its due date
    if (mission.due_date && await wasCompletedOnDueDate(mission.id, mission.due_date)) {
      // Archive completed missions
      await applyArchive(mission.id)
      result.archived++
      result.processed++
      continue
    }

    // Apply the category's end-of-day policy
    const policy = mission.category.end_of_day_policy

    switch (policy) {
      case 'carryover_next_day':
        await applyCarryover(mission.id)
        result.carriedOver++
        break

      case 'never_carryover':
        await applyArchive(mission.id)
        result.archived++
        break

      case 'convert_to_this_week':
        await applyConvertToWeek(mission.id)
        result.convertedToWeek++
        break
    }

    result.processed++
  }

  // Mark rollover as complete
  markRolloverComplete()

  return result
}

/**
 * Force rollover to run (for testing or manual trigger)
 */
export async function forceRollover(userId: string): Promise<RolloverResult> {
  localStorage.removeItem(LAST_ROLLOVER_KEY)
  return runRollover(userId)
}

/**
 * Hook to run rollover on app startup
 * Returns the result when complete
 */
export async function useRolloverOnStartup(
  userId: string | null
): Promise<RolloverResult | null> {
  if (!userId) return null

  try {
    return await runRollover(userId)
  } catch (error) {
    console.error('Rollover failed:', error)
    return null
  }
}
