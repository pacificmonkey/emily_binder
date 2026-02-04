/**
 * Stickers hooks using React Query
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import {
  getStickerCatalog,
  getStickersWithOwnership,
  getOwnedStickers,
  purchaseSticker,
  getStickerPlacements,
  placeSticker,
  updateStickerPlacement,
  removeStickerPlacement,
  bringToFront,
  getOwnedStickerCount,
  getStickerCategories,
} from '@/services/stickers'

// Query keys
export const stickerKeys = {
  all: ['stickers'] as const,
  catalog: () => [...stickerKeys.all, 'catalog'] as const,
  categories: () => [...stickerKeys.all, 'categories'] as const,
  withOwnership: (userId: string) => [...stickerKeys.all, 'withOwnership', userId] as const,
  owned: (userId: string) => [...stickerKeys.all, 'owned', userId] as const,
  ownedCount: (userId: string) => [...stickerKeys.all, 'ownedCount', userId] as const,
  placements: (userId: string) => [...stickerKeys.all, 'placements', userId] as const,
}

/**
 * Fetch sticker catalog
 */
export function useStickerCatalog() {
  return useQuery({
    queryKey: stickerKeys.catalog(),
    queryFn: getStickerCatalog,
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}

/**
 * Fetch sticker categories
 */
export function useStickerCategories() {
  return useQuery({
    queryKey: stickerKeys.categories(),
    queryFn: getStickerCategories,
    staleTime: 1000 * 60 * 10,
  })
}

/**
 * Fetch stickers with ownership status
 */
export function useStickersWithOwnership() {
  const { user } = useAuth()

  return useQuery({
    queryKey: stickerKeys.withOwnership(user?.id ?? ''),
    queryFn: () => getStickersWithOwnership(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60, // 1 minute
  })
}

/**
 * Fetch owned stickers
 */
export function useOwnedStickers() {
  const { user } = useAuth()

  return useQuery({
    queryKey: stickerKeys.owned(user?.id ?? ''),
    queryFn: () => getOwnedStickers(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60,
  })
}

/**
 * Fetch owned sticker count
 */
export function useOwnedStickerCount() {
  const { user } = useAuth()

  return useQuery({
    queryKey: stickerKeys.ownedCount(user?.id ?? ''),
    queryFn: () => getOwnedStickerCount(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60,
  })
}

/**
 * Purchase a sticker
 */
export function usePurchaseSticker() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (stickerId: string) => purchaseSticker(user!.id, stickerId),
    onSuccess: () => {
      // Invalidate sticker and economy queries
      queryClient.invalidateQueries({ queryKey: stickerKeys.all })
      queryClient.invalidateQueries({ queryKey: ['economy'] })
      queryClient.invalidateQueries({ queryKey: ['badges'] }) // For collector badge
    },
  })
}

/**
 * Fetch sticker placements on canvas
 */
export function useStickerPlacements() {
  const { user } = useAuth()

  return useQuery({
    queryKey: stickerKeys.placements(user?.id ?? ''),
    queryFn: () => getStickerPlacements(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60,
  })
}

/**
 * Place a sticker on canvas
 */
export function usePlaceSticker() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: ({
      stickerId,
      position,
      options,
    }: {
      stickerId: string
      position: { x: number; y: number }
      options?: { scale?: number; rotation?: number }
    }) => placeSticker(user!.id, stickerId, position, options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stickerKeys.placements(user!.id) })
    },
  })
}

/**
 * Update sticker placement
 */
export function useUpdateStickerPlacement() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: ({
      placementId,
      updates,
    }: {
      placementId: string
      updates: {
        position_x?: number
        position_y?: number
        scale?: number
        rotation?: number
      }
    }) => updateStickerPlacement(placementId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stickerKeys.placements(user!.id) })
    },
  })
}

/**
 * Remove sticker from canvas
 */
export function useRemoveStickerPlacement() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (placementId: string) => removeStickerPlacement(placementId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stickerKeys.placements(user!.id) })
    },
  })
}

/**
 * Bring sticker to front
 */
export function useBringToFront() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (placementId: string) => bringToFront(user!.id, placementId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stickerKeys.placements(user!.id) })
    },
  })
}
