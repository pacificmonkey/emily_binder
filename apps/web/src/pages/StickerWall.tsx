import { useState, useRef, useCallback } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import {
  useHomeDecorations,
  useUserInventory,
  usePlaceSticker,
  useUpdateDecoration,
  useRemoveDecoration,
} from '@/hooks/useStore'
import type { HomeDecoration, UserInventory } from '@/types/database'
import styles from './StickerWall.module.css'

interface PlacedStickerProps {
  decoration: HomeDecoration
  isEditing: boolean
  isSelected: boolean
  onSelect: () => void
  onDragEnd: (x: number, y: number) => void
  onRemove: () => void
}

function PlacedSticker({
  decoration,
  isEditing,
  isSelected,
  onSelect,
  onDragEnd,
  onRemove,
}: PlacedStickerProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const stickerRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isEditing) return
    e.preventDefault()
    onSelect()

    const rect = stickerRef.current?.parentElement?.getBoundingClientRect()
    if (!rect) return

    setIsDragging(true)
    setDragOffset({
      x: e.clientX - (decoration.position.x / 100) * rect.width,
      y: e.clientY - (decoration.position.y / 100) * rect.height,
    })
  }

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return

      const canvas = stickerRef.current?.parentElement
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const newX = ((e.clientX - dragOffset.x) / rect.width) * 100
      const newY = ((e.clientY - dragOffset.y) / rect.height) * 100

      // Clamp to canvas bounds
      const clampedX = Math.max(0, Math.min(100, newX))
      const clampedY = Math.max(0, Math.min(100, newY))

      if (stickerRef.current) {
        stickerRef.current.style.left = `${clampedX}%`
        stickerRef.current.style.top = `${clampedY}%`
      }
    },
    [isDragging, dragOffset]
  )

  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return
      setIsDragging(false)

      const canvas = stickerRef.current?.parentElement
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const newX = ((e.clientX - dragOffset.x) / rect.width) * 100
      const newY = ((e.clientY - dragOffset.y) / rect.height) * 100

      const clampedX = Math.max(0, Math.min(100, newX))
      const clampedY = Math.max(0, Math.min(100, newY))

      onDragEnd(clampedX, clampedY)
    },
    [isDragging, dragOffset, onDragEnd]
  )

  // Add global mouse listeners when dragging
  useState(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  })

  const style = {
    left: `${decoration.position.x}%`,
    top: `${decoration.position.y}%`,
    transform: `translate(-50%, -50%) scale(${decoration.scale || 1}) rotate(${decoration.rotation || 0}deg)`,
    zIndex: decoration.z_index || 0,
    cursor: isEditing ? (isDragging ? 'grabbing' : 'grab') : 'default',
  }

  return (
    <div
      ref={stickerRef}
      className={`${styles.placedSticker} ${isSelected ? styles.selected : ''} ${isDragging ? styles.dragging : ''}`}
      style={style}
      onMouseDown={handleMouseDown}
    >
      <span className={styles.stickerEmoji}>
        {decoration.asset_key || decoration.sticker_name || '🌟'}
      </span>
      {isEditing && isSelected && (
        <button className={styles.removeButton} onClick={onRemove} title="Remove sticker">
          ×
        </button>
      )}
    </div>
  )
}

interface StickerTrayItemProps {
  inventory: UserInventory
  onPlace: (storeItemId: string) => void
}

function StickerTrayItem({ inventory, onPlace }: StickerTrayItemProps) {
  return (
    <button
      className={styles.trayItem}
      onClick={() => onPlace(inventory.store_item_id)}
      disabled={inventory.quantity <= 0}
      title={`${inventory.item_name} (${inventory.quantity} owned)`}
    >
      <span className={styles.trayEmoji}>
        {inventory.sticker?.asset_key || '🌟'}
      </span>
      <span className={styles.trayCount}>{inventory.quantity}</span>
    </button>
  )
}

export function StickerWall() {
  const { data: decorations = [], isLoading: isLoadingDecorations } = useHomeDecorations()
  const { data: inventory = [], isLoading: isLoadingInventory } = useUserInventory()
  const placeSticker = usePlaceSticker()
  const updateDecoration = useUpdateDecoration()
  const removeDecoration = useRemoveDecoration()

  const [isEditing, setIsEditing] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  // Count how many of each sticker are already placed
  const placedCounts = decorations.reduce(
    (acc, dec) => {
      acc[dec.store_item_id] = (acc[dec.store_item_id] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  // Calculate remaining placeable for each sticker
  const placeableStickers = inventory
    .filter((item) => item.item_type === 'sticker')
    .map((item) => ({
      ...item,
      placeable: item.quantity - (placedCounts[item.store_item_id] || 0),
    }))
    .filter((item) => item.placeable > 0)

  const handlePlaceSticker = (storeItemId: string) => {
    // Place in center of canvas
    placeSticker.mutate({
      store_item_id: storeItemId,
      position: { x: 50, y: 50 },
      rotation: 0,
      scale: 1.0,
      z_index: decorations.length,
    })
  }

  const handleDragEnd = (decorationId: string, x: number, y: number) => {
    updateDecoration.mutate({
      home_decoration_id: decorationId,
      position: { x, y },
    })
  }

  const handleRemove = (decorationId: string) => {
    removeDecoration.mutate(decorationId)
    setSelectedId(null)
  }

  const isLoading = isLoadingDecorations || isLoadingInventory

  return (
    <AppLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Sticker Wall</h1>
          <button
            className={`${styles.editButton} ${isEditing ? styles.editButtonActive : ''}`}
            onClick={() => {
              setIsEditing(!isEditing)
              setSelectedId(null)
            }}
          >
            {isEditing ? '✓ Done' : '✏️ Edit'}
          </button>
        </header>

        {isLoading ? (
          <div className={styles.loading}>Loading your stickers...</div>
        ) : (
          <>
            <div
              ref={canvasRef}
              className={`${styles.canvas} ${isEditing ? styles.canvasEditing : ''}`}
              onClick={() => setSelectedId(null)}
            >
              {decorations.length === 0 && !isEditing && (
                <div className={styles.emptyState}>
                  <span className={styles.emptyIcon}>🖼️</span>
                  <p>Your sticker wall is empty!</p>
                  <p className={styles.emptyHint}>
                    Buy stickers from the Shop, then click Edit to place them here.
                  </p>
                </div>
              )}

              {decorations.map((decoration) => (
                <PlacedSticker
                  key={decoration.home_decoration_id}
                  decoration={decoration}
                  isEditing={isEditing}
                  isSelected={selectedId === decoration.home_decoration_id}
                  onSelect={() => setSelectedId(decoration.home_decoration_id)}
                  onDragEnd={(x, y) => handleDragEnd(decoration.home_decoration_id, x, y)}
                  onRemove={() => handleRemove(decoration.home_decoration_id)}
                />
              ))}
            </div>

            {isEditing && (
              <div className={styles.tray}>
                <h3 className={styles.trayTitle}>Your Stickers</h3>
                {placeableStickers.length === 0 ? (
                  <p className={styles.trayEmpty}>
                    No stickers to place. Visit the Shop to buy more!
                  </p>
                ) : (
                  <div className={styles.trayItems}>
                    {placeableStickers.map((item) => (
                      <StickerTrayItem
                        key={item.user_inventory_id}
                        inventory={{ ...item, quantity: item.placeable }}
                        onPlace={handlePlaceSticker}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  )
}
