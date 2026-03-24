import { supabase } from '@/lib/supabase'
import type { WorkspaceConfig, DailyWinStatus } from '@/types/database'

export async function getWorkspaceConfig(): Promise<WorkspaceConfig> {
  const { data, error } = await supabase.rpc('get_workspace_config')

  if (error) throw error

  const result = data as { success: boolean; config: WorkspaceConfig; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch workspace config')
  }

  return result.config
}

export async function updateWorkspaceConfig(input: {
  daily_win_vp_target?: number
  daily_win_enabled?: boolean
  daily_win_streak_enabled?: boolean
  difficulty_multiplier_easy?: number
  difficulty_multiplier_medium?: number
  difficulty_multiplier_hard?: number
}): Promise<void> {
  const { data, error } = await supabase.rpc('update_workspace_config', {
    p_daily_win_vp_target: input.daily_win_vp_target ?? null,
    p_daily_win_enabled: input.daily_win_enabled ?? null,
    p_daily_win_streak_enabled: input.daily_win_streak_enabled ?? null,
    p_difficulty_multiplier_easy: input.difficulty_multiplier_easy ?? null,
    p_difficulty_multiplier_medium: input.difficulty_multiplier_medium ?? null,
    p_difficulty_multiplier_hard: input.difficulty_multiplier_hard ?? null,
  })

  if (error) throw error

  const result = data as { success: boolean; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to update workspace config')
  }
}

export async function getDailyWinStatus(): Promise<DailyWinStatus> {
  const { data, error } = await supabase.rpc('get_daily_win_status')

  if (error) throw error

  const result = data as { success: boolean; error?: string } & DailyWinStatus

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch daily win status')
  }

  return {
    vp_earned_today: result.vp_earned_today,
    threshold: result.threshold,
    is_won: result.is_won,
    daily_win_enabled: result.daily_win_enabled,
  }
}
