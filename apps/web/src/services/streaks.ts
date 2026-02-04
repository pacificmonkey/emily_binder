import { supabase } from '@/lib/supabase'
import type { StreakWithState, CreateStreakInput } from '@/types/database'

// Get all streaks with their current state
export async function getStreaks(): Promise<StreakWithState[]> {
  const { data, error } = await supabase.rpc('get_streaks')

  if (error) {
    console.error('Error fetching streaks:', error)
    throw new Error(`Failed to load streaks: ${error.message}`)
  }

  const result = data as { success: boolean; streaks: StreakWithState[]; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to load streaks')
  }

  return result.streaks || []
}

// Use a shield token to protect a broken streak
export async function useShieldToken(streakDefinitionId: string): Promise<void> {
  const { data, error } = await supabase.rpc('use_shield_token', {
    p_streak_definition_id: streakDefinitionId,
  })

  if (error) {
    console.error('Error using shield token:', error)
    throw new Error(`Failed to use shield token: ${error.message}`)
  }

  const result = data as { success: boolean; message?: string; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to use shield token')
  }
}

// Admin: Create a streak definition
export async function createStreak(
  input: CreateStreakInput
): Promise<{ streak_definition_id: string; streak_state_id: string }> {
  const { data, error } = await supabase.rpc('create_streak_definition', {
    p_name: input.name,
    p_template_key: input.template_key,
    p_period: input.period,
    p_coin_reward: input.coin_reward || 0,
    p_count_threshold: input.count_threshold || null,
    p_filter_config: input.filter_config || null,
    p_bonus_milestones: input.bonus_milestones || null,
    p_break_behavior: input.break_behavior || 'break',
    p_shield_token_item_id: input.shield_token_item_id || null,
    p_auto_use_token: input.auto_use_token ?? true,
    p_max_token_uses_per_month: input.max_token_uses_per_month || null,
    p_timezone: input.timezone || 'America/Los_Angeles',
  })

  if (error) {
    console.error('Error creating streak:', error)
    throw new Error(`Failed to create streak: ${error.message}`)
  }

  const result = data as {
    success: boolean
    streak_definition_id?: string
    streak_state_id?: string
    error?: string
  }

  if (!result.success) {
    throw new Error(result.error || 'Failed to create streak')
  }

  return {
    streak_definition_id: result.streak_definition_id!,
    streak_state_id: result.streak_state_id!,
  }
}
