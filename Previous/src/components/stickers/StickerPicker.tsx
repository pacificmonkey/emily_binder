/**
 * StickerPicker - modal to select owned stickers to place on canvas
 */

import { Modal, EmptyState, LoadingSpinner } from '@/components/ui'
import { useOwnedStickers, usePlaceSticker } from '@/hooks/useStickers'
import type { StickerCatalog } from '@/types/database'
import styles from './StickerPicker.module.css'

interface StickerPickerProps {
  isOpen: boolean
  onClose: () => void
}

interface StickerOptionProps {
  sticker: StickerCatalog
  onSelect: (sticker: StickerCatalog) => void
}

function StickerOption({ sticker, onSelect }: StickerOptionProps) {
  return (
    <button
      className={styles.stickerOption}
      onClick={() => onSelect(sticker)}
      aria-label={`Place ${sticker.name} sticker`}
    >
      <img src={sticker.image_url} alt={sticker.name} />
      <span className={styles.stickerName}>{sticker.name}</span>
    </button>
  )
}

export function StickerPicker({ isOpen, onClose }: StickerPickerProps) {
  const { data: stickers, isLoading } = useOwnedStickers()
  const placeSticker = usePlaceSticker()

  const handleSelect = async (sticker: StickerCatalog) => {
    // Place in center of screen with some randomness
    const centerX = window.innerWidth / 2 - 24 + (Math.random() - 0.5) * 100
    const centerY = window.innerHeight / 2 - 24 + (Math.random() - 0.5) * 100

    await placeSticker.mutateAsync({
      stickerId: sticker.id,
      position: { x: centerX, y: centerY },
    })

    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Place a Sticker">
      <div className={styles.content}>
        {isLoading ? (
          <div className={styles.loadingContainer}>
            <LoadingSpinner />
          </div>
        ) : !stickers || stickers.length === 0 ? (
          <EmptyState
            icon={
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                <line x1="9" y1="9" x2="9.01" y2="9" />
                <line x1="15" y1="9" x2="15.01" y2="9" />
              </svg>
            }
            title="No stickers yet"
            description="Visit the Shop to purchase stickers"
          />
        ) : (
          <div className={styles.stickerGrid}>
            {stickers.map(sticker => (
              <StickerOption
                key={sticker.id}
                sticker={sticker}
                onSelect={handleSelect}
              />
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
