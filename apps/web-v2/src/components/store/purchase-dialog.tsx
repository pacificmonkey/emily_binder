import { useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { StoreItem } from '@/types/database'
import { usePurchaseItem } from '@/hooks/use-store'
import { Loader2 } from 'lucide-react'

interface PurchaseDialogProps {
  item: StoreItem | null
  currentBalance: number
  onClose: () => void
  open: boolean
}

export function PurchaseDialog({
  item,
  currentBalance,
  onClose,
  open,
}: PurchaseDialogProps) {
  const { mutate: purchaseItem, isPending } = usePurchaseItem()
  const reducedMotion = useReducedMotion()

  const hasEnoughCoins = currentBalance >= (item?.coin_cost ?? 0)
  const newBalance = (currentBalance - (item?.coin_cost ?? 0))

  const handleConfirm = () => {
    if (item && hasEnoughCoins) {
      purchaseItem(
        { storeItemId: item.store_item_id, quantity: 1 },
        {
          onSuccess: () => {
            // Close after a brief delay to show success animation
            setTimeout(onClose, 600)
          },
        }
      )
    }
  }

  useEffect(() => {
    if (!open) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, onClose])

  if (!open || !item) return null

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={reducedMotion ? { opacity: 1 } : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={reducedMotion ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <motion.div
        initial={reducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={reducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className={cn(
          'fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2',
          'rounded-soft bg-surface shadow-raised border border-border',
          'p-6'
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        <h2 id="dialog-title" className="text-xl font-semibold text-content mb-4">
          Confirm Purchase
        </h2>

        <div className="space-y-4 mb-6">
          {/* Item name */}
          <div>
            <p className="text-xs font-medium text-content-secondary uppercase tracking-wide">
              Item
            </p>
            <p className="text-lg font-medium text-content mt-1">{item.name}</p>
          </div>

          {/* Cost */}
          <div>
            <p className="text-xs font-medium text-content-secondary uppercase tracking-wide">
              Cost
            </p>
            <p className="text-lg font-medium text-content mt-1 flex items-center gap-1">
              ✦ {item.coin_cost}
            </p>
          </div>

          {/* Current balance */}
          <div>
            <p className="text-xs font-medium text-content-secondary uppercase tracking-wide">
              Current Balance
            </p>
            <p className="text-lg font-medium text-content mt-1 flex items-center gap-1">
              ✦ {currentBalance}
            </p>
          </div>

          {/* New balance */}
          <div className="rounded-soft bg-surface-sunken p-3">
            <p className="text-xs font-medium text-content-secondary uppercase tracking-wide">
              Balance After Purchase
            </p>
            <p
              className={cn(
                'text-lg font-semibold mt-1 flex items-center gap-1',
                hasEnoughCoins ? 'text-success' : 'text-danger'
              )}
            >
              ✦ {hasEnoughCoins ? newBalance : currentBalance}
            </p>
          </div>
        </div>

        {/* Error state */}
        {!hasEnoughCoins && (
          <div className="rounded-soft bg-danger-light border border-danger p-3 mb-6">
            <p className="text-sm font-medium text-danger">
              Not enough coins. You need {item.coin_cost} coins but only have {currentBalance}.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isPending}
            className={cn(
              'flex-1 px-4 py-2 rounded-soft font-medium text-sm',
              'bg-surface-sunken text-content',
              'hover:opacity-80 transition-opacity',
              'disabled:opacity-50'
            )}
          >
            Cancel
          </button>

          <button
            onClick={handleConfirm}
            disabled={!hasEnoughCoins || isPending}
            className={cn(
              'flex-1 px-4 py-2 rounded-soft font-medium text-sm',
              'flex items-center justify-center gap-2',
              'transition-all',
              hasEnoughCoins && !isPending
                ? 'bg-accent text-white hover:opacity-90 active:scale-95'
                : 'bg-surface-sunken text-content-muted cursor-not-allowed'
            )}
            aria-label={
              hasEnoughCoins
                ? `Confirm purchase of ${item.name} for ${item.coin_cost} coins`
                : 'Cannot confirm: not enough coins'
            }
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isPending ? 'Processing...' : 'Confirm'}
          </button>
        </div>
      </motion.div>
    </>
  )
}
