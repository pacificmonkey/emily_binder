/**
 * Economy hooks using React Query
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import {
  getOrCreateEconomyState,
  getEconomyConfig,
  getEffectiveConfig,
  getDailyWinStatus,
  getVpForNextLevel,
  purchaseGraceTokens,
} from '@/services/economy'
import { streakKeys } from '@/hooks/useStreaks'

// Query keys
export const economyKeys = {
  all: ['economy'] as const,
  state: (userId: string) => [...economyKeys.all, 'state', userId] as const,
  config: () => [...economyKeys.all, 'config'] as const,
  dailyWin: (userId: string) => [...economyKeys.all, 'dailyWin', userId] as const,
}

/**
 * Fetch economy state (VP, level, coins)
 */
export function useEconomyState() {
  const { user } = useAuth()

  return useQuery({
    queryKey: economyKeys.state(user?.id ?? ''),
    queryFn: () => getOrCreateEconomyState(user!.id),
    enabled: !!user,
    staleTime: 1000 * 30, // 30 seconds
  })
}

/**
 * Fetch economy config (level thresholds, etc.)
 */
export function useEconomyConfig() {
  return useQuery({
    queryKey: economyKeys.config(),
    queryFn: getEconomyConfig,
    staleTime: 1000 * 60 * 60, // 1 hour (rarely changes)
  })
}

/**
 * Get daily win status
 */
export function useDailyWinStatus() {
  const { user } = useAuth()

  return useQuery({
    queryKey: economyKeys.dailyWin(user?.id ?? ''),
    queryFn: () => getDailyWinStatus(user!.id),
    enabled: !!user,
    staleTime: 1000 * 30,
  })
}

/**
 * Combined hook for economy display data
 */
export function useEconomyDisplay() {
  const { data: state, isLoading: stateLoading } = useEconomyState()
  const { data: config, isLoading: configLoading } = useEconomyConfig()
  const { data: dailyWin, isLoading: dailyWinLoading } = useDailyWinStatus()

  const effectiveConfig = getEffectiveConfig(config ?? null)

  const levelProgress = state
    ? getVpForNextLevel(state.total_vp, effectiveConfig.levelThresholds)
    : null

  return {
    state,
    config: effectiveConfig,
    dailyWin,
    levelProgress,
    isLoading: stateLoading || configLoading || dailyWinLoading,
  }
}

/**
 * Purchase grace tokens with coins
 */
export function usePurchaseGraceTokens() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: ({ tokenQuantity, coinCost }: { tokenQuantity: number; coinCost: number }) =>
      purchaseGraceTokens(user!.id, tokenQuantity, coinCost),
    onSuccess: () => {
      // Invalidate both economy and grace token queries
      queryClient.invalidateQueries({ queryKey: economyKeys.all })
      queryClient.invalidateQueries({ queryKey: streakKeys.all })
    },
  })
}
