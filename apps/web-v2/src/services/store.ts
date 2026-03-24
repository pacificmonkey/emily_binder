import { supabase } from '@/lib/supabase'
import type {
  StoreItem,
  UserInventory,
  CoinLedgerEntry,
  HomeDecoration,
  CreateStoreItemInput,
  CreateStickerInput,
  PlaceStickerInput,
  UpdateDecorationInput,
} from '@/types/database'

// Get coin balance
export async function getCoinBalance(): Promise<number> {
  const { data, error } = await supabase.rpc('get_coin_balance')

  if (error) {
    throw new Error(`Failed to get coin balance: ${error.message}`)
  }

  const result = data as { success: boolean; balance: number; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to get coin balance')
  }

  return result.balance
}

// Get coin history
export async function getCoinHistory(limit = 50, offset = 0): Promise<CoinLedgerEntry[]> {
  const { data, error } = await supabase.rpc('get_coin_history', {
    p_limit: limit,
    p_offset: offset,
  })

  if (error) {
    throw new Error(`Failed to get coin history: ${error.message}`)
  }

  const result = data as { success: boolean; entries: CoinLedgerEntry[]; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to get coin history')
  }

  return result.entries || []
}

// Get store items
export async function getStoreItems(): Promise<StoreItem[]> {
  const { data, error } = await supabase.rpc('get_store_items')

  if (error) {
    throw new Error(`Failed to load store: ${error.message}`)
  }

  const result = data as { success: boolean; items: StoreItem[]; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to load store items')
  }

  return result.items || []
}

// Get user inventory
export async function getUserInventory(): Promise<UserInventory[]> {
  const { data, error } = await supabase.rpc('get_user_inventory')

  if (error) {
    throw new Error(`Failed to load inventory: ${error.message}`)
  }

  const result = data as { success: boolean; items: UserInventory[]; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to load inventory')
  }

  return result.items || []
}

// Purchase an item
export async function purchaseItem(
  storeItemId: string,
  quantity = 1
): Promise<{ purchase_id: string; coin_cost_total: number; new_balance: number }> {
  const { data, error } = await supabase.rpc('purchase_store_item', {
    p_store_item_id: storeItemId,
    p_quantity: quantity,
  })

  if (error) {
    throw new Error(`Failed to purchase: ${error.message}`)
  }

  const result = data as {
    success: boolean
    purchase_id?: string
    coin_cost_total?: number
    new_balance?: number
    error?: string
    balance?: number
    cost?: number
    limit?: number
    purchased?: number
  }

  if (!result.success) {
    if (result.error === 'Insufficient coins') {
      throw new Error(`Not enough coins. You have ${result.balance} coins but need ${result.cost}.`)
    }
    throw new Error(result.error || 'Failed to purchase item')
  }

  return {
    purchase_id: result.purchase_id!,
    coin_cost_total: result.coin_cost_total!,
    new_balance: result.new_balance!,
  }
}

// Get home decorations (placed stickers)
export async function getHomeDecorations(): Promise<HomeDecoration[]> {
  const { data, error } = await supabase.rpc('get_home_decorations')

  if (error) {
    throw new Error(`Failed to load decorations: ${error.message}`)
  }

  const result = data as { success: boolean; decorations: HomeDecoration[]; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to load decorations')
  }

  return result.decorations || []
}

// Place a sticker
export async function placeSticker(input: PlaceStickerInput): Promise<string> {
  const { data, error } = await supabase.rpc('place_sticker', {
    p_store_item_id: input.store_item_id,
    p_position: input.position,
    p_rotation: input.rotation || 0,
    p_scale: input.scale || 1.0,
    p_z_index: input.z_index || 0,
  })

  if (error) {
    throw new Error(`Failed to place sticker: ${error.message}`)
  }

  const result = data as { success: boolean; home_decoration_id?: string; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to place sticker')
  }

  return result.home_decoration_id!
}

// Update a decoration
export async function updateDecoration(input: UpdateDecorationInput): Promise<void> {
  const { data, error } = await supabase.rpc('update_decoration', {
    p_home_decoration_id: input.home_decoration_id,
    p_position: input.position || null,
    p_rotation: input.rotation ?? null,
    p_scale: input.scale ?? null,
    p_z_index: input.z_index ?? null,
  })

  if (error) {
    throw new Error(`Failed to update decoration: ${error.message}`)
  }

  const result = data as { success: boolean; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to update decoration')
  }
}

// Remove a decoration
export async function removeDecoration(homeDecorationId: string): Promise<void> {
  const { data, error } = await supabase.rpc('remove_decoration', {
    p_home_decoration_id: homeDecorationId,
  })

  if (error) {
    throw new Error(`Failed to remove decoration: ${error.message}`)
  }

  const result = data as { success: boolean; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to remove decoration')
  }
}

// Admin: Create a store item
export async function createStoreItem(input: CreateStoreItemInput): Promise<string> {
  const { data, error } = await supabase.rpc('create_store_item', {
    p_type: input.type,
    p_name: input.name,
    p_coin_cost: input.coin_cost,
    p_inventory_kind: input.inventory_kind,
    p_description: input.description || null,
    p_max_purchases_total: input.max_purchases_total || null,
    p_max_purchases_per_month: input.max_purchases_per_month || null,
    p_metadata: input.metadata || null,
  })

  if (error) {
    throw new Error(`Failed to create store item: ${error.message}`)
  }

  const result = data as { success: boolean; store_item_id?: string; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to create store item')
  }

  return result.store_item_id!
}

// Admin: Create a sticker (creates both store item and sticker definition)
export async function createSticker(
  input: CreateStickerInput
): Promise<{ store_item_id: string; sticker_id: string }> {
  const { data, error } = await supabase.rpc('create_sticker', {
    p_name: input.name,
    p_asset_key: input.asset_key,
    p_coin_cost: input.coin_cost,
    p_description: input.description || null,
    p_default_scale: input.default_scale || 1.0,
    p_tags: input.tags || [],
  })

  if (error) {
    throw new Error(`Failed to create sticker: ${error.message}`)
  }

  const result = data as {
    success: boolean
    store_item_id?: string
    sticker_id?: string
    error?: string
  }

  if (!result.success) {
    throw new Error(result.error || 'Failed to create sticker')
  }

  return {
    store_item_id: result.store_item_id!,
    sticker_id: result.sticker_id!,
  }
}

// Patient purchase history item
export interface PatientPurchase {
  purchase_id: string
  store_item_id: string
  item_name: string
  item_type: string
  quantity: number
  coin_cost_per_unit: number
  coin_cost_total: number
  purchased_at: string
}

// Get purchase history for impersonated patient
export async function getPatientPurchases(
  limit = 50,
  offset = 0
): Promise<{ purchases: PatientPurchase[]; total: number }> {
  const { data, error } = await supabase.rpc('get_patient_purchases', {
    p_limit: limit,
    p_offset: offset,
  })

  if (error) {
    throw new Error(`Failed to get purchases: ${error.message}`)
  }

  const result = data as {
    success: boolean
    purchases?: PatientPurchase[]
    total?: number
    error?: string
  }

  if (!result.success) {
    throw new Error(result.error || 'Failed to get purchases')
  }

  return {
    purchases: result.purchases || [],
    total: result.total || 0,
  }
}
