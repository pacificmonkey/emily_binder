import { useQuery } from '@tanstack/react-query'
import * as streaksService from '@/services/streaks'

export function useStreaks() {
  return useQuery({
    queryKey: ['streaks'],
    queryFn: () => streaksService.getStreaks(),
    staleTime: 5 * 60 * 1000,
  })
}
