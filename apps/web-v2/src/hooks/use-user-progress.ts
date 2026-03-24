import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useUserProgress() {
  return useQuery({
    queryKey: ['user-progress'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_progress')
      if (error) throw error
      return data
    },
    staleTime: 60 * 1000,
  })
}
