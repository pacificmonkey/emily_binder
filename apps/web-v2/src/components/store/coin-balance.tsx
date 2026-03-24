import { forwardRef, useState, useRef, useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useCoinBalance, useCoinHistory } from '@/hooks/use-store'
import { formatDistanceToNow } from 'date-fns'
import { ChevronDown, X } from 'lucide-react'

interface CoinBalanceProps {
  className?: string
}

export const CoinBalance = forwardRef<HTMLDivElement, CoinBalanceProps>(
  ({ className }, ref) => {
    const { data: balance = 0, isLoading } = useCoinBalance()
    const { data: history = [] } = useCoinHistory(20)
    const [isOpen, setIsOpen] = useState(false)
    const [prevBalance, setPrevBalance] = useState(balance)
    const reducedMotion = useReducedMotion()
    const contentRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
      if (balance !== prevBalance) {
        setPrevBalance(balance)
      }
    }, [balance, prevBalance])

    return (
      <div ref={ref} className={cn('relative', className)}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'flex items-center gap-2 rounded-pill bg-surface px-4 py-2 shadow-soft',
            'hover:shadow-raised transition-shadow',
            'font-semibold text-content'
          )}
          aria-label={`Coin balance: ${balance} coins, click to view history`}
          aria-expanded={isOpen}
          aria-controls="coin-history"
        >
          <motion.span
            key={balance}
            animate={reducedMotion ? { scale: 1 } : { scale: [1, 1.2, 1] }}
            transition={{ duration: 0.3 }}
            className="text-lg"
          >
            ✦
          </motion.span>
          <span aria-live="polite" aria-atomic="true">
            {isLoading ? '...' : balance}
          </span>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-content-secondary transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        </button>

        {isOpen && (
          <motion.div
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            id="coin-history"
            ref={contentRef}
            className={cn(
              'absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto',
              'rounded-soft bg-surface shadow-raised border border-border',
              'z-50'
            )}
          >
            <div className="sticky top-0 flex items-center justify-between bg-surface-sunken px-4 py-3 border-b border-border">
              <h3 className="font-semibold text-content text-sm">Coin History</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded p-1 hover:bg-surface transition-colors"
                aria-label="Close history"
              >
                <X className="h-4 w-4 text-content-muted" />
              </button>
            </div>

            {history.length === 0 ? (
              <div className="p-4 text-center text-sm text-content-secondary">
                No transaction history yet
              </div>
            ) : (
              <div className="divide-y divide-border">
                {history.map((entry) => (
                  <div
                    key={entry.coin_ledger_entry_id}
                    className="px-4 py-3 hover:bg-surface-sunken transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-content truncate">
                          {entry.reason}
                        </p>
                        <p className="text-xs text-content-muted mt-0.5">
                          {formatDistanceToNow(new Date(entry.occurred_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                      <div
                        className={cn(
                          'font-semibold text-sm whitespace-nowrap',
                          entry.delta > 0 ? 'text-success' : 'text-danger'
                        )}
                        aria-label={`${entry.delta > 0 ? 'Earned' : 'Spent'} ${Math.abs(
                          entry.delta
                        )} coins`}
                      >
                        {entry.delta > 0 ? '+' : ''}
                        {entry.delta}
                      </div>
                    </div>
                    {entry.notes && (
                      <p className="text-xs text-content-secondary mt-1">{entry.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {isOpen && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
        )}
      </div>
    )
  }
)

CoinBalance.displayName = 'CoinBalance'
