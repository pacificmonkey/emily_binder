import { supabase } from '@/lib/supabase'

export interface Badge {
  badge_id: string
  slug: string
  name: string
  description: string
  emoji: string
  category: string
  earned: boolean
  earned_at: string | null
}

export interface BadgeDefinitionAdmin {
  badge_id: string
  slug: string
  name: string
  description: string
  emoji: string
  category: string
  sort_order: number
  earned_count: number
  created_at: string
}

export async function getUserBadges(): Promise<Badge[]> {
  const { data, error } = await supabase.rpc('get_user_badges')

  if (error) throw error

  const result = data as { success: boolean; badges: Badge[]; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch badges')
  }

  return result.badges || []
}

// Admin: Get all badge definitions with earned counts
export async function getBadgeDefinitionsAdmin(): Promise<BadgeDefinitionAdmin[]> {
  const { data, error } = await supabase.rpc('get_badge_definitions_admin')

  if (error) throw error

  const result = data as { success: boolean; badges: BadgeDefinitionAdmin[]; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch badge definitions')
  }

  return result.badges || []
}

// Admin: Create a new badge definition
export async function adminCreateBadge(input: {
  slug: string
  name: string
  description: string
  emoji: string
  category?: string
}): Promise<string> {
  const { data, error } = await supabase.rpc('admin_create_badge', {
    p_slug: input.slug,
    p_name: input.name,
    p_description: input.description,
    p_emoji: input.emoji,
    p_category: input.category || 'general',
  })

  if (error) throw error

  const result = data as { success: boolean; badge_id?: string; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to create badge')
  }

  return result.badge_id!
}

// Admin: Manually award a badge to impersonated patient
export async function manuallyAwardBadge(badgeSlug: string): Promise<string> {
  const { data, error } = await supabase.rpc('manually_award_badge', {
    p_badge_slug: badgeSlug,
  })

  if (error) throw error

  const result = data as { success: boolean; user_badge_id?: string; badge_name?: string; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to award badge')
  }

  return result.badge_name || badgeSlug
}

// Admin: Revoke a badge from impersonated patient
export async function adminRevokeBadge(badgeSlug: string): Promise<void> {
  const { data, error } = await supabase.rpc('admin_revoke_badge', {
    p_badge_slug: badgeSlug,
  })

  if (error) throw error

  const result = data as { success: boolean; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to revoke badge')
  }
}
