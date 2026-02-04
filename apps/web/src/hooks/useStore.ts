import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getCoinBalance,
  getCoinHistory,
  getStoreItems,
  getUserInventory,
  purchaseItem,
  getHomeDecorations,
  placeSticker,
  updateDecoration,
  removeDecoration,
  createStoreItem,
  createSticker,
} from '@/services/store'
import type {
  CreateStoreItemInput,
  CreateStickerInput,
  PlaceStickerInput,
  UpdateDecorationInput,
} from '@/types/database'

// Query keys
export const storeKeys = {
  all: ['store'] as const,
  coinBalance: ['store', 'coinBalance'] as const,
  coinHistory: ['store', 'coinHistory'] as const,
  items: ['store', 'items'] as const,
  inventory: ['store', 'inventory'] as const,
  decorations: ['store', 'decorations'] as const,
}

// Hook for coin balance
export function useCoinBalance() {
  return useQuery({
    queryKey: storeKeys.coinBalance,
    queryFn: getCoinBalance,
  })
}

// Hook for coin history
export function useCoinHistory(limit = 50) {
  return useQuery({
    queryKey: [...storeKeys.coinHistory, limit],
    queryFn: () => getCoinHistory(limit),
  })
}

// Hook for store items
export function useStoreItems() {
  return useQuery({
    queryKey: storeKeys.items,
    queryFn: getStoreItems,
  })
}

// Hook for user inventory
export function useUserInventory() {
  return useQuery({
    queryKey: storeKeys.inventory,
    queryFn: getUserInventory,
  })
}

// Hook for home decorations
export function useHomeDecorations() {
  return useQuery({
    queryKey: storeKeys.decorations,
    queryFn: getHomeDecorations,
  })
}

// Mutation: Purchase item
export function usePurchaseItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ storeItemId, quantity = 1 }: { storeItemId: string; quantity?: number }) =>
      purchaseItem(storeItemId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storeKeys.coinBalance })
      queryClient.invalidateQueries({ queryKey: storeKeys.coinHistory })
      queryClient.invalidateQueries({ queryKey: storeKeys.items })
      queryClient.invalidateQueries({ queryKey: storeKeys.inventory })
    },
  })
}

// Mutation: Place sticker
export function usePlaceSticker() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: PlaceStickerInput) => placeSticker(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storeKeys.decorations })
      queryClient.invalidateQueries({ queryKey: storeKeys.inventory })
    },
  })
}

// Mutation: Update decoration
export function useUpdateDecoration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateDecorationInput) => updateDecoration(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storeKeys.decorations })
    },
  })
}

// Mutation: Remove decoration
export function useRemoveDecoration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (homeDecorationId: string) => removeDecoration(homeDecorationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storeKeys.decorations })
      queryClient.invalidateQueries({ queryKey: storeKeys.inventory })
    },
  })
}

// Admin mutation: Create store item
export function useCreateStoreItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateStoreItemInput) => createStoreItem(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storeKeys.items })
    },
  })
}

// Admin mutation: Create sticker
export function useCreateSticker() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateStickerInput) => createSticker(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storeKeys.items })
    },
  })
}
