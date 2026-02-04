/**
 * Badges hooks using React Query
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import {
  getUserBadges,
  getRecentBadges,
  getBadgeCount,
  awardBadge,
  BADGE_INFO,
} from '@/services/badges'
import type { BadgeType } from '@/services/badges'

// Query keys
export const badgeKeys = {
  all: ['badges'] as const,
  user: (userId: string) => [...badgeKeys.all, 'user', userId] as const,
  recent: (userId: string) => [...badgeKeys.all, 'recent', userId] as const,
  count: (userId: string) => [...badgeKeys.all, 'count', userId] as const,
}

/**
 * Fetch all badges for the current user
 */
export function useUserBadges() {
  const { user } = useAuth()

  return useQuery({
    queryKey: badgeKeys.user(user?.id ?? ''),
    queryFn: () => getUserBadges(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Fetch recent badges
 */
export function useRecentBadges(limit: number = 5) {
  const { user } = useAuth()

  return useQuery({
    queryKey: [...badgeKeys.recent(user?.id ?? ''), limit],
    queryFn: () => getRecentBadges(user!.id, limit),
    enabled: !!user,
    staleTime: 1000 * 60, // 1 minute
  })
}

/**
 * Fetch badge count
 */
export function useBadgeCount() {
  const { user } = useAuth()

  return useQuery({
    queryKey: badgeKeys.count(user?.id ?? ''),
    queryFn: () => getBadgeCount(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  })
}

/**
 * Award a badge to the current user
 */
export function useAwardBadge() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: ({ badgeType, relatedMissionId }: { badgeType: BadgeType; relatedMissionId?: string }) =>
      awardBadge(user!.id, badgeType, relatedMissionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: badgeKeys.all })
    },
  })
}

/**
 * Get badge info helper
 */
export function useBadgeInfo(badgeType: string) {
  const info = BADGE_INFO[badgeType as BadgeType]
  return info || { name: badgeType, description: '', icon: '🏅' }
}

/**
 * Hook to get badges grouped by type
 */
export function useBadgesByType() {
  const { data: badges, ...rest } = useUserBadges()

  const grouped = badges?.reduce((acc, badge) => {
    const type = badge.badge_type
    if (!acc[type]) {
      acc[type] = []
    }
    acc[type].push(badge)
    return acc
  }, {} as Record<string, typeof badges>)

  return { data: grouped, ...rest }
}

// Re-export badge info for use in components
export { BADGE_INFO }
