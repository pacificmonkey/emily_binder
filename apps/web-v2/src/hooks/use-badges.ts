import { useQuery } from '@tanstack/react-query'
import { getUserBadges } from '@/services/badges'

export function useBadges() {
  return useQuery({
    queryKey: ['badges'],
    queryFn: () => getUserBadges(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
