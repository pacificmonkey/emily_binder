import { useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import {
  useCoinBalance,
  useStoreItems,
  useUserInventory,
  usePurchaseItem,
  useCreateSticker,
} from '@/hooks/useStore'
import type { StoreItem } from '@/types/database'
import styles from './Store.module.css'

function StoreItemCard({
  item,
  onPurchase,
  isPurchasing,
  coinBalance,
}: {
  item: StoreItem
  onPurchase: (item: StoreItem) => void
  isPurchasing: boolean
  coinBalance: number
}) {
  const canAfford = coinBalance >= item.coin_cost
  const owned = item.owned_quantity || 0

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sticker':
        return '🎨'
      case 'consumable_token':
        return '🛡️'
      case 'real_world_reward':
        return '🎁'
      default:
        return '✨'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'sticker':
        return 'Sticker'
      case 'consumable_token':
        return 'Token'
      case 'real_world_reward':
        return 'Reward'
      default:
        return type
    }
  }

  return (
    <div className={styles.itemCard}>
      <div className={styles.itemIcon}>{getTypeIcon(item.type)}</div>
      <div className={styles.itemContent}>
        <h3 className={styles.itemName}>{item.name}</h3>
        {item.description && (
          <p className={styles.itemDescription}>{item.description}</p>
        )}
        <div className={styles.itemMeta}>
          <span className={styles.itemType}>{getTypeLabel(item.type)}</span>
          {owned > 0 && <span className={styles.itemOwned}>Owned: {owned}</span>}
        </div>
      </div>
      <div className={styles.itemActions}>
        <span className={styles.itemPrice}>
          <span className={styles.coinIcon}>🪙</span>
          {item.coin_cost}
        </span>
        <button
          className={`${styles.buyButton} ${!canAfford ? styles.buyButtonDisabled : ''}`}
          onClick={() => onPurchase(item)}
          disabled={!canAfford || isPurchasing}
        >
          {isPurchasing ? '...' : canAfford ? 'Buy' : 'Need more'}
        </button>
      </div>
    </div>
  )
}

function CreateStickerModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [assetKey, setAssetKey] = useState('')
  const [coinCost, setCoinCost] = useState(10)
  const [description, setDescription] = useState('')

  const createSticker = useCreateSticker()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !assetKey.trim()) return

    try {
      await createSticker.mutateAsync({
        name: name.trim(),
        asset_key: assetKey.trim(),
        coin_cost: coinCost,
        description: description.trim() || undefined,
      })
      onClose()
      setName('')
      setAssetKey('')
      setCoinCost(10)
      setDescription('')
    } catch (err) {
      console.error('Failed to create sticker:', err)
    }
  }

  if (!isOpen) return null

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.modalTitle}>Add Sticker to Shop</h2>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Rainbow Star"
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label>Emoji/Asset Key</label>
            <input
              type="text"
              value={assetKey}
              onChange={(e) => setAssetKey(e.target.value)}
              placeholder="⭐ or image-name"
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label>Coin Cost</label>
            <input
              type="number"
              value={coinCost}
              onChange={(e) => setCoinCost(Number(e.target.value))}
              min={0}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label>Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A shiny star for your wall!"
            />
          </div>
          <div className={styles.modalActions}>
            <button type="button" className={styles.cancelButton} onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={createSticker.isPending}
            >
              {createSticker.isPending ? 'Creating...' : 'Create Sticker'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function Store() {
  const [showCreateSticker, setShowCreateSticker] = useState(false)
  const [purchasingItemId, setPurchasingItemId] = useState<string | null>(null)

  const { data: coinBalance = 0, isLoading: isLoadingCoins } = useCoinBalance()
  const { data: storeItems = [], isLoading: isLoadingItems, error } = useStoreItems()
  const { data: inventory = [] } = useUserInventory()
  const purchaseItem = usePurchaseItem()

  const handlePurchase = async (item: StoreItem) => {
    if (purchasingItemId) return

    setPurchasingItemId(item.store_item_id)
    try {
      await purchaseItem.mutateAsync({
        storeItemId: item.store_item_id,
        quantity: 1,
      })
    } catch (err) {
      console.error('Purchase failed:', err)
      alert((err as Error).message)
    } finally {
      setPurchasingItemId(null)
    }
  }

  const stickers = storeItems.filter((i) => i.type === 'sticker')
  const tokens = storeItems.filter((i) => i.type === 'consumable_token')
  const rewards = storeItems.filter((i) => i.type === 'real_world_reward')

  return (
    <AppLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Shop</h1>
          <div className={styles.coinBalance}>
            <span className={styles.coinIcon}>🪙</span>
            <span className={styles.coinAmount}>
              {isLoadingCoins ? '...' : coinBalance}
            </span>
          </div>
        </header>

        {error && (
          <div className={styles.error}>Failed to load store. Please try again.</div>
        )}

        {isLoadingItems ? (
          <div className={styles.loading}>Loading store...</div>
        ) : storeItems.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🏪</div>
            <p className={styles.emptyText}>The shop is empty!</p>
            <p className={styles.emptySubtext}>
              Check back later for stickers, tokens, and rewards.
            </p>
            <button
              className={styles.addButton}
              onClick={() => setShowCreateSticker(true)}
            >
              + Add Sticker (Admin)
            </button>
          </div>
        ) : (
          <>
            {stickers.length > 0 && (
              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>Stickers</h2>
                  <button
                    className={styles.addButton}
                    onClick={() => setShowCreateSticker(true)}
                  >
                    + Add
                  </button>
                </div>
                <div className={styles.itemGrid}>
                  {stickers.map((item) => (
                    <StoreItemCard
                      key={item.store_item_id}
                      item={item}
                      onPurchase={handlePurchase}
                      isPurchasing={purchasingItemId === item.store_item_id}
                      coinBalance={coinBalance}
                    />
                  ))}
                </div>
              </section>
            )}

            {tokens.length > 0 && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Tokens</h2>
                <div className={styles.itemGrid}>
                  {tokens.map((item) => (
                    <StoreItemCard
                      key={item.store_item_id}
                      item={item}
                      onPurchase={handlePurchase}
                      isPurchasing={purchasingItemId === item.store_item_id}
                      coinBalance={coinBalance}
                    />
                  ))}
                </div>
              </section>
            )}

            {rewards.length > 0 && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Rewards</h2>
                <div className={styles.itemGrid}>
                  {rewards.map((item) => (
                    <StoreItemCard
                      key={item.store_item_id}
                      item={item}
                      onPurchase={handlePurchase}
                      isPurchasing={purchasingItemId === item.store_item_id}
                      coinBalance={coinBalance}
                    />
                  ))}
                </div>
              </section>
            )}

            {stickers.length === 0 && (
              <div className={styles.emptySection}>
                <button
                  className={styles.addButton}
                  onClick={() => setShowCreateSticker(true)}
                >
                  + Add Sticker (Admin)
                </button>
              </div>
            )}
          </>
        )}

        {inventory.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Your Inventory</h2>
            <div className={styles.inventoryGrid}>
              {inventory.map((item) => (
                <div key={item.user_inventory_id} className={styles.inventoryItem}>
                  <span className={styles.inventoryIcon}>
                    {item.item_type === 'sticker' ? '🎨' : item.item_type === 'consumable_token' ? '🛡️' : '📦'}
                  </span>
                  <span className={styles.inventoryName}>{item.item_name}</span>
                  <span className={styles.inventoryCount}>x{item.quantity}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <CreateStickerModal
          isOpen={showCreateSticker}
          onClose={() => setShowCreateSticker(false)}
        />
      </div>
    </AppLayout>
  )
}
