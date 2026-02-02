/**
 * Economy service - VP, levels, coins, and daily win tracking
 */

import { supabase } from '@/lib/supabase'
import type { EconomyState, EconomyConfig } from '@/types/database'
import { getCanonicalToday, formatDate } from '@/lib/timezone'

// Default config values (used if no config exists)
const DEFAULT_LEVEL_THRESHOLDS = [0, 100, 250, 500, 1000, 2000, 4000, 8000, 16000, 32000]
const DEFAULT_COINS_PER_LEVEL = [0, 5, 10, 15, 20, 25, 30, 40, 50, 100]
const DEFAULT_DAILY_WIN_THRESHOLD = 15
const DEFAULT_MANDATORY_EVENT_MULTIPLIER = 1.5

// =============================================================================
// ECONOMY STATE
// =============================================================================

export async function getEconomyState(userId: string): Promise<EconomyState | null> {
  const { data, error } = await supabase
    .from('economy_state')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data
}

export async function initializeEconomyState(userId: string): Promise<EconomyState> {
  const { data, error } = await supabase
    .from('economy_state')
    .insert({
      user_id: userId,
      total_vp: 0,
      current_level: 1,
      coins: 0,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getOrCreateEconomyState(userId: string): Promise<EconomyState> {
  const existing = await getEconomyState(userId)
  if (existing) return existing
  return initializeEconomyState(userId)
}

// =============================================================================
// ECONOMY CONFIG
// =============================================================================

export async function getEconomyConfig(): Promise<EconomyConfig | null> {
  const { data, error } = await supabase
    .from('economy_config')
    .select('*')
    .limit(1)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data
}

export function getEffectiveConfig(config: EconomyConfig | null) {
  return {
    levelThresholds: config?.level_thresholds ?? DEFAULT_LEVEL_THRESHOLDS,
    coinsPerLevel: config?.coins_per_level ?? DEFAULT_COINS_PER_LEVEL,
    dailyWinThreshold: config?.daily_win_threshold ?? DEFAULT_DAILY_WIN_THRESHOLD,
    mandatoryEventMultiplier: config?.mandatory_event_multiplier ?? DEFAULT_MANDATORY_EVENT_MULTIPLIER,
    graceTokenCost: config?.grace_token_cost ?? 10,
  }
}

// =============================================================================
// VP & LEVEL CALCULATIONS
// =============================================================================

export function calculateLevel(totalVp: number, thresholds: number[]): number {
  let level = 1
  for (let i = 1; i < thresholds.length; i++) {
    if (totalVp >= thresholds[i]) {
      level = i + 1
    } else {
      break
    }
  }
  return level
}

export function getVpForNextLevel(totalVp: number, thresholds: number[]): {
  currentLevel: number
  vpForCurrentLevel: number
  vpForNextLevel: number
  vpProgress: number
  progressPercent: number
} {
  const currentLevel = calculateLevel(totalVp, thresholds)
  const vpForCurrentLevel = thresholds[currentLevel - 1] ?? 0
  const vpForNextLevel = thresholds[currentLevel] ?? thresholds[thresholds.length - 1]
  const vpProgress = totalVp - vpForCurrentLevel
  const vpNeeded = vpForNextLevel - vpForCurrentLevel
  const progressPercent = vpNeeded > 0 ? Math.min(100, (vpProgress / vpNeeded) * 100) : 100

  return {
    currentLevel,
    vpForCurrentLevel,
    vpForNextLevel,
    vpProgress,
    progressPercent,
  }
}

// =============================================================================
// AWARD VP
// =============================================================================

export interface AwardVpResult {
  newTotalVp: number
  oldLevel: number
  newLevel: number
  leveledUp: boolean
  coinsAwarded: number
}

export async function awardVp(userId: string, vpAmount: number): Promise<AwardVpResult> {
  const state = await getOrCreateEconomyState(userId)
  const config = await getEconomyConfig()
  const { levelThresholds, coinsPerLevel } = getEffectiveConfig(config)

  const oldLevel = state.current_level
  const newTotalVp = state.total_vp + vpAmount
  const newLevel = calculateLevel(newTotalVp, levelThresholds)
  const leveledUp = newLevel > oldLevel

  // Calculate coins to award for all levels gained
  let coinsAwarded = 0
  if (leveledUp) {
    for (let level = oldLevel + 1; level <= newLevel; level++) {
      coinsAwarded += coinsPerLevel[level - 1] ?? 0
    }
  }

  // Update state
  const { error } = await supabase
    .from('economy_state')
    .update({
      total_vp: newTotalVp,
      current_level: newLevel,
      coins: state.coins + coinsAwarded,
    })
    .eq('user_id', userId)

  if (error) throw error

  return {
    newTotalVp,
    oldLevel,
    newLevel,
    leveledUp,
    coinsAwarded,
  }
}

// =============================================================================
// DEDUCT VP (for uncompleting missions)
// =============================================================================

export interface DeductVpResult {
  newTotalVp: number
  oldLevel: number
  newLevel: number
  leveledDown: boolean
}

export async function deductVp(userId: string, vpAmount: number): Promise<DeductVpResult> {
  const state = await getOrCreateEconomyState(userId)
  const config = await getEconomyConfig()
  const { levelThresholds } = getEffectiveConfig(config)

  const oldLevel = state.current_level
  // Ensure VP doesn't go below 0
  const newTotalVp = Math.max(0, state.total_vp - vpAmount)
  const newLevel = calculateLevel(newTotalVp, levelThresholds)
  const leveledDown = newLevel < oldLevel

  // Update state - note: we don't deduct coins even if level drops
  // (coins were earned fairly, no penalty for uncompleting)
  const { error } = await supabase
    .from('economy_state')
    .update({
      total_vp: newTotalVp,
      current_level: newLevel,
    })
    .eq('user_id', userId)

  if (error) throw error

  return {
    newTotalVp,
    oldLevel,
    newLevel,
    leveledDown,
  }
}

// =============================================================================
// DAILY WIN
// =============================================================================

export interface DailyWinStatus {
  vpEarnedToday: number
  threshold: number
  achieved: boolean
  percentComplete: number
}

export async function getDailyWinStatus(userId: string): Promise<DailyWinStatus> {
  const today = getCanonicalToday()
  const todayStr = formatDate(today, 'yyyy-MM-dd')

  // Get today's mission completions
  const { data: missionCompletions, error: missionError } = await supabase
    .from('mission_completions')
    .select('vp_awarded')
    .eq('completed_by_user_id', userId)
    .eq('completion_date', todayStr)

  if (missionError) throw missionError

  // Get today's event completions
  const { data: eventCompletions, error: eventError } = await supabase
    .from('event_completions')
    .select('vp_awarded, completed_at')
    .eq('completed_by_user_id', userId)
    .gte('completed_at', `${todayStr}T00:00:00`)
    .lt('completed_at', `${todayStr}T23:59:59`)

  if (eventError) throw eventError

  const missionVp = missionCompletions?.reduce((sum, c) => sum + c.vp_awarded, 0) ?? 0
  const eventVp = eventCompletions?.reduce((sum, c) => sum + c.vp_awarded, 0) ?? 0
  const vpEarnedToday = missionVp + eventVp

  const config = await getEconomyConfig()
  const { dailyWinThreshold } = getEffectiveConfig(config)

  return {
    vpEarnedToday,
    threshold: dailyWinThreshold,
    achieved: vpEarnedToday >= dailyWinThreshold,
    percentComplete: Math.min(100, (vpEarnedToday / dailyWinThreshold) * 100),
  }
}

// =============================================================================
// COINS
// =============================================================================

export async function spendCoins(userId: string, amount: number): Promise<boolean> {
  const state = await getOrCreateEconomyState(userId)

  if (state.coins < amount) {
    return false // Not enough coins
  }

  const { error } = await supabase
    .from('economy_state')
    .update({ coins: state.coins - amount })
    .eq('user_id', userId)

  if (error) throw error
  return true
}

export async function addCoins(userId: string, amount: number): Promise<void> {
  const state = await getOrCreateEconomyState(userId)

  const { error } = await supabase
    .from('economy_state')
    .update({ coins: state.coins + amount })
    .eq('user_id', userId)

  if (error) throw error
}

// =============================================================================
// GRACE TOKEN PURCHASE
// =============================================================================

import { awardGraceTokens } from '@/services/streaks'

export interface PurchaseGraceTokensResult {
  success: boolean
  tokensAwarded: number
  coinsSpent: number
  newCoinBalance: number
  newTokenQuantity: number
}

export async function purchaseGraceTokens(
  userId: string,
  tokenQuantity: number,
  coinCost: number
): Promise<PurchaseGraceTokensResult> {
  // First check if user has enough coins
  const state = await getOrCreateEconomyState(userId)

  if (state.coins < coinCost) {
    return {
      success: false,
      tokensAwarded: 0,
      coinsSpent: 0,
      newCoinBalance: state.coins,
      newTokenQuantity: 0,
    }
  }

  // Deduct coins
  const spent = await spendCoins(userId, coinCost)
  if (!spent) {
    return {
      success: false,
      tokensAwarded: 0,
      coinsSpent: 0,
      newCoinBalance: state.coins,
      newTokenQuantity: 0,
    }
  }

  // Award tokens
  const tokens = await awardGraceTokens(userId, tokenQuantity)

  return {
    success: true,
    tokensAwarded: tokenQuantity,
    coinsSpent: coinCost,
    newCoinBalance: state.coins - coinCost,
    newTokenQuantity: tokens.quantity,
  }
}

// =============================================================================
// HISTORY / STATS
// =============================================================================

export interface WeeklyStats {
  totalVp: number
  missionsCompleted: number
  eventsCompleted: number
  daysWithDailyWin: number
}

export async function getWeeklyStats(
  userId: string,
  weekStartDate: string
): Promise<WeeklyStats> {
  const weekEnd = new Date(weekStartDate)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const weekEndStr = formatDate(weekEnd, 'yyyy-MM-dd')

  // Get mission completions for the week
  const { data: missionCompletions, error: missionError } = await supabase
    .from('mission_completions')
    .select('vp_awarded, completion_date')
    .eq('completed_by_user_id', userId)
    .gte('completion_date', weekStartDate)
    .lte('completion_date', weekEndStr)

  if (missionError) throw missionError

  // Get event completions for the week
  const { data: eventCompletions, error: eventError } = await supabase
    .from('event_completions')
    .select('vp_awarded')
    .eq('completed_by_user_id', userId)
    .gte('completed_at', `${weekStartDate}T00:00:00`)
    .lte('completed_at', `${weekEndStr}T23:59:59`)

  if (eventError) throw eventError

  const missionVp = missionCompletions?.reduce((sum, c) => sum + c.vp_awarded, 0) ?? 0
  const eventVp = eventCompletions?.reduce((sum, c) => sum + c.vp_awarded, 0) ?? 0

  // Count days with daily win (simplified - would need daily VP sums)
  const config = await getEconomyConfig()
  const { dailyWinThreshold } = getEffectiveConfig(config)

  // Group completions by date to count daily wins
  const vpByDate = new Map<string, number>()
  for (const c of missionCompletions ?? []) {
    const current = vpByDate.get(c.completion_date) ?? 0
    vpByDate.set(c.completion_date, current + c.vp_awarded)
  }

  const daysWithDailyWin = Array.from(vpByDate.values()).filter(vp => vp >= dailyWinThreshold).length

  return {
    totalVp: missionVp + eventVp,
    missionsCompleted: missionCompletions?.length ?? 0,
    eventsCompleted: eventCompletions?.length ?? 0,
    daysWithDailyWin,
  }
}
