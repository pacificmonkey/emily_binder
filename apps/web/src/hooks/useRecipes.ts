import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getRecipes,
  getRecipe,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  toggleRecipeFavorite,
  getFavoriteItems,
  createFavoriteItem,
  deleteFavoriteItem,
} from '@/services/recipes'
import type {
  CreateRecipeInput,
  UpdateRecipeInput,
  CreateFavoriteItemInput,
} from '@/types/database'

// Query keys
export const recipeKeys = {
  all: ['recipes'] as const,
  lists: () => [...recipeKeys.all, 'list'] as const,
  list: (favoritesOnly: boolean) => [...recipeKeys.lists(), { favoritesOnly }] as const,
  details: () => [...recipeKeys.all, 'detail'] as const,
  detail: (id: string) => [...recipeKeys.details(), id] as const,
  favorites: ['favoriteItems'] as const,
}

// Hook for recipes list
export function useRecipes(favoritesOnly = false) {
  return useQuery({
    queryKey: recipeKeys.list(favoritesOnly),
    queryFn: () => getRecipes(favoritesOnly),
  })
}

// Hook for a single recipe with ingredients
export function useRecipe(recipeId: string | undefined) {
  return useQuery({
    queryKey: recipeKeys.detail(recipeId || ''),
    queryFn: () => getRecipe(recipeId!),
    enabled: !!recipeId,
  })
}

// Mutation: Create recipe
export function useCreateRecipe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateRecipeInput) => createRecipe(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.all })
    },
  })
}

// Mutation: Update recipe
export function useUpdateRecipe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ recipeId, input }: { recipeId: string; input: UpdateRecipeInput }) =>
      updateRecipe(recipeId, input),
    onSuccess: (_, { recipeId }) => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.all })
      queryClient.invalidateQueries({ queryKey: recipeKeys.detail(recipeId) })
    },
  })
}

// Mutation: Delete recipe
export function useDeleteRecipe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (recipeId: string) => deleteRecipe(recipeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.all })
    },
  })
}

// Mutation: Toggle recipe favorite
export function useToggleRecipeFavorite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (recipeId: string) => toggleRecipeFavorite(recipeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.all })
    },
  })
}

// ============================================================================
// Favorite Items (Staples)
// ============================================================================

// Hook for favorite items list
export function useFavoriteItems() {
  return useQuery({
    queryKey: recipeKeys.favorites,
    queryFn: getFavoriteItems,
  })
}

// Mutation: Create favorite item
export function useCreateFavoriteItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateFavoriteItemInput) => createFavoriteItem(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.favorites })
    },
  })
}

// Mutation: Delete favorite item
export function useDeleteFavoriteItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (favoriteItemId: string) => deleteFavoriteItem(favoriteItemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.favorites })
    },
  })
}
