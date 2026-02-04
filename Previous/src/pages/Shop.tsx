/**
 * Shop page - sticker shop, my stickers, and grace token purchase
 */

import { useState } from 'react'
import { Card, CardContent, Button, EmptyState, LoadingSpinner } from '@/components/ui'
import { StickerShop } from '@/components/stickers'
import { useEconomyDisplay, usePurchaseGraceTokens } from '@/hooks/useEconomy'
import { useGraceTokens } from '@/hooks/useStreaks'
import { useOwnedStickers } from '@/hooks/useStickers'
import styles from './Shop.module.css'

type ShopTab = 'stickers' | 'mine' | 'tokens'

export function ShopPage() {
  const [activeTab, setActiveTab] = useState<ShopTab>('stickers')
  const { state, config } = useEconomyDisplay()
  const { data: graceTokens } = useGraceTokens()
  const { data: ownedStickers, isLoading: loadingOwned } = useOwnedStickers()
  const purchaseTokens = usePurchaseGraceTokens()
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null)

  const coins = state?.coins ?? 0
  const tokenCost = config.graceTokenCost
  const bundleCost = tokenCost * 3 - 5 // 5 coin discount for 3-pack

  const handlePurchaseTokens = async (quantity: number, cost: number) => {
    setPurchaseSuccess(null)
    try {
      const result = await purchaseTokens.mutateAsync({ tokenQuantity: quantity, coinCost: cost })
      if (result.success) {
        setPurchaseSuccess(`Purchased ${quantity} token${quantity > 1 ? 's' : ''}!`)
        setTimeout(() => setPurchaseSuccess(null), 3000)
      }
    } catch (error) {
      console.error('Failed to purchase tokens:', error)
    }
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Shop</h1>
        <div className={styles.balance}>
          <span className={styles.coinIcon}>🪙</span>
          <span className={styles.coinCount}>{coins}</span>
        </div>
      </header>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'stickers' ? styles.active : ''}`}
          onClick={() => setActiveTab('stickers')}
        >
          Stickers
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'mine' ? styles.active : ''}`}
          onClick={() => setActiveTab('mine')}
        >
          My Stickers
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'tokens' ? styles.active : ''}`}
          onClick={() => setActiveTab('tokens')}
        >
          Grace Tokens
        </button>
      </div>

      {activeTab === 'stickers' && <StickerShop />}

      {activeTab === 'mine' && (
        <div className={styles.myStickersSection}>
          {loadingOwned ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-4)' }}>
              <LoadingSpinner />
            </div>
          ) : !ownedStickers || ownedStickers.length === 0 ? (
            <EmptyState
              icon={
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21,15 16,10 5,21" />
                </svg>
              }
              title="No stickers yet"
              description="Purchase stickers from the shop to start decorating!"
            />
          ) : (
            <Card>
              <CardContent>
                <div className={styles.myStickersGrid}>
                  {ownedStickers.map((sticker) => (
                    <div key={sticker.id} className={styles.ownedStickerItem}>
                      <img
                        src={sticker.image_url}
                        alt={sticker.name}
                        className={styles.ownedStickerImage}
                      />
                      <span className={styles.ownedStickerName}>{sticker.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'tokens' && (
        <div className={styles.tokenSection}>
          <Card>
            <CardContent>
              <div className={styles.tokenInfo}>
                <div className={styles.tokenHeader}>
                  <span className={styles.tokenIcon}>🛡️</span>
                  <h3 className={styles.tokenTitle}>Grace Tokens</h3>
                </div>
                <p className={styles.tokenDescription}>
                  Grace tokens protect your weekly streaks. If you miss completing a weekly mission,
                  use a grace token to keep your streak alive.
                </p>
                <div className={styles.tokenBalance}>
                  <span>You have:</span>
                  <span className={styles.tokenCount}>
                    {graceTokens?.quantity ?? 0} tokens
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {purchaseSuccess && (
            <div className={styles.purchaseSuccess}>{purchaseSuccess}</div>
          )}

          <Card variant="outlined">
            <CardContent>
              <div className={styles.purchaseOption}>
                <div className={styles.purchaseInfo}>
                  <span className={styles.purchaseIcon}>🛡️</span>
                  <div className={styles.purchaseDetails}>
                    <span className={styles.purchaseName}>1 Grace Token</span>
                    <span className={styles.purchasePrice}>{tokenCost} coins</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  disabled={coins < tokenCost || purchaseTokens.isPending}
                  onClick={() => handlePurchaseTokens(1, tokenCost)}
                >
                  {purchaseTokens.isPending ? '...' : 'Buy'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <div className={styles.purchaseOption}>
                <div className={styles.purchaseInfo}>
                  <span className={styles.purchaseIcon}>🛡️🛡️🛡️</span>
                  <div className={styles.purchaseDetails}>
                    <span className={styles.purchaseName}>3 Grace Tokens</span>
                    <span className={styles.purchasePrice}>
                      {bundleCost} coins
                      <span className={styles.discount}>(save 5)</span>
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  disabled={coins < bundleCost || purchaseTokens.isPending}
                  onClick={() => handlePurchaseTokens(3, bundleCost)}
                >
                  {purchaseTokens.isPending ? '...' : 'Buy'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
