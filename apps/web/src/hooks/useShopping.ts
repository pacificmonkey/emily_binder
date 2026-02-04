import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getShoppingLists,
  getShoppingList,
  createShoppingList,
  updateShoppingListStatus,
  deleteShoppingList,
  updateShoppingItemStatus,
  addShoppingItem,
  deleteShoppingItem,
} from '@/services/shopping'
import type {
  ShoppingListStatus,
  ShoppingListItemStatus,
  CreateShoppingListInput,
  AddShoppingItemInput,
} from '@/types/database'

// Query keys
export const shoppingKeys = {
  all: ['shopping'] as const,
  lists: () => [...shoppingKeys.all, 'list'] as const,
  list: (status?: ShoppingListStatus) => [...shoppingKeys.lists(), { status }] as const,
  details: () => [...shoppingKeys.all, 'detail'] as const,
  detail: (id: string) => [...shoppingKeys.details(), id] as const,
}

// Hook for shopping lists
export function useShoppingLists(status?: ShoppingListStatus) {
  return useQuery({
    queryKey: shoppingKeys.list(status),
    queryFn: () => getShoppingLists(status),
  })
}

// Hook for active shopping lists only
export function useActiveShoppingLists() {
  return useShoppingLists('active')
}

// Hook for a single shopping list with items
export function useShoppingList(shoppingListId: string | undefined) {
  return useQuery({
    queryKey: shoppingKeys.detail(shoppingListId || ''),
    queryFn: () => getShoppingList(shoppingListId!),
    enabled: !!shoppingListId,
  })
}

// Mutation: Create shopping list
export function useCreateShoppingList() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateShoppingListInput) => createShoppingList(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shoppingKeys.all })
    },
  })
}

// Mutation: Update shopping list status
export function useUpdateShoppingListStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ listId, status }: { listId: string; status: ShoppingListStatus }) =>
      updateShoppingListStatus(listId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shoppingKeys.all })
    },
  })
}

// Mutation: Delete shopping list
export function useDeleteShoppingList() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (listId: string) => deleteShoppingList(listId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shoppingKeys.all })
    },
  })
}

// Mutation: Update shopping item status (two-phase checkoff)
export function useUpdateShoppingItemStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ itemId, status }: { itemId: string; status: ShoppingListItemStatus }) =>
      updateShoppingItemStatus(itemId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shoppingKeys.all })
    },
  })
}

// Mutation: Add item to shopping list
export function useAddShoppingItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: AddShoppingItemInput) => addShoppingItem(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shoppingKeys.all })
    },
  })
}

// Mutation: Delete shopping item
export function useDeleteShoppingItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (itemId: string) => deleteShoppingItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shoppingKeys.all })
    },
  })
}
