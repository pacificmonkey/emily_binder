/**
 * Mood service - Check-ins, feelings vocabulary, and history
 * Based on "How We Feel" app style (energy x pleasantness quadrant)
 */

import { supabase } from '@/lib/supabase'
import type { MoodFeeling, MoodLog, MoodQuadrant } from '@/types/database'
import { getCanonicalToday, formatDate } from '@/lib/timezone'

// Constants
const MAX_CHECKINS_PER_DAY = 3
const COOLDOWN_HOURS = 3

// =============================================================================
// MOOD FEELINGS (VOCABULARY)
// =============================================================================

export async function getMoodFeelings(): Promise<MoodFeeling[]> {
  const { data, error } = await supabase
    .from('mood_feelings')
    .select('*')
    .eq('active', true)
    .order('quadrant')
    .order('sort_order')

  if (error) throw error
  return data ?? []
}

export async function getMoodFeelingsByQuadrant(
  quadrant: MoodQuadrant
): Promise<MoodFeeling[]> {
  const { data, error } = await supabase
    .from('mood_feelings')
    .select('*')
    .eq('quadrant', quadrant)
    .eq('active', true)
    .order('sort_order')

  if (error) throw error
  return data ?? []
}

export function groupFeelingsByQuadrant(
  feelings: MoodFeeling[]
): Record<MoodQuadrant, MoodFeeling[]> {
  const groups: Record<MoodQuadrant, MoodFeeling[]> = {
    high_energy_pleasant: [],
    high_energy_unpleasant: [],
    low_energy_pleasant: [],
    low_energy_unpleasant: [],
  }

  for (const feeling of feelings) {
    groups[feeling.quadrant].push(feeling)
  }

  return groups
}

// =============================================================================
// MOOD CHECK-INS
// =============================================================================

export interface MoodCheckinStatus {
  canCheckin: boolean
  checkinsToday: number
  maxCheckins: number
  nextAvailableAt: Date | null
  cooldownMinutes: number | null
}

export async function getMoodCheckinStatus(userId: string): Promise<MoodCheckinStatus> {
  const today = getCanonicalToday()
  const todayStart = new Date(today)
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(today)
  todayEnd.setHours(23, 59, 59, 999)

  // Get today's mood logs
  const { data: todayLogs, error } = await supabase
    .from('mood_logs')
    .select('logged_at')
    .eq('user_id', userId)
    .gte('logged_at', todayStart.toISOString())
    .lte('logged_at', todayEnd.toISOString())
    .order('logged_at', { ascending: false })

  if (error) throw error

  const checkinsToday = todayLogs?.length ?? 0

  // Check cooldown from last checkin
  let nextAvailableAt: Date | null = null
  let cooldownMinutes: number | null = null

  if (todayLogs && todayLogs.length > 0) {
    const lastCheckin = new Date(todayLogs[0].logged_at)
    const cooldownEnd = new Date(lastCheckin.getTime() + COOLDOWN_HOURS * 60 * 60 * 1000)
    const now = new Date()

    if (cooldownEnd > now) {
      nextAvailableAt = cooldownEnd
      cooldownMinutes = Math.ceil((cooldownEnd.getTime() - now.getTime()) / (60 * 1000))
    }
  }

  const canCheckin = checkinsToday < MAX_CHECKINS_PER_DAY && nextAvailableAt === null

  return {
    canCheckin,
    checkinsToday,
    maxCheckins: MAX_CHECKINS_PER_DAY,
    nextAvailableAt,
    cooldownMinutes,
  }
}

export interface CreateMoodLogInput {
  user_id: string
  quadrant: MoodQuadrant
  feelings: string[] // 1-2 feeling names
  intensity?: number | null // 1-5 scale
  note?: string | null
}

export async function createMoodLog(input: CreateMoodLogInput): Promise<MoodLog> {
  // Validate feelings count
  if (input.feelings.length < 1 || input.feelings.length > 2) {
    throw new Error('Please select 1-2 feelings')
  }

  // Validate intensity if provided
  if (input.intensity !== null && input.intensity !== undefined) {
    if (input.intensity < 1 || input.intensity > 5) {
      throw new Error('Intensity must be between 1 and 5')
    }
  }

  // Check cooldown and daily limit
  const status = await getMoodCheckinStatus(input.user_id)
  if (!status.canCheckin) {
    if (status.checkinsToday >= status.maxCheckins) {
      throw new Error(`You've reached the maximum of ${status.maxCheckins} check-ins for today`)
    }
    if (status.cooldownMinutes) {
      throw new Error(`Please wait ${status.cooldownMinutes} minutes before your next check-in`)
    }
  }

  const { data, error } = await supabase
    .from('mood_logs')
    .insert({
      user_id: input.user_id,
      quadrant: input.quadrant,
      feelings: input.feelings,
      intensity: input.intensity ?? null,
      note: input.note ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// =============================================================================
// MOOD HISTORY (Joey only via RLS)
// =============================================================================

export async function getMoodLogsForUser(
  userId: string,
  limit: number = 50
): Promise<MoodLog[]> {
  const { data, error } = await supabase
    .from('mood_logs')
    .select('*')
    .eq('user_id', userId)
    .order('logged_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data ?? []
}

export async function getMoodLogsForDateRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<MoodLog[]> {
  const { data, error } = await supabase
    .from('mood_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('logged_at', `${startDate}T00:00:00`)
    .lte('logged_at', `${endDate}T23:59:59`)
    .order('logged_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

// =============================================================================
// MOOD STATS
// =============================================================================

export interface MoodStats {
  totalCheckins: number
  quadrantCounts: Record<MoodQuadrant, number>
  topFeelings: { name: string; count: number }[]
  averageIntensity: number | null
}

export async function getMoodStats(
  userId: string,
  days: number = 30
): Promise<MoodStats> {
  const today = getCanonicalToday()
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - days)
  const startDateStr = formatDate(startDate, 'yyyy-MM-dd')
  const todayStr = formatDate(today, 'yyyy-MM-dd')

  const logs = await getMoodLogsForDateRange(userId, startDateStr, todayStr)

  const quadrantCounts: Record<MoodQuadrant, number> = {
    high_energy_pleasant: 0,
    high_energy_unpleasant: 0,
    low_energy_pleasant: 0,
    low_energy_unpleasant: 0,
  }

  const feelingCounts = new Map<string, number>()
  let totalIntensity = 0
  let intensityCount = 0

  for (const log of logs) {
    quadrantCounts[log.quadrant]++

    for (const feeling of log.feelings) {
      feelingCounts.set(feeling, (feelingCounts.get(feeling) ?? 0) + 1)
    }

    if (log.intensity !== null) {
      totalIntensity += log.intensity
      intensityCount++
    }
  }

  const topFeelings = Array.from(feelingCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }))

  return {
    totalCheckins: logs.length,
    quadrantCounts,
    topFeelings,
    averageIntensity: intensityCount > 0 ? totalIntensity / intensityCount : null,
  }
}

// =============================================================================
// QUADRANT HELPERS
// =============================================================================

export const QUADRANT_LABELS: Record<MoodQuadrant, string> = {
  high_energy_pleasant: 'High Energy, Pleasant',
  high_energy_unpleasant: 'High Energy, Unpleasant',
  low_energy_pleasant: 'Low Energy, Pleasant',
  low_energy_unpleasant: 'Low Energy, Unpleasant',
}

export const QUADRANT_COLORS: Record<MoodQuadrant, string> = {
  high_energy_pleasant: '#4ade80', // green
  high_energy_unpleasant: '#f87171', // red
  low_energy_pleasant: '#60a5fa', // blue
  low_energy_unpleasant: '#a78bfa', // purple
}

export const QUADRANT_EMOJIS: Record<MoodQuadrant, string> = {
  high_energy_pleasant: '😊',
  high_energy_unpleasant: '😤',
  low_energy_pleasant: '😌',
  low_energy_unpleasant: '😔',
}
