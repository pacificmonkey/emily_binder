/**
 * StickerShop - displays sticker catalog for purchase with category filtering
 */

import { useState } from 'react'
import { Card, CardContent, Button, LoadingSpinner, EmptyState } from '@/components/ui'
import { useStickersWithOwnership, usePurchaseSticker, useStickerCategories } from '@/hooks/useStickers'
import { useEconomyDisplay } from '@/hooks/useEconomy'
import type { StickerWithOwnership } from '@/services/stickers'
import styles from './StickerShop.module.css'

interface StickerItemProps {
  sticker: StickerWithOwnership
  coins: number
  onPurchase: (stickerId: string) => void
  isPurchasing: boolean
}

function StickerItem({ sticker, coins, onPurchase, isPurchasing }: StickerItemProps) {
  const canAfford = coins >= sticker.cost_coins

  return (
    <div className={styles.stickerItem}>
      <div className={styles.stickerImage}>
        <img src={sticker.image_url} alt={sticker.name} />
      </div>
      <div className={styles.stickerInfo}>
        <span className={styles.stickerName}>{sticker.name}</span>
        <span className={styles.stickerPrice}>
          {sticker.cost_coins} coins
        </span>
      </div>
      {sticker.owned ? (
        <span className={styles.ownedBadge}>Owned</span>
      ) : (
        <Button
          size="sm"
          onClick={() => onPurchase(sticker.id)}
          disabled={!canAfford || isPurchasing}
        >
          {isPurchasing ? '...' : 'Buy'}
        </Button>
      )}
    </div>
  )
}

export function StickerShop() {
  const { data: stickers, isLoading, error } = useStickersWithOwnership()
  const { data: categories } = useStickerCategories()
  const { state } = useEconomyDisplay()
  const coins = state?.coins ?? 0
  const purchaseSticker = usePurchaseSticker()
  const [purchasingId, setPurchasingId] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Debug logging
  if (error) console.error('[StickerShop] Error:', error)

  const handlePurchase = async (stickerId: string) => {
    setPurchasingId(stickerId)
    try {
      await purchaseSticker.mutateAsync(stickerId)
    } catch (error) {
      console.error('Failed to purchase sticker:', error)
    } finally {
      setPurchasingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <div style={{ padding: 'var(--space-4)', backgroundColor: 'var(--color-danger-50)', borderRadius: 'var(--radius-md)', color: 'var(--color-danger-700)' }}>
            <strong>Error loading stickers:</strong> {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!stickers || stickers.length === 0) {
    return (
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
        description="Check back later for new stickers"
      />
    )
  }

  // Filter stickers by selected category
  const filteredStickers = selectedCategory
    ? stickers.filter((s) => s.category === selectedCategory)
    : stickers

  // Group stickers by category
  const stickersByCategory = filteredStickers.reduce((acc, sticker) => {
    const category = sticker.category || 'Uncategorized'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(sticker)
    return acc
  }, {} as Record<string, StickerWithOwnership[]>)

  const displayCategories = Object.keys(stickersByCategory)

  // Get unique category names for filter chips
  const availableCategories = categories ??
    Array.from(new Set(stickers.map((s) => s.category).filter(Boolean))) as string[]

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Sticker Shop</h2>
        <div className={styles.coinBalance}>
          <span className={styles.coinIcon}>🪙</span>
          <span className={styles.coinCount}>{coins}</span>
        </div>
      </div>

      {/* Category Filters */}
      {availableCategories.length > 1 && (
        <div className={styles.filters}>
          <button
            className={`${styles.filterChip} ${selectedCategory === null ? styles.active : ''}`}
            onClick={() => setSelectedCategory(null)}
          >
            All
          </button>
          {availableCategories.map((category) => (
            <button
              key={category}
              className={`${styles.filterChip} ${selectedCategory === category ? styles.active : ''}`}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      {displayCategories.map(category => (
        <section key={category} className={styles.section}>
          <h3 className={styles.categoryTitle}>{category}</h3>
          <Card variant="outlined">
            <CardContent>
              <div className={styles.stickerGrid}>
                {stickersByCategory[category].map(sticker => (
                  <StickerItem
                    key={sticker.id}
                    sticker={sticker}
                    coins={coins}
                    onPurchase={handlePurchase}
                    isPurchasing={purchasingId === sticker.id}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      ))}
    </div>
  )
}
