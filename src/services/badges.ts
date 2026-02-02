/**
 * Badges service - manages badge awarding and retrieval
 */

import { supabase } from '@/lib/supabase'
import type { Badge } from '@/types/database'

// Badge type definitions
export type BadgeType =
  | 'streak_3'      // 3 week streak
  | 'streak_5'      // 5 week streak
  | 'streak_10'     // 10 week streak
  | 'streak_20'     // 20 week streak
  | 'first_mission' // Complete first mission
  | 'first_level'   // Reach level 2
  | 'level_5'       // Reach level 5
  | 'level_10'      // Reach level 10
  | 'daily_win'     // First daily win
  | 'daily_win_7'   // 7 daily wins in a row
  | 'mood_explorer' // Log 10 mood check-ins
  | 'collector'     // Purchase 5 stickers

export const BADGE_INFO: Record<BadgeType, { name: string; description: string; icon: string }> = {
  streak_3: { name: '3 Week Streak', description: 'Complete a weekly mission 3 weeks in a row', icon: '🔥' },
  streak_5: { name: '5 Week Streak', description: 'Complete a weekly mission 5 weeks in a row', icon: '⭐' },
  streak_10: { name: '10 Week Streak', description: 'Complete a weekly mission 10 weeks in a row', icon: '🌟' },
  streak_20: { name: '20 Week Streak', description: 'Complete a weekly mission 20 weeks in a row', icon: '💫' },
  first_mission: { name: 'First Mission', description: 'Complete your first mission', icon: '🎯' },
  first_level: { name: 'Level Up!', description: 'Reach level 2', icon: '📈' },
  level_5: { name: 'Rising Star', description: 'Reach level 5', icon: '🌠' },
  level_10: { name: 'Superstar', description: 'Reach level 10', icon: '🏆' },
  daily_win: { name: 'Daily Winner', description: 'Achieve your first daily win', icon: '🏅' },
  daily_win_7: { name: 'Week Champion', description: 'Get 7 daily wins in a row', icon: '👑' },
  mood_explorer: { name: 'Mood Explorer', description: 'Log 10 mood check-ins', icon: '💭' },
  collector: { name: 'Collector', description: 'Purchase 5 stickers', icon: '🎨' },
}

/**
 * Get all badges for a user
 */
export async function getUserBadges(userId: string): Promise<Badge[]> {
  const { data, error } = await supabase
    .from('badges')
    .select('*')
    .eq('user_id', userId)
    .order('earned_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Check if user has a specific badge
 */
export async function hasBadge(userId: string, badgeType: BadgeType): Promise<boolean> {
  const { data, error } = await supabase
    .from('badges')
    .select('id')
    .eq('user_id', userId)
    .eq('badge_type', badgeType)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return !!data
}

/**
 * Award a badge to a user
 * Returns the badge if newly awarded, null if already had it
 */
export async function awardBadge(
  userId: string,
  badgeType: BadgeType,
  relatedMissionId?: string
): Promise<Badge | null> {
  // Check if already has badge
  const alreadyHas = await hasBadge(userId, badgeType)
  if (alreadyHas) return null

  const badgeInfo = BADGE_INFO[badgeType]

  const { data, error } = await supabase
    .from('badges')
    .insert({
      user_id: userId,
      badge_type: badgeType,
      badge_name: badgeInfo.name,
      related_mission_id: relatedMissionId || null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Check and award streak badges based on current streak
 */
export async function checkStreakBadges(
  userId: string,
  currentStreak: number,
  missionId: string
): Promise<Badge[]> {
  const awardedBadges: Badge[] = []

  const streakBadges: [number, BadgeType][] = [
    [3, 'streak_3'],
    [5, 'streak_5'],
    [10, 'streak_10'],
    [20, 'streak_20'],
  ]

  for (const [threshold, badgeType] of streakBadges) {
    if (currentStreak >= threshold) {
      const badge = await awardBadge(userId, badgeType, missionId)
      if (badge) awardedBadges.push(badge)
    }
  }

  return awardedBadges
}

/**
 * Check and award level badges based on current level
 */
export async function checkLevelBadges(
  userId: string,
  currentLevel: number
): Promise<Badge[]> {
  const awardedBadges: Badge[] = []

  const levelBadges: [number, BadgeType][] = [
    [2, 'first_level'],
    [5, 'level_5'],
    [10, 'level_10'],
  ]

  for (const [threshold, badgeType] of levelBadges) {
    if (currentLevel >= threshold) {
      const badge = await awardBadge(userId, badgeType)
      if (badge) awardedBadges.push(badge)
    }
  }

  return awardedBadges
}

/**
 * Get recent badges (last N badges earned)
 */
export async function getRecentBadges(userId: string, limit: number = 5): Promise<Badge[]> {
  const { data, error } = await supabase
    .from('badges')
    .select('*')
    .eq('user_id', userId)
    .order('earned_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

/**
 * Get badge count for a user
 */
export async function getBadgeCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('badges')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (error) throw error
  return count || 0
}
