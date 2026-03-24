import { supabase } from '@/lib/supabase'
import type {
  ShoppingList,
  ShoppingListWithItems,
  ShoppingListStatus,
  ShoppingListItemStatus,
  CreateShoppingListInput,
  AddShoppingItemInput,
} from '@/types/database'

// Create a shopping list (optionally from recipes and favorites)
export async function createShoppingList(input: CreateShoppingListInput): Promise<string> {
  const { data, error } = await supabase.rpc('create_shopping_list', {
    p_title: input.title,
    p_recipe_ids: input.recipe_ids || [],
    p_include_favorites: input.include_favorites || false,
    p_items: input.items || [],
  })

  if (error) {
    throw new Error(`Database error: ${error.message}`)
  }

  const result = data as { success: boolean; shopping_list_id?: string; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to create shopping list')
  }

  return result.shopping_list_id!
}

// Get all shopping lists
export async function getShoppingLists(status?: ShoppingListStatus): Promise<ShoppingList[]> {
  const { data, error } = await supabase.rpc('get_shopping_lists', {
    p_status: status || null,
  })

  if (error) {
    throw new Error(`Failed to load shopping lists: ${error.message}`)
  }

  const result = data as { success: boolean; lists: ShoppingList[]; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch shopping lists')
  }

  return result.lists || []
}

// Get a shopping list with items
export async function getShoppingList(shoppingListId: string): Promise<ShoppingListWithItems> {
  const { data, error } = await supabase.rpc('get_shopping_list', {
    p_shopping_list_id: shoppingListId,
  })

  if (error) {
    throw new Error(`Failed to load shopping list: ${error.message}`)
  }

  const result = data as { success: boolean; list?: ShoppingListWithItems; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Shopping list not found')
  }

  return result.list!
}

// Update shopping list item status (two-phase checkoff)
export async function updateShoppingItemStatus(
  itemId: string,
  status: ShoppingListItemStatus
): Promise<void> {
  const { data, error } = await supabase.rpc('update_shopping_item_status', {
    p_shopping_list_item_id: itemId,
    p_status: status,
  })

  if (error) {
    throw new Error(`Failed to update item: ${error.message}`)
  }

  const result = data as { success: boolean; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to update item status')
  }
}

// Add an item to a shopping list
export async function addShoppingItem(input: AddShoppingItemInput): Promise<string> {
  const { data, error } = await supabase.rpc('add_shopping_item', {
    p_shopping_list_id: input.shopping_list_id,
    p_name: input.name,
    p_quantity: input.quantity || null,
    p_unit: input.unit || null,
    p_notes: input.notes || null,
    p_category_hint: input.category_hint || null,
  })

  if (error) {
    throw new Error(`Failed to add item: ${error.message}`)
  }

  const result = data as { success: boolean; shopping_list_item_id?: string; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to add item')
  }

  return result.shopping_list_item_id!
}

// Update shopping item quantity/unit/notes
export async function updateShoppingItem(
  itemId: string,
  updates: { quantity?: number; unit?: string; notes?: string }
): Promise<void> {
  const { data, error } = await supabase.rpc('update_shopping_item', {
    p_shopping_list_item_id: itemId,
    p_quantity: updates.quantity ?? null,
    p_unit: updates.unit ?? null,
    p_notes: updates.notes ?? null,
  })

  if (error) {
    throw new Error(`Failed to update item: ${error.message}`)
  }

  const result = data as { success: boolean; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to update item')
  }
}

// Delete a shopping list item
export async function deleteShoppingItem(itemId: string): Promise<void> {
  const { data, error } = await supabase.rpc('delete_shopping_item', {
    p_shopping_list_item_id: itemId,
  })

  if (error) {
    throw new Error(`Failed to delete item: ${error.message}`)
  }

  const result = data as { success: boolean; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to delete item')
  }
}

// Update shopping list status
export async function updateShoppingListStatus(
  listId: string,
  status: ShoppingListStatus
): Promise<void> {
  const { data, error } = await supabase.rpc('update_shopping_list_status', {
    p_shopping_list_id: listId,
    p_status: status,
  })

  if (error) {
    throw new Error(`Failed to update list: ${error.message}`)
  }

  const result = data as { success: boolean; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to update list status')
  }
}

// Delete a shopping list
export async function deleteShoppingList(listId: string): Promise<void> {
  const { data, error } = await supabase.rpc('delete_shopping_list', {
    p_shopping_list_id: listId,
  })

  if (error) {
    throw new Error(`Failed to delete shopping list: ${error.message}`)
  }

  const result = data as { success: boolean; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to delete shopping list')
  }
}
