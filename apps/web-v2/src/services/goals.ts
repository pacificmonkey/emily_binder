import { supabase } from '@/lib/supabase'
import type { GoalWithMissions, CreateGoalInput, GoalType } from '@/types/database'

export async function getGoalsByType(goalType: GoalType): Promise<GoalWithMissions[]> {
  const { data, error } = await supabase.rpc('get_goals_by_type', {
    p_goal_type: goalType,
  })

  if (error) {
    throw new Error(`Failed to load goals: ${error.message}`)
  }

  const result = data as { success: boolean; goals: GoalWithMissions[]; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch goals')
  }

  return result.goals || []
}

export async function createGoal(input: CreateGoalInput): Promise<string> {
  const { data, error } = await supabase.rpc('create_goal_with_missions', {
    p_title: input.title,
    p_description: input.description || null,
    p_goal_type: input.goal_type,
    p_missions: input.missions || [],
  })

  if (error) {
    throw new Error(`Failed to create goal: ${error.message}`)
  }

  const result = data as { success: boolean; goal_id?: string; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to create goal')
  }

  return result.goal_id!
}

export async function deleteGoal(goalId: string): Promise<void> {
  const { data, error } = await supabase.rpc('delete_goal', {
    p_goal_id: goalId,
  })

  if (error) {
    throw new Error(`Failed to delete goal: ${error.message}`)
  }

  const result = data as { success: boolean; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to delete goal')
  }
}
