/**
 * Stickers service - manages sticker catalog, purchases, and placements
 */

import { supabase } from '@/lib/supabase'
import type { StickerCatalog, StickerOwnership, StickerPlacement } from '@/types/database'

export interface StickerWithOwnership extends StickerCatalog {
  owned: boolean
}

export interface PlacedSticker extends StickerPlacement {
  sticker: StickerCatalog
}

/**
 * Get all active stickers in the catalog
 */
export async function getStickerCatalog(): Promise<StickerCatalog[]> {
  const { data, error } = await supabase
    .from('sticker_catalog')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * Get stickers with ownership status for a user
 */
export async function getStickersWithOwnership(userId: string): Promise<StickerWithOwnership[]> {
  // Get all stickers
  const stickers = await getStickerCatalog()

  // Get user's owned sticker IDs
  const { data: ownership, error } = await supabase
    .from('sticker_ownership')
    .select('sticker_id')
    .eq('user_id', userId)

  if (error) throw error

  const ownedIds = new Set(ownership?.map(o => o.sticker_id) || [])

  return stickers.map(sticker => ({
    ...sticker,
    owned: ownedIds.has(sticker.id),
  }))
}

/**
 * Get stickers owned by a user
 */
export async function getOwnedStickers(userId: string): Promise<StickerCatalog[]> {
  const { data, error } = await supabase
    .from('sticker_ownership')
    .select(`
      sticker:sticker_catalog(*)
    `)
    .eq('user_id', userId)

  if (error) throw error

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || [])
    .map((d: any) => d.sticker as StickerCatalog)
    .filter((s): s is StickerCatalog => s !== null)
}

/**
 * Purchase a sticker
 * Returns the ownership record on success
 */
export async function purchaseSticker(
  userId: string,
  stickerId: string
): Promise<StickerOwnership> {
  // Check if already owned
  const { data: existing } = await supabase
    .from('sticker_ownership')
    .select('id')
    .eq('user_id', userId)
    .eq('sticker_id', stickerId)
    .single()

  if (existing) {
    throw new Error('Sticker already owned')
  }

  // Get sticker cost
  const { data: sticker, error: stickerError } = await supabase
    .from('sticker_catalog')
    .select('cost_coins')
    .eq('id', stickerId)
    .single()

  if (stickerError || !sticker) {
    throw new Error('Sticker not found')
  }

  // Check user has enough coins
  const { data: economy, error: economyError } = await supabase
    .from('economy_state')
    .select('coins')
    .eq('user_id', userId)
    .single()

  if (economyError || !economy) {
    throw new Error('Economy state not found')
  }

  if (economy.coins < sticker.cost_coins) {
    throw new Error('Not enough coins')
  }

  // Deduct coins
  const { error: updateError } = await supabase
    .from('economy_state')
    .update({
      coins: economy.coins - sticker.cost_coins,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (updateError) throw updateError

  // Create ownership
  const { data, error } = await supabase
    .from('sticker_ownership')
    .insert({
      user_id: userId,
      sticker_id: stickerId,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get user's sticker placements on the home canvas
 */
export async function getStickerPlacements(userId: string): Promise<PlacedSticker[]> {
  const { data, error } = await supabase
    .from('sticker_placements')
    .select(`
      *,
      sticker:sticker_catalog(*)
    `)
    .eq('user_id', userId)
    .order('z_index', { ascending: true })

  if (error) throw error

  return (data || [])
    .filter(d => d.sticker !== null)
    .map(d => ({
      ...d,
      sticker: d.sticker as StickerCatalog,
    }))
}

/**
 * Place a sticker on the canvas
 */
export async function placeSticker(
  userId: string,
  stickerId: string,
  position: { x: number; y: number },
  options?: { scale?: number; rotation?: number }
): Promise<StickerPlacement> {
  // Get highest z-index for this user
  const { data: topSticker } = await supabase
    .from('sticker_placements')
    .select('z_index')
    .eq('user_id', userId)
    .order('z_index', { ascending: false })
    .limit(1)
    .single()

  const newZIndex = (topSticker?.z_index || 0) + 1

  const { data, error } = await supabase
    .from('sticker_placements')
    .insert({
      user_id: userId,
      sticker_id: stickerId,
      position_x: position.x,
      position_y: position.y,
      scale: options?.scale ?? 1,
      rotation: options?.rotation ?? 0,
      z_index: newZIndex,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update sticker placement (position, scale, rotation)
 */
export async function updateStickerPlacement(
  placementId: string,
  updates: {
    position_x?: number
    position_y?: number
    scale?: number
    rotation?: number
    z_index?: number
  }
): Promise<StickerPlacement> {
  const { data, error } = await supabase
    .from('sticker_placements')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', placementId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Remove a sticker from the canvas
 */
export async function removeStickerPlacement(placementId: string): Promise<void> {
  const { error } = await supabase
    .from('sticker_placements')
    .delete()
    .eq('id', placementId)

  if (error) throw error
}

/**
 * Bring a sticker to front (highest z-index)
 */
export async function bringToFront(userId: string, placementId: string): Promise<void> {
  const { data: topSticker } = await supabase
    .from('sticker_placements')
    .select('z_index')
    .eq('user_id', userId)
    .order('z_index', { ascending: false })
    .limit(1)
    .single()

  const newZIndex = (topSticker?.z_index || 0) + 1

  await supabase
    .from('sticker_placements')
    .update({
      z_index: newZIndex,
      updated_at: new Date().toISOString(),
    })
    .eq('id', placementId)
}

/**
 * Get count of owned stickers
 */
export async function getOwnedStickerCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('sticker_ownership')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (error) throw error
  return count || 0
}

/**
 * Get stickers by category
 */
export async function getStickersByCategory(category: string): Promise<StickerCatalog[]> {
  const { data, error } = await supabase
    .from('sticker_catalog')
    .select('*')
    .eq('category', category)
    .eq('active', true)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * Get all sticker categories
 */
export async function getStickerCategories(): Promise<string[]> {
  const { data, error } = await supabase
    .from('sticker_catalog')
    .select('category')
    .eq('active', true)
    .not('category', 'is', null)

  if (error) throw error

  const categories = [...new Set(data?.map(d => d.category).filter(Boolean))]
  return categories as string[]
}
