import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as shoppingService from '@/services/shopping'
import type {
  ShoppingListStatus,
  ShoppingListItemStatus,
  CreateShoppingListInput,
  AddShoppingItemInput,
} from '@/types/database'
import { toast } from '@/components/ui/toaster'

// ============================================================================
// Shopping Lists Hooks
// ============================================================================

export function useShoppingLists(status?: ShoppingListStatus) {
  return useQuery({
    queryKey: ['shopping-lists', status],
    queryFn: () => shoppingService.getShoppingLists(status),
    staleTime: 5 * 60 * 1000,
  })
}

export function useShoppingList(listId: string | null) {
  return useQuery({
    queryKey: ['shopping-list', listId],
    queryFn: () => shoppingService.getShoppingList(listId!),
    enabled: !!listId,
    staleTime: 2 * 60 * 1000,
  })
}

export function useCreateShoppingList() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateShoppingListInput) => shoppingService.createShoppingList(input),
    onSuccess: () => {
      toast({ title: 'Shopping list created!', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['shopping-lists'] })
    },
    onError: (error: Error) => {
      toast({
        title: "Couldn't create shopping list",
        description: error.message,
        variant: 'error',
      })
    },
  })
}

// ============================================================================
// Shopping Items Hooks - Two-Phase Checkoff
// ============================================================================

export function useUpdateItemStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ itemId, status }: { itemId: string; status: ShoppingListItemStatus }) =>
      shoppingService.updateShoppingItemStatus(itemId, status),
    onMutate: async ({ itemId, status }) => {
      // Optimistically update all shopping list caches
      queryClient.setQueriesData(
        { queryKey: ['shopping-list'] },
        (oldData: any) => {
          if (!oldData) return oldData

          return {
            ...oldData,
            items: oldData.items.map((item: any) =>
              item.shopping_list_item_id === itemId ? { ...item, status } : item
            ),
          }
        }
      )
    },
    onError: (error: Error) => {
      toast({
        title: "Couldn't update item",
        description: error.message,
        variant: 'error',
      })
    },
  })
}

export function useAddShoppingItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: AddShoppingItemInput) => shoppingService.addShoppingItem(input),
    onSuccess: (_, { shopping_list_id }) => {
      toast({ title: 'Item added!', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['shopping-list', shopping_list_id] })
    },
    onError: (error: Error) => {
      toast({
        title: "Couldn't add item",
        description: error.message,
        variant: 'error',
      })
    },
  })
}

export function useUpdateShoppingItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      itemId,
      _listId: _,
      updates,
    }: {
      itemId: string
      _listId: string
      updates: { quantity?: number; unit?: string; notes?: string }
    }) => shoppingService.updateShoppingItem(itemId, updates),
    onSuccess: (_, { _listId }) => {
      toast({ title: 'Item updated!', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['shopping-list', _listId] })
    },
    onError: (error: Error) => {
      toast({
        title: "Couldn't update item",
        description: error.message,
        variant: 'error',
      })
    },
  })
}

export function useDeleteShoppingItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ itemId, listId: _listId }: { itemId: string; listId: string }) =>
      shoppingService.deleteShoppingItem(itemId),
    onSuccess: (_, { listId: _listId }) => {
      toast({ title: 'Item removed.', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['shopping-list', _listId] })
    },
    onError: (error: Error) => {
      toast({
        title: "Couldn't delete item",
        description: error.message,
        variant: 'error',
      })
    },
  })
}

// ============================================================================
// Shopping Lists Management Hooks
// ============================================================================

export function useDeleteShoppingList() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (listId: string) => shoppingService.deleteShoppingList(listId),
    onSuccess: () => {
      toast({ title: 'Shopping list deleted.', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['shopping-lists'] })
    },
    onError: (error: Error) => {
      toast({
        title: "Couldn't delete list",
        description: error.message,
        variant: 'error',
      })
    },
  })
}

export function useUpdateShoppingListStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ listId, status }: { listId: string; status: ShoppingListStatus }) =>
      shoppingService.updateShoppingListStatus(listId, status),
    onSuccess: () => {
      toast({ title: 'List status updated!', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['shopping-lists'] })
    },
    onError: (error: Error) => {
      toast({
        title: "Couldn't update list",
        description: error.message,
        variant: 'error',
      })
    },
  })
}
