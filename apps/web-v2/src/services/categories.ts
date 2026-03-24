import { supabase } from '@/lib/supabase'
import type { MissionCategory } from '@/types/database'

export async function getMissionCategories(): Promise<MissionCategory[]> {
  const { data, error } = await supabase.rpc('get_mission_categories')

  if (error) throw error

  const result = data as { success: boolean; categories: MissionCategory[]; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch categories')
  }

  return result.categories || []
}

export async function createMissionCategory(input: {
  name: string
  color?: string
  icon?: string
  base_points?: number
  sort_order?: number
}): Promise<string> {
  const { data, error } = await supabase.rpc('create_mission_category', {
    p_name: input.name,
    p_color: input.color || '#6B7280',
    p_icon: input.icon || 'tag',
    p_base_points: input.base_points ?? 5,
    p_sort_order: input.sort_order ?? 0,
  })

  if (error) throw error

  const result = data as { success: boolean; mission_category_id?: string; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to create category')
  }

  return result.mission_category_id!
}

export async function updateMissionCategory(input: {
  mission_category_id: string
  name?: string
  color?: string
  icon?: string
  base_points?: number
  sort_order?: number
  is_active?: boolean
}): Promise<void> {
  const { data, error } = await supabase.rpc('update_mission_category', {
    p_mission_category_id: input.mission_category_id,
    p_name: input.name ?? null,
    p_color: input.color ?? null,
    p_icon: input.icon ?? null,
    p_base_points: input.base_points ?? null,
    p_sort_order: input.sort_order ?? null,
    p_is_active: input.is_active ?? null,
  })

  if (error) throw error

  const result = data as { success: boolean; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to update category')
  }
}

export async function deleteMissionCategory(id: string): Promise<void> {
  const { data, error } = await supabase.rpc('delete_mission_category', {
    p_mission_category_id: id,
  })

  if (error) throw error

  const result = data as { success: boolean; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to delete category')
  }
}
