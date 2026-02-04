/**
 * Sticker utility functions for canvas interactions
 */

export interface StickerBounds {
  left: number
  top: number
  right: number
  bottom: number
}

/**
 * Check if two rectangles overlap
 */
export function rectanglesOverlap(a: StickerBounds, b: StickerBounds): boolean {
  return !(
    a.right < b.left ||
    a.left > b.right ||
    a.bottom < b.top ||
    a.top > b.bottom
  )
}

/**
 * Calculate bounds for a sticker placement
 */
export function getStickerBounds(
  x: number,
  y: number,
  scale: number = 1,
  baseSize: number = 48
): StickerBounds {
  const size = baseSize * scale
  return {
    left: x,
    top: y,
    right: x + size,
    bottom: y + size,
  }
}

/**
 * Find placements that overlap with a given position
 */
export function getOverlappingPlacements<T extends { id: string; position_x: number; position_y: number; scale: number }>(
  placements: T[],
  targetId: string,
  targetX: number,
  targetY: number,
  targetScale: number = 1
): T[] {
  const targetBounds = getStickerBounds(targetX, targetY, targetScale)

  return placements.filter((p) => {
    if (p.id === targetId) return false

    const bounds = getStickerBounds(p.position_x, p.position_y, p.scale)
    return rectanglesOverlap(targetBounds, bounds)
  })
}

/**
 * Snap a value to a grid
 */
export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize
}

/**
 * Snap position to grid
 */
export function snapPositionToGrid(
  x: number,
  y: number,
  gridSize: number
): { x: number; y: number } {
  return {
    x: snapToGrid(x, gridSize),
    y: snapToGrid(y, gridSize),
  }
}
