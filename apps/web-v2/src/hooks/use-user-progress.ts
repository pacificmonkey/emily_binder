import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useUserProgress() {
  return useQuery({
    queryKey: ['user-progress'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_progress')
      if (error) throw error
      const result = data as {
        success: boolean
        total_points?: number
        current_level?: number
        level_progress?: number
        level_target?: number
        points_today?: number
        error?: string
      }
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch user progress')
      }
      // Normalize field names for consumers (today page + profile page)
      return {
        ...result,
        level: result.current_level,
        total_vp: result.total_points,
        current_level_vp: result.level_progress,
        next_level_vp: result.level_target,
      }
    },
    staleTime: 60 * 1000,
  })
}
