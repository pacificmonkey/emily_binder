/**
 * Bonus objectives service - Daily Win coins and other bonus rewards
 */

import { supabase } from '@/lib/supabase'
import { getCanonicalToday } from '@/lib/timezone'
import { addCoins } from '@/services/economy'

const DAILY_WIN_COINS_AMOUNT = 5

/**
 * Award Daily Win coins - idempotent, won't double-award
 * Uses the UNIQUE constraint on bonus_completions to prevent duplicates
 * Returns true if coins were awarded, false if already awarded today
 */
export async function awardDailyWinCoins(userId: string): Promise<{
  awarded: boolean
  coinsAwarded: number
}> {
  // Get the daily_win_coins objective
  const { data: objective, error: objError } = await supabase
    .from('bonus_objectives')
    .select('id')
    .eq('objective_type', 'daily_win_coins')
    .eq('active', true)
    .single()

  if (objError || !objective) {
    console.warn('daily_win_coins bonus objective not found')
    return { awarded: false, coinsAwarded: 0 }
  }

  const todayStr = getCanonicalToday()

  // Try to insert completion - UNIQUE constraint prevents duplicates
  const { error: insertError } = await supabase
    .from('bonus_completions')
    .insert({
      user_id: userId,
      bonus_objective_id: objective.id,
      completion_date: todayStr,
      vp_awarded: 0, // No VP for this bonus, just coins
    })

  if (insertError) {
    // 23505 = unique constraint violation = already awarded today
    if (insertError.code === '23505') {
      return { awarded: false, coinsAwarded: 0 }
    }
    throw insertError
  }

  // Insert succeeded, now award coins
  await addCoins(userId, DAILY_WIN_COINS_AMOUNT)

  return { awarded: true, coinsAwarded: DAILY_WIN_COINS_AMOUNT }
}

/**
 * Check if daily win coins were already awarded today
 */
export async function hasDailyWinCoinsToday(userId: string): Promise<boolean> {
  const { data: objective } = await supabase
    .from('bonus_objectives')
    .select('id')
    .eq('objective_type', 'daily_win_coins')
    .eq('active', true)
    .single()

  if (!objective) return false

  const todayStr = getCanonicalToday()

  const { data, error } = await supabase
    .from('bonus_completions')
    .select('id')
    .eq('user_id', userId)
    .eq('bonus_objective_id', objective.id)
    .eq('completion_date', todayStr)
    .maybeSingle()

  if (error) throw error
  return !!data
}
