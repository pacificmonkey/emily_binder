import { supabase } from '@/lib/supabase'
import type {
  Recipe,
  RecipeWithIngredients,
  FavoriteItem,
  CreateRecipeInput,
  UpdateRecipeInput,
  CreateFavoriteItemInput,
} from '@/types/database'

// Create a new recipe with ingredients
export async function createRecipe(input: CreateRecipeInput): Promise<string> {
  const { data, error } = await supabase.rpc('create_recipe', {
    p_title: input.title,
    p_description: input.description || null,
    p_instructions: input.instructions || null,
    p_servings: input.servings || null,
    p_prep_minutes: input.prep_minutes || null,
    p_cook_minutes: input.cook_minutes || null,
    p_tags: input.tags || [],
    p_is_favorite: input.is_favorite || false,
    p_ingredients: input.ingredients || [],
  })

  if (error) {
    throw new Error(`Database error: ${error.message}`)
  }

  const result = data as { success: boolean; recipe_id?: string; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to create recipe')
  }

  return result.recipe_id!
}

// Get all recipes
export async function getRecipes(favoritesOnly = false): Promise<Recipe[]> {
  const { data, error } = await supabase.rpc('get_recipes', {
    p_favorites_only: favoritesOnly,
  })

  if (error) {
    throw new Error(`Failed to load recipes: ${error.message}`)
  }

  const result = data as { success: boolean; recipes: Recipe[]; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch recipes')
  }

  return result.recipes || []
}

// Get a single recipe with ingredients
export async function getRecipe(recipeId: string): Promise<RecipeWithIngredients> {
  const { data, error } = await supabase.rpc('get_recipe', {
    p_recipe_id: recipeId,
  })

  if (error) {
    throw new Error(`Failed to load recipe: ${error.message}`)
  }

  const result = data as { success: boolean; recipe?: RecipeWithIngredients; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Recipe not found')
  }

  return result.recipe!
}

// Update a recipe
export async function updateRecipe(recipeId: string, input: UpdateRecipeInput): Promise<void> {
  const { data, error } = await supabase.rpc('update_recipe', {
    p_recipe_id: recipeId,
    p_title: input.title || null,
    p_description: input.description,
    p_instructions: input.instructions,
    p_servings: input.servings,
    p_prep_minutes: input.prep_minutes,
    p_cook_minutes: input.cook_minutes,
    p_tags: input.tags || null,
    p_is_favorite: input.is_favorite,
  })

  if (error) {
    throw new Error(`Failed to update recipe: ${error.message}`)
  }

  const result = data as { success: boolean; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to update recipe')
  }
}

// Delete a recipe
export async function deleteRecipe(recipeId: string): Promise<void> {
  const { data, error } = await supabase.rpc('delete_recipe', {
    p_recipe_id: recipeId,
  })

  if (error) {
    throw new Error(`Failed to delete recipe: ${error.message}`)
  }

  const result = data as { success: boolean; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to delete recipe')
  }
}

// Toggle recipe favorite status
export async function toggleRecipeFavorite(recipeId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('toggle_recipe_favorite', {
    p_recipe_id: recipeId,
  })

  if (error) {
    throw new Error(`Failed to toggle favorite: ${error.message}`)
  }

  const result = data as { success: boolean; is_favorite?: boolean; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to toggle favorite')
  }

  return result.is_favorite!
}

// ============================================================================
// Favorite Items (Staples)
// ============================================================================

// Create a favorite item
export async function createFavoriteItem(input: CreateFavoriteItemInput): Promise<string> {
  const { data, error } = await supabase.rpc('create_favorite_item', {
    p_name: input.name,
    p_default_quantity: input.default_quantity || null,
    p_default_unit: input.default_unit || null,
    p_category_hint: input.category_hint || null,
  })

  if (error) {
    throw new Error(`Database error: ${error.message}`)
  }

  const result = data as { success: boolean; favorite_item_id?: string; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to create favorite item')
  }

  return result.favorite_item_id!
}

// Get all favorite items
export async function getFavoriteItems(): Promise<FavoriteItem[]> {
  const { data, error } = await supabase.rpc('get_favorite_items')

  if (error) {
    throw new Error(`Failed to load favorite items: ${error.message}`)
  }

  const result = data as { success: boolean; items: FavoriteItem[]; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch favorite items')
  }

  return result.items || []
}

// Delete a favorite item
export async function deleteFavoriteItem(favoriteItemId: string): Promise<void> {
  const { data, error } = await supabase.rpc('delete_favorite_item', {
    p_favorite_item_id: favoriteItemId,
  })

  if (error) {
    throw new Error(`Failed to delete favorite item: ${error.message}`)
  }

  const result = data as { success: boolean; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to delete favorite item')
  }
}
