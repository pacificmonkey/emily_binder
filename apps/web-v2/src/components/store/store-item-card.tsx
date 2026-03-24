import { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { StoreItem } from '@/types/database'

interface StoreItemCardProps {
  item: StoreItem
  balance: number
  onBuy: (item: StoreItem) => void
  className?: string
}

const typeIcons: Record<string, string> = {
  sticker: '⭐',
  home_decoration: '🎨',
  consumable_token: '🛡️',
  real_world_reward: '🎁',
}

const typeLabels: Record<string, string> = {
  sticker: 'Sticker',
  home_decoration: 'Decoration',
  consumable_token: 'Token',
  real_world_reward: 'Reward',
}

export const StoreItemCard = forwardRef<HTMLDivElement, StoreItemCardProps>(
  ({ item, balance, onBuy, className }, ref) => {
    const hasEnoughCoins = balance >= item.coin_cost
    const isOwned = (item.owned_quantity ?? 0) > 0

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col rounded-soft bg-surface shadow-soft hover:shadow-raised',
          'transition-shadow overflow-hidden',
          'border border-border',
          className
        )}
      >
        {/* Header with type badge */}
        <div className="flex items-start justify-between gap-2 p-4 pb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-content text-sm leading-tight truncate">
              {item.name}
            </h3>
          </div>
          <Badge variant="secondary" className="flex-shrink-0">
            {typeIcons[item.type as keyof typeof typeIcons]} {typeLabels[item.type as keyof typeof typeLabels]}
          </Badge>
        </div>

        {/* Description */}
        {item.description && (
          <p className="px-4 text-xs text-content-secondary line-clamp-2">
            {item.description}
          </p>
        )}

        {/* Owned badge */}
        {isOwned && (
          <div className="px-4 pt-2">
            <Badge variant="outline" className="text-xs">
              Owned: {item.owned_quantity}
            </Badge>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Footer with cost and button */}
        <div className="flex items-end justify-between gap-3 p-4 pt-3 border-t border-border">
          <div
            className="flex items-center gap-1 font-semibold text-sm text-content"
            aria-label={`Cost: ${item.coin_cost} coins`}
          >
            ✦
            <span>{item.coin_cost}</span>
          </div>

          <button
            onClick={() => onBuy(item)}
            disabled={!hasEnoughCoins}
            className={cn(
              'px-3 py-2 rounded-soft text-sm font-medium',
              'transition-all',
              hasEnoughCoins
                ? 'bg-accent text-white hover:opacity-90 active:scale-95'
                : 'bg-surface-sunken text-content-muted cursor-not-allowed'
            )}
            aria-label={
              hasEnoughCoins
                ? `Buy ${item.name} for ${item.coin_cost} coins`
                : `Not enough coins to buy ${item.name}. Need ${item.coin_cost}, have ${balance}`
            }
          >
            Buy
          </button>
        </div>
      </div>
    )
  }
)

StoreItemCard.displayName = 'StoreItemCard'
