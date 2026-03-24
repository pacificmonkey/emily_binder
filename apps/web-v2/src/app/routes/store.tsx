import { useState, useMemo } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { CoinBalance } from '@/components/store/coin-balance'
import { StoreItemCard } from '@/components/store/store-item-card'
import { PurchaseDialog } from '@/components/store/purchase-dialog'
import { useStoreItems, useCoinBalance, useUserInventory } from '@/hooks/use-store'
import type { StoreItem, StoreItemType } from '@/types/database'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

type FilterType = 'all' | StoreItemType

const FILTER_LABELS: Record<FilterType, string> = {
  all: 'All',
  sticker: 'Stickers',
  home_decoration: 'Decorations',
  consumable_token: 'Tokens',
  real_world_reward: 'Rewards',
}

// Skeleton card for loading state
function StoreItemSkeleton() {
  return (
    <div className="rounded-soft bg-surface shadow-soft border border-border overflow-hidden animate-pulse">
      <div className="h-32 bg-surface-sunken" />
    </div>
  )
}

export default function StorePage() {
  const [selectedItem, setSelectedItem] = useState<StoreItem | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [filterType, setFilterType] = useState<FilterType>('all')

  const { data: storeItems = [], isLoading: itemsLoading } = useStoreItems()
  const { data: balance = 0 } = useCoinBalance()
  const { data: inventory = [] } = useUserInventory()

  // Create a map of owned quantities
  const ownedMap = useMemo(() => {
    return inventory.reduce(
      (acc, inv) => {
        acc[inv.store_item_id] = inv.quantity
        return acc
      },
      {} as Record<string, number>
    )
  }, [inventory])

  // Merge owned quantities into items
  const itemsWithOwned = useMemo(() => {
    return storeItems
      .filter((item) => item.enabled)
      .map((item) => ({
        ...item,
        owned_quantity: ownedMap[item.store_item_id] ?? 0,
      }))
  }, [storeItems, ownedMap])

  // Filter items by type
  const filteredItems = useMemo(() => {
    if (filterType === 'all') {
      return itemsWithOwned
    }
    return itemsWithOwned.filter((item) => item.type === filterType)
  }, [itemsWithOwned, filterType])

  const handleBuyClick = (item: StoreItem) => {
    setSelectedItem(item)
    setShowDialog(true)
  }

  const handleDialogClose = () => {
    setShowDialog(false)
    setTimeout(() => setSelectedItem(null), 300)
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header with coin balance */}
      <div className="flex items-start justify-between gap-4">
        <PageHeader title="Shop" />
        <div className="flex-shrink-0">
          <CoinBalance />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
        {(Object.entries(FILTER_LABELS) as [FilterType, string][]).map(([type, label]) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={cn(
              'px-4 py-2 rounded-pill whitespace-nowrap font-medium text-sm transition-all',
              'flex-shrink-0',
              filterType === type
                ? 'bg-accent text-white shadow-raised'
                : 'bg-surface-sunken text-content-secondary hover:bg-surface hover:text-content'
            )}
            aria-pressed={filterType === type}
            aria-label={`Filter by ${label}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {itemsLoading ? (
        // Loading state with skeleton cards
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <StoreItemSkeleton key={i} />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        // Empty state
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-soft bg-surface-sunken border border-border p-8 text-center"
        >
          <p className="text-lg font-semibold text-content mb-2">The shop is empty right now.</p>
          <p className="text-content-secondary">Check back soon for new items!</p>
        </motion.div>
      ) : (
        // Grid of items
        <motion.div
          layout
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {filteredItems.map((item) => (
            <motion.div
              key={item.store_item_id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <StoreItemCard
                item={item}
                balance={balance}
                onBuy={handleBuyClick}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Purchase dialog */}
      <PurchaseDialog
        item={selectedItem}
        currentBalance={balance}
        onClose={handleDialogClose}
        open={showDialog}
      />
    </div>
  )
}
