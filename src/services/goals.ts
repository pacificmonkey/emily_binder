/**
 * Goals service - manages Destinies (Emily-created) and Quests (Support-created)
 */

import { supabase } from '@/lib/supabase'
import type { Goal, GoalItem, GoalType } from '@/types/database'

export interface GoalWithItems extends Goal {
  items: GoalItem[]
}

export interface CreateGoalInput {
  owner_user_id: string
  created_by_user_id: string
  title: string
  description_md?: string | null
  goal_type: GoalType
}

export interface CreateGoalItemInput {
  goal_id: string
  mission_id?: string | null
  attachment_url?: string | null
  attachment_name?: string | null
  sort_order?: number
}

// Type for the joined query result
interface GoalWithItemsRaw extends Goal {
  goal_items: GoalItem[]
}

/**
 * Transform raw joined result to GoalWithItems format
 */
function transformGoalWithItems(raw: GoalWithItemsRaw): GoalWithItems {
  return {
    ...raw,
    items: raw.goal_items || [],
  }
}

/**
 * Get all goals for a user (single query with join)
 */
export async function getUserGoals(userId: string): Promise<GoalWithItems[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('*, goal_items(*)')
    .eq('owner_user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error

  // Sort items within each goal by sort_order
  return (data as GoalWithItemsRaw[] || []).map(goal => ({
    ...transformGoalWithItems(goal),
    items: goal.goal_items?.sort((a, b) => a.sort_order - b.sort_order) || [],
  }))
}

/**
 * Get goals by type (destiny or quest) - single query with join
 */
export async function getGoalsByType(
  userId: string,
  goalType: GoalType
): Promise<GoalWithItems[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('*, goal_items(*)')
    .eq('owner_user_id', userId)
    .eq('goal_type', goalType)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data as GoalWithItemsRaw[] || []).map(goal => ({
    ...transformGoalWithItems(goal),
    items: goal.goal_items?.sort((a, b) => a.sort_order - b.sort_order) || [],
  }))
}

/**
 * Get a single goal with its items
 */
export async function getGoal(goalId: string): Promise<GoalWithItems | null> {
  const { data, error } = await supabase
    .from('goals')
    .select('*, goal_items(*)')
    .eq('id', goalId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  const raw = data as GoalWithItemsRaw
  return {
    ...transformGoalWithItems(raw),
    items: raw.goal_items?.sort((a, b) => a.sort_order - b.sort_order) || [],
  }
}

/**
 * Create a new goal
 */
export async function createGoal(input: CreateGoalInput): Promise<Goal> {
  const { data, error } = await supabase
    .from('goals')
    .insert({
      owner_user_id: input.owner_user_id,
      created_by_user_id: input.created_by_user_id,
      title: input.title,
      description_md: input.description_md || null,
      goal_type: input.goal_type,
      is_completed: false,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update a goal
 */
export async function updateGoal(
  goalId: string,
  updates: Partial<Pick<Goal, 'title' | 'description_md' | 'is_completed'>>
): Promise<Goal> {
  const { data, error } = await supabase
    .from('goals')
    .update({
      ...updates,
      completed_at: updates.is_completed ? new Date().toISOString() : null,
    })
    .eq('id', goalId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete a goal and its items
 */
export async function deleteGoal(goalId: string): Promise<void> {
  // Items are deleted via cascade
  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', goalId)

  if (error) throw error
}

/**
 * Add an item to a goal
 */
export async function addGoalItem(input: CreateGoalItemInput): Promise<GoalItem> {
  // Get the max sort_order for this goal
  const { data: existing } = await supabase
    .from('goal_items')
    .select('sort_order')
    .eq('goal_id', input.goal_id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const sortOrder = input.sort_order ?? ((existing?.sort_order ?? 0) + 1)

  const { data, error } = await supabase
    .from('goal_items')
    .insert({
      goal_id: input.goal_id,
      mission_id: input.mission_id || null,
      attachment_url: input.attachment_url || null,
      attachment_name: input.attachment_name || null,
      sort_order: sortOrder,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Remove an item from a goal
 */
export async function removeGoalItem(itemId: string): Promise<void> {
  const { error } = await supabase
    .from('goal_items')
    .delete()
    .eq('id', itemId)

  if (error) throw error
}

/**
 * Reorder goal items
 */
export async function reorderGoalItems(
  goalId: string,
  itemIds: string[]
): Promise<void> {
  const updates = itemIds.map((id, index) => ({
    id,
    sort_order: index + 1,
  }))

  for (const update of updates) {
    await supabase
      .from('goal_items')
      .update({ sort_order: update.sort_order })
      .eq('id', update.id)
      .eq('goal_id', goalId)
  }
}

/**
 * Get active (incomplete) goals - single query with join
 */
export async function getActiveGoals(userId: string): Promise<GoalWithItems[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('*, goal_items(*)')
    .eq('owner_user_id', userId)
    .eq('is_completed', false)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data as GoalWithItemsRaw[] || []).map(goal => ({
    ...transformGoalWithItems(goal),
    items: goal.goal_items?.sort((a, b) => a.sort_order - b.sort_order) || [],
  }))
}

/**
 * Get completed goals - single query with join
 */
export async function getCompletedGoals(userId: string): Promise<GoalWithItems[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('*, goal_items(*)')
    .eq('owner_user_id', userId)
    .eq('is_completed', true)
    .order('completed_at', { ascending: false })

  if (error) throw error

  return (data as GoalWithItemsRaw[] || []).map(goal => ({
    ...transformGoalWithItems(goal),
    items: goal.goal_items?.sort((a, b) => a.sort_order - b.sort_order) || [],
  }))
}

/**
 * Get goal progress - how many linked missions are complete
 */
export interface GoalProgress {
  totalMissions: number
  completedMissions: number
  percentComplete: number
}

export async function getGoalProgress(goalId: string): Promise<GoalProgress> {
  const goal = await getGoal(goalId)
  if (!goal) {
    return { totalMissions: 0, completedMissions: 0, percentComplete: 0 }
  }

  // Get all mission IDs linked to this goal
  const missionIds = goal.items
    .filter(item => item.mission_id)
    .map(item => item.mission_id!)

  if (missionIds.length === 0) {
    return { totalMissions: 0, completedMissions: 0, percentComplete: 100 }
  }

  // Check which missions have at least one completion
  const { data: completions, error } = await supabase
    .from('mission_completions')
    .select('mission_id')
    .in('mission_id', missionIds)

  if (error) throw error

  const completedMissionIds = new Set(completions?.map(c => c.mission_id) || [])
  const completedCount = missionIds.filter(id => completedMissionIds.has(id)).length

  return {
    totalMissions: missionIds.length,
    completedMissions: completedCount,
    percentComplete: Math.round((completedCount / missionIds.length) * 100),
  }
}

/**
 * Check if a goal can be marked complete
 * A goal is completable when all linked missions have been completed at least once
 */
export async function checkGoalCompletable(goalId: string): Promise<boolean> {
  const goal = await getGoal(goalId)
  if (!goal) return false

  // Get all mission IDs linked to this goal
  const missionIds = goal.items
    .filter(item => item.mission_id)
    .map(item => item.mission_id!)

  if (missionIds.length === 0) {
    // No missions linked = always completable
    return true
  }

  // Check if all missions have at least one completion
  const { data: completions, error } = await supabase
    .from('mission_completions')
    .select('mission_id')
    .in('mission_id', missionIds)

  if (error) throw error

  const completedMissionIds = new Set(completions?.map(c => c.mission_id) || [])
  return missionIds.every(id => completedMissionIds.has(id))
}
