import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as storeService from '@/services/store'
import { toast } from '@/components/ui/toaster'

export function useCoinBalance() {
  return useQuery({
    queryKey: ['coin-balance'],
    queryFn: () => storeService.getCoinBalance(),
    staleTime: 30 * 1000,
  })
}

export function useCoinHistory(limit = 50, offset = 0) {
  return useQuery({
    queryKey: ['coin-history', limit, offset],
    queryFn: () => storeService.getCoinHistory(limit, offset),
    staleTime: 60 * 1000,
  })
}

export function useStoreItems() {
  return useQuery({
    queryKey: ['store-items'],
    queryFn: () => storeService.getStoreItems(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useUserInventory() {
  return useQuery({
    queryKey: ['user-inventory'],
    queryFn: () => storeService.getUserInventory(),
    staleTime: 60 * 1000,
  })
}

export function usePurchaseItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ storeItemId, quantity }: { storeItemId: string; quantity?: number }) =>
      storeService.purchaseItem(storeItemId, quantity),
    onSuccess: (data) => {
      // Invalidate all store-related queries
      queryClient.invalidateQueries({ queryKey: ['coin-balance'] })
      queryClient.invalidateQueries({ queryKey: ['store-items'] })
      queryClient.invalidateQueries({ queryKey: ['user-inventory'] })
      queryClient.invalidateQueries({ queryKey: ['coin-history'] })

      // Show success toast with new balance
      toast({
        title: 'Purchased!',
        description: `Balance: ${data.new_balance} coins`,
        variant: 'success',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Purchase failed',
        description: error.message,
        variant: 'error',
      })
    },
  })
}
