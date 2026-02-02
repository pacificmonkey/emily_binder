/**
 * StickerCanvas - displays placed stickers that can be dragged around
 */

import { useState, useRef, useCallback } from 'react'
import {
  useStickerPlacements,
  useUpdateStickerPlacement,
  useRemoveStickerPlacement,
  useBringToFront,
} from '@/hooks/useStickers'
import { getOverlappingPlacements, snapPositionToGrid } from '@/lib/stickerUtils'
import { useStickerSettings } from '@/stores/stickerSettings'
import type { PlacedSticker } from '@/services/stickers'
import styles from './StickerCanvas.module.css'

interface DragState {
  placementId: string
  startX: number
  startY: number
  initialX: number
  initialY: number
}

interface PlacedStickerItemProps {
  placement: PlacedSticker
  onDragStart: (placement: PlacedSticker, e: React.MouseEvent | React.TouchEvent) => void
  onRemove: (placementId: string) => void
  onBringToFront: (placementId: string) => void
  isDragging: boolean
}

function PlacedStickerItem({
  placement,
  onDragStart,
  onRemove,
  onBringToFront,
  isDragging,
}: PlacedStickerItemProps) {
  const [showMenu, setShowMenu] = useState(false)

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setShowMenu(!showMenu)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    // Long press detection
    const timeout = setTimeout(() => {
      setShowMenu(true)
    }, 500)

    const handleTouchEnd = () => {
      clearTimeout(timeout)
    }

    e.currentTarget.addEventListener('touchend', handleTouchEnd, { once: true })
    e.currentTarget.addEventListener('touchmove', handleTouchEnd, { once: true })
  }

  return (
    <div
      className={`${styles.placedSticker} ${isDragging ? styles.dragging : ''}`}
      style={{
        left: placement.position_x,
        top: placement.position_y,
        transform: `scale(${placement.scale}) rotate(${placement.rotation}deg)`,
        zIndex: placement.z_index,
      }}
      onMouseDown={(e) => {
        if (!showMenu) onDragStart(placement, e)
      }}
      onTouchStart={(e) => {
        handleTouchStart(e)
        if (!showMenu) onDragStart(placement, e)
      }}
      onContextMenu={handleContextMenu}
    >
      <img
        src={placement.sticker.image_url}
        alt={placement.sticker.name}
        draggable={false}
      />
      {showMenu && (
        <div className={styles.stickerMenu}>
          <button
            className={styles.menuButton}
            onClick={() => {
              onBringToFront(placement.id)
              setShowMenu(false)
            }}
          >
            Bring to front
          </button>
          <button
            className={`${styles.menuButton} ${styles.removeButton}`}
            onClick={() => {
              onRemove(placement.id)
              setShowMenu(false)
            }}
          >
            Remove
          </button>
          <button
            className={styles.menuButton}
            onClick={() => setShowMenu(false)}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

export function StickerCanvas() {
  const { data: placements } = useStickerPlacements()
  const updatePlacement = useUpdateStickerPlacement()
  const removePlacement = useRemoveStickerPlacement()
  const bringToFront = useBringToFront()
  const { snapToGrid: snapEnabled, gridSize, showGrid } = useStickerSettings()

  const [dragState, setDragState] = useState<DragState | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  const handleDragStart = useCallback((placement: PlacedSticker, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    setDragState({
      placementId: placement.id,
      startX: clientX,
      startY: clientY,
      initialX: placement.position_x,
      initialY: placement.position_y,
    })
  }, [])

  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!dragState || !canvasRef.current) return

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    const deltaX = clientX - dragState.startX
    const deltaY = clientY - dragState.startY

    const newX = Math.max(0, Math.min(
      canvasRef.current.clientWidth - 48,
      dragState.initialX + deltaX
    ))
    const newY = Math.max(0, Math.min(
      canvasRef.current.clientHeight - 48,
      dragState.initialY + deltaY
    ))

    // Update the element directly for smooth dragging
    const element = document.querySelector(`[data-placement-id="${dragState.placementId}"]`) as HTMLElement
    if (element) {
      element.style.left = `${newX}px`
      element.style.top = `${newY}px`
    }
  }, [dragState])

  const handleDragEnd = useCallback(async () => {
    if (!dragState || !canvasRef.current || !placements) return

    const element = document.querySelector(`[data-placement-id="${dragState.placementId}"]`) as HTMLElement
    if (element) {
      let newX = parseInt(element.style.left, 10)
      let newY = parseInt(element.style.top, 10)

      // Apply snap-to-grid if enabled
      if (snapEnabled) {
        const snapped = snapPositionToGrid(newX, newY, gridSize)
        newX = snapped.x
        newY = snapped.y
        element.style.left = `${newX}px`
        element.style.top = `${newY}px`
      }

      // Get current placement for scale info
      const currentPlacement = placements.find(p => p.id === dragState.placementId)
      const scale = currentPlacement?.scale ?? 1

      // Check for overlapping placements
      const overlapping = getOverlappingPlacements(placements, dragState.placementId, newX, newY, scale)

      await updatePlacement.mutateAsync({
        placementId: dragState.placementId,
        updates: {
          position_x: newX,
          position_y: newY,
        },
      })

      // If overlapping with other stickers, bring to front
      if (overlapping.length > 0) {
        await bringToFront.mutateAsync(dragState.placementId)
      }
    }

    setDragState(null)
  }, [dragState, updatePlacement, bringToFront, placements, snapEnabled, gridSize])

  // Add drag listeners when dragging
  const handleMouseDown = useCallback((placement: PlacedSticker, e: React.MouseEvent | React.TouchEvent) => {
    handleDragStart(placement, e)

    const handleMove = (e: MouseEvent | TouchEvent) => handleDragMove(e)
    const handleUp = () => {
      handleDragEnd()
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleUp)
      document.removeEventListener('touchmove', handleMove)
      document.removeEventListener('touchend', handleUp)
    }

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleUp)
    document.addEventListener('touchmove', handleMove, { passive: false })
    document.addEventListener('touchend', handleUp)
  }, [handleDragStart, handleDragMove, handleDragEnd])

  const handleRemove = async (placementId: string) => {
    await removePlacement.mutateAsync(placementId)
  }

  const handleBringToFront = async (placementId: string) => {
    await bringToFront.mutateAsync(placementId)
  }

  if (!placements || placements.length === 0) {
    return null
  }

  return (
    <div ref={canvasRef} className={styles.canvas}>
      {/* Grid overlay when enabled */}
      {showGrid && (
        <div
          className={styles.gridOverlay}
          style={{
            backgroundSize: `${gridSize}px ${gridSize}px`,
          }}
        />
      )}
      {placements.map(placement => (
        <div key={placement.id} data-placement-id={placement.id}>
          <PlacedStickerItem
            placement={placement}
            onDragStart={handleMouseDown}
            onRemove={handleRemove}
            onBringToFront={handleBringToFront}
            isDragging={dragState?.placementId === placement.id}
          />
        </div>
      ))}
    </div>
  )
}
