import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as recipesService from '@/services/recipes'
import type {
  CreateRecipeInput,
  UpdateRecipeInput,
  CreateFavoriteItemInput,
} from '@/types/database'
import { toast } from '@/components/ui/toaster'

// ============================================================================
// Recipe Hooks
// ============================================================================

export function useRecipes(favoritesOnly = false) {
  return useQuery({
    queryKey: ['recipes', favoritesOnly],
    queryFn: () => recipesService.getRecipes(favoritesOnly),
    staleTime: 5 * 60 * 1000,
  })
}

export function useRecipe(recipeId: string | null) {
  return useQuery({
    queryKey: ['recipe', recipeId],
    queryFn: () => recipesService.getRecipe(recipeId!),
    enabled: !!recipeId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateRecipe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateRecipeInput) => recipesService.createRecipe(input),
    onSuccess: () => {
      toast({ title: 'Recipe created!', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },
    onError: (error: Error) => {
      toast({
        title: "Couldn't create recipe",
        description: error.message,
        variant: 'error',
      })
    },
  })
}

export function useUpdateRecipe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ recipeId, input }: { recipeId: string; input: UpdateRecipeInput }) =>
      recipesService.updateRecipe(recipeId, input),
    onSuccess: (_, { recipeId }) => {
      toast({ title: 'Recipe updated!', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
      queryClient.invalidateQueries({ queryKey: ['recipe', recipeId] })
    },
    onError: (error: Error) => {
      toast({
        title: "Couldn't update recipe",
        description: error.message,
        variant: 'error',
      })
    },
  })
}

export function useDeleteRecipe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (recipeId: string) => recipesService.deleteRecipe(recipeId),
    onSuccess: () => {
      toast({ title: 'Recipe deleted.', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },
    onError: (error: Error) => {
      toast({
        title: "Couldn't delete recipe",
        description: error.message,
        variant: 'error',
      })
    },
  })
}

export function useToggleFavorite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (recipeId: string) => recipesService.toggleRecipeFavorite(recipeId),
    onSuccess: (isFavorite, recipeId) => {
      toast({
        title: isFavorite ? 'Added to favorites!' : 'Removed from favorites.',
        variant: 'success',
      })
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
      queryClient.invalidateQueries({ queryKey: ['recipe', recipeId] })
    },
    onError: (error: Error) => {
      toast({
        title: "Couldn't update favorite",
        description: error.message,
        variant: 'error',
      })
    },
  })
}

// ============================================================================
// Favorite Items Hooks
// ============================================================================

export function useFavoriteItems() {
  return useQuery({
    queryKey: ['favorite-items'],
    queryFn: () => recipesService.getFavoriteItems(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateFavoriteItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateFavoriteItemInput) => recipesService.createFavoriteItem(input),
    onSuccess: () => {
      toast({ title: 'Favorite item added!', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['favorite-items'] })
    },
    onError: (error: Error) => {
      toast({
        title: "Couldn't add favorite item",
        description: error.message,
        variant: 'error',
      })
    },
  })
}

export function useDeleteFavoriteItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (favoriteItemId: string) => recipesService.deleteFavoriteItem(favoriteItemId),
    onSuccess: () => {
      toast({ title: 'Favorite item removed.', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['favorite-items'] })
    },
    onError: (error: Error) => {
      toast({
        title: "Couldn't remove favorite item",
        description: error.message,
        variant: 'error',
      })
    },
  })
}
