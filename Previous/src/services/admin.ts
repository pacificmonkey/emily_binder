/**
 * Admin service - Proposals, Joey Todos, and admin management
 */

import { supabase } from '@/lib/supabase'
import type {
  MissionProposal,
  JoeyTodo,
  ProposalStatus,
  Category,
  EconomyConfig,
  MoodFeeling,
} from '@/types/database'

// =============================================================================
// PROPOSALS
// =============================================================================

export interface ProposalWithRelations extends MissionProposal {
  category?: Category
}

/**
 * Get all pending proposals
 */
export async function getPendingProposals(): Promise<ProposalWithRelations[]> {
  const { data, error } = await supabase
    .from('mission_proposals')
    .select('*, category:categories(*)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as ProposalWithRelations[]
}

/**
 * Get all proposals (for history view)
 */
export async function getAllProposals(limit: number = 50): Promise<ProposalWithRelations[]> {
  const { data, error } = await supabase
    .from('mission_proposals')
    .select('*, category:categories(*)')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data || []) as ProposalWithRelations[]
}

/**
 * Review a proposal (approve or reject)
 */
export async function reviewProposal(
  proposalId: string,
  reviewerId: string,
  status: 'approved' | 'rejected'
): Promise<MissionProposal> {
  const { data, error } = await supabase
    .from('mission_proposals')
    .update({
      status,
      reviewed_by_user_id: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', proposalId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get proposal count by status
 */
export async function getProposalCounts(): Promise<Record<ProposalStatus, number>> {
  const { data, error } = await supabase
    .from('mission_proposals')
    .select('status')

  if (error) throw error

  const counts: Record<ProposalStatus, number> = {
    pending: 0,
    approved: 0,
    rejected: 0,
  }

  for (const row of data || []) {
    counts[row.status as ProposalStatus]++
  }

  return counts
}

// =============================================================================
// JOEY TODOS
// =============================================================================

/**
 * Get all open Joey todos
 */
export async function getOpenTodos(): Promise<JoeyTodo[]> {
  const { data, error } = await supabase
    .from('joey_todos')
    .select('*')
    .eq('status', 'open')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Get all Joey todos
 */
export async function getAllTodos(limit: number = 50): Promise<JoeyTodo[]> {
  const { data, error } = await supabase
    .from('joey_todos')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

/**
 * Mark a Joey todo as done
 */
export async function resolveTodo(todoId: string): Promise<JoeyTodo> {
  const { data, error } = await supabase
    .from('joey_todos')
    .update({
      status: 'done',
      resolved_at: new Date().toISOString(),
    })
    .eq('id', todoId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Create a Joey todo (used by system for alerts)
 */
export async function createTodo(input: {
  type: JoeyTodo['type']
  title: string
  description?: string | null
  related_id?: string | null
}): Promise<JoeyTodo> {
  const { data, error } = await supabase
    .from('joey_todos')
    .insert({
      type: input.type,
      title: input.title,
      description: input.description || null,
      related_id: input.related_id || null,
      status: 'open',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// =============================================================================
// ECONOMY CONFIG
// =============================================================================

/**
 * Get economy configuration
 */
export async function getEconomyConfigAdmin(): Promise<EconomyConfig | null> {
  const { data, error } = await supabase
    .from('economy_config')
    .select('*')
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data
}

/**
 * Update economy configuration
 */
export async function updateEconomyConfig(
  updates: Partial<Omit<EconomyConfig, 'id' | 'created_at' | 'updated_at'>>
): Promise<EconomyConfig> {
  // Get existing config ID
  const existing = await getEconomyConfigAdmin()

  if (existing) {
    const { data, error } = await supabase
      .from('economy_config')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    // Create new config with defaults
    const { data, error } = await supabase
      .from('economy_config')
      .insert({
        level_thresholds: updates.level_thresholds ?? [0, 100, 250, 500, 1000, 2000, 4000, 8000, 16000, 32000],
        coins_per_level: updates.coins_per_level ?? [0, 5, 5, 10, 10, 15, 15, 20, 20, 25],
        daily_win_threshold: updates.daily_win_threshold ?? 50,
        mandatory_event_multiplier: updates.mandatory_event_multiplier ?? 2,
        grace_token_cost: updates.grace_token_cost ?? 20,
        weekly_streak_prompt_day: updates.weekly_streak_prompt_day ?? 6,
        weekly_streak_prompt_hour: updates.weekly_streak_prompt_hour ?? 18,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }
}

// =============================================================================
// MOOD VOCABULARY
// =============================================================================

/**
 * Get all mood feelings (including inactive)
 */
export async function getAllMoodFeelings(): Promise<MoodFeeling[]> {
  const { data, error } = await supabase
    .from('mood_feelings')
    .select('*')
    .order('quadrant')
    .order('sort_order')

  if (error) throw error
  return data || []
}

/**
 * Create a mood feeling
 */
export async function createMoodFeeling(input: Omit<MoodFeeling, 'id'>): Promise<MoodFeeling> {
  const { data, error } = await supabase
    .from('mood_feelings')
    .insert(input)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update a mood feeling
 */
export async function updateMoodFeeling(
  id: string,
  updates: Partial<Omit<MoodFeeling, 'id'>>
): Promise<MoodFeeling> {
  const { data, error } = await supabase
    .from('mood_feelings')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// =============================================================================
// MOOD HISTORY (Joey-only view)
// =============================================================================

import type { MoodLog } from '@/types/database'

export interface MoodLogWithDetails extends MoodLog {
  // Could add joined data here if needed
}

/**
 * Get mood history for a user (Joey only)
 */
export async function getMoodHistory(
  userId: string,
  limit: number = 100
): Promise<MoodLogWithDetails[]> {
  const { data, error } = await supabase
    .from('mood_logs')
    .select('*')
    .eq('user_id', userId)
    .order('logged_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

/**
 * Get mood summary stats
 */
export async function getMoodSummary(
  userId: string,
  days: number = 30
): Promise<{ total: number; byQuadrant: Record<string, number> }> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)

  const { data, error } = await supabase
    .from('mood_logs')
    .select('quadrant')
    .eq('user_id', userId)
    .gte('logged_at', cutoff.toISOString())

  if (error) throw error

  const byQuadrant: Record<string, number> = {
    high_energy_pleasant: 0,
    high_energy_unpleasant: 0,
    low_energy_pleasant: 0,
    low_energy_unpleasant: 0,
  }

  for (const row of data || []) {
    byQuadrant[row.quadrant]++
  }

  return {
    total: data?.length || 0,
    byQuadrant,
  }
}

// =============================================================================
// STICKER CATALOG MANAGEMENT
// =============================================================================

import type { StickerCatalog } from '@/types/database'

/**
 * Get all stickers (including inactive)
 */
export async function getAllStickers(): Promise<StickerCatalog[]> {
  const { data, error } = await supabase
    .from('sticker_catalog')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * Create a sticker
 */
export async function createSticker(input: {
  name: string
  image_url: string
  cost_coins: number
  category?: string | null
  tags?: string[] | null
  sort_order?: number
}): Promise<StickerCatalog> {
  const { data, error } = await supabase
    .from('sticker_catalog')
    .insert({
      name: input.name,
      image_url: input.image_url,
      cost_coins: input.cost_coins,
      category: input.category || null,
      tags: input.tags || null,
      sort_order: input.sort_order ?? 0,
      active: true,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update a sticker
 */
export async function updateSticker(
  id: string,
  updates: Partial<Omit<StickerCatalog, 'id' | 'created_at'>>
): Promise<StickerCatalog> {
  const { data, error } = await supabase
    .from('sticker_catalog')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete/deactivate a sticker
 */
export async function deleteSticker(id: string): Promise<void> {
  const { error } = await supabase
    .from('sticker_catalog')
    .update({ active: false })
    .eq('id', id)

  if (error) throw error
}

// =============================================================================
// GOALS MANAGEMENT (Joey can manage all goals)
// =============================================================================

import type { Goal } from '@/types/database'

export interface GoalWithOwner extends Goal {
  owner?: { display_name: string }
}

/**
 * Get all goals (all users, for Joey admin view)
 */
export async function getAllGoals(): Promise<GoalWithOwner[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('*, owner:profiles!goals_owner_user_id_fkey(display_name)')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as GoalWithOwner[]
}

/**
 * Update a goal (Joey can update any goal)
 */
export async function updateGoalAdmin(
  id: string,
  updates: Partial<Pick<Goal, 'title' | 'description_md' | 'is_completed' | 'archived'>>
): Promise<Goal> {
  const { data, error } = await supabase
    .from('goals')
    .update({
      ...updates,
      completed_at: updates.is_completed ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete a goal (Joey only)
 */
export async function deleteGoalAdmin(id: string): Promise<void> {
  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', id)

  if (error) throw error
}
