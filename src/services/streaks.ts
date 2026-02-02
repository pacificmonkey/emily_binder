/**
 * Streaks service - manages weekly streak tracking and grace tokens
 */

import { supabase } from '@/lib/supabase'
import type { WeeklyStreakState, GraceToken } from '@/types/database'
import { getCurrentWeekStart } from '@/lib/timezone'

/**
 * Get all streak states for a user
 */
export async function getUserStreaks(userId: string): Promise<WeeklyStreakState[]> {
  const { data, error } = await supabase
    .from('weekly_streak_state')
    .select(`
      *,
      mission:missions(id, title, category_id)
    `)
    .eq('user_id', userId)
    .order('current_streak', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Get streak state for a specific mission
 */
export async function getMissionStreak(
  userId: string,
  missionId: string
): Promise<WeeklyStreakState | null> {
  const { data, error } = await supabase
    .from('weekly_streak_state')
    .select('*')
    .eq('user_id', userId)
    .eq('mission_id', missionId)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data
}

/**
 * Update streak when a weekly mission is completed
 * Called automatically when completing a weekly recurring mission
 */
export async function updateStreakOnCompletion(
  userId: string,
  missionId: string
): Promise<WeeklyStreakState> {
  const currentWeek = getCurrentWeekStart()

  // Get existing streak state
  const existing = await getMissionStreak(userId, missionId)

  if (existing) {
    // Check if already completed this week
    if (existing.last_completed_week === currentWeek) {
      return existing
    }

    // Check if continuing streak (completed last week)
    const lastWeek = getLastWeekStart()
    const isConsecutive = existing.last_completed_week === lastWeek

    const newStreak = isConsecutive ? existing.current_streak + 1 : 1
    const newLongest = Math.max(newStreak, existing.longest_streak)

    const { data, error } = await supabase
      .from('weekly_streak_state')
      .update({
        current_streak: newStreak,
        longest_streak: newLongest,
        last_completed_week: currentWeek,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Create new streak state
  const { data, error } = await supabase
    .from('weekly_streak_state')
    .insert({
      user_id: userId,
      mission_id: missionId,
      current_streak: 1,
      longest_streak: 1,
      last_completed_week: currentWeek,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Check for broken streaks and reset them
 * Called on app open as part of lazy evaluation
 */
export async function checkAndResetBrokenStreaks(userId: string): Promise<void> {
  const lastWeek = getLastWeekStart()

  // Find streaks that weren't completed last week and have a streak > 0
  const { data: brokenStreaks, error } = await supabase
    .from('weekly_streak_state')
    .select('id')
    .eq('user_id', userId)
    .gt('current_streak', 0)
    .or(`last_completed_week.lt.${lastWeek},last_completed_week.is.null`)

  if (error) throw error

  if (brokenStreaks && brokenStreaks.length > 0) {
    const ids = brokenStreaks.map(s => s.id)

    await supabase
      .from('weekly_streak_state')
      .update({
        current_streak: 0,
        updated_at: new Date().toISOString(),
      })
      .in('id', ids)
  }
}

/**
 * Get user's grace tokens
 */
export async function getGraceTokens(userId: string): Promise<GraceToken | null> {
  const { data, error } = await supabase
    .from('grace_tokens')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data
}

/**
 * Use a grace token to prevent streak loss
 */
export async function useGraceToken(
  userId: string,
  missionId: string
): Promise<{ success: boolean; tokensRemaining: number }> {
  // Get current tokens
  const tokens = await getGraceTokens(userId)

  if (!tokens || tokens.quantity <= 0) {
    return { success: false, tokensRemaining: 0 }
  }

  // Decrement tokens
  const { data, error } = await supabase
    .from('grace_tokens')
    .update({
      quantity: tokens.quantity - 1,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw error

  // Mark the streak as completed for this week to prevent loss
  const currentWeek = getCurrentWeekStart()
  await supabase
    .from('weekly_streak_state')
    .update({
      last_completed_week: currentWeek,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('mission_id', missionId)

  return { success: true, tokensRemaining: data.quantity }
}

/**
 * Award grace tokens (purchased with coins)
 */
export async function awardGraceTokens(
  userId: string,
  quantity: number
): Promise<GraceToken> {
  const existing = await getGraceTokens(userId)

  if (existing) {
    const { data, error } = await supabase
      .from('grace_tokens')
      .update({
        quantity: existing.quantity + quantity,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  const { data, error } = await supabase
    .from('grace_tokens')
    .insert({
      user_id: userId,
      quantity,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// Helper: Get the start of last week
function getLastWeekStart(): string {
  const now = new Date()
  const lastWeek = new Date(now)
  lastWeek.setDate(lastWeek.getDate() - 7)

  // Get Monday of that week
  const day = lastWeek.getDay()
  const diff = lastWeek.getDate() - day + (day === 0 ? -6 : 1)
  lastWeek.setDate(diff)

  return lastWeek.toISOString().split('T')[0]
}
