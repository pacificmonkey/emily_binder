import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useSettingsStore } from '@/stores/settings-store'
import { StatusBadge } from '@/components/shared/status-badge'
import type { BudgetAccount } from '@/types/database'

interface AccountCardProps {
  account: BudgetAccount
  balance: number
  totalPlanned: number
  totalActual: number
  className?: string
}

export function AccountCard({
  account,
  balance,
  totalPlanned,
  totalActual,
  className,
}: AccountCardProps) {
  const privacyMode = useSettingsStore((state) => state.privacyMode)
  const [isBalanceRevealed, setIsBalanceRevealed] = useState(false)

  const isPositive = balance >= 0
  const progressPercentage = totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0

  const balanceColor = isPositive ? 'text-success' : 'text-danger'
  const leftBorderColor = isPositive ? 'border-l-success' : 'border-l-danger'

  return (
    <div
      className={cn(
        'rounded-soft bg-surface shadow-soft p-4 border-l-4 transition-all',
        leftBorderColor,
        className
      )}
    >
      {/* Header: Name and Restriction Badge */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-lg font-semibold text-content">{account.name}</h3>
        {account.restriction_type !== 'none' && (
          <StatusBadge
            variant="info"
            label={account.restriction_type.replace(/_/g, ' ').toUpperCase()}
            className="text-xs"
          />
        )}
      </div>

      {/* Balance Section */}
      <div className="mb-4">
        <p className="text-xs font-medium text-content-muted uppercase tracking-wide mb-1">
          Balance
        </p>
        <div
          className={cn(
            'relative inline-block cursor-pointer rounded-soft px-3 py-2',
            privacyMode && !isBalanceRevealed && 'bg-surface-sunken'
          )}
          onClick={() => privacyMode && setIsBalanceRevealed(!isBalanceRevealed)}
          role="button"
          aria-label={`Account balance: ${balance >= 0 ? '+' : ''}$${Math.abs(balance).toFixed(2)}`}
          tabIndex={0}
          onKeyDown={(e) => {
            if (privacyMode && (e.key === 'Enter' || e.key === ' ')) {
              setIsBalanceRevealed(!isBalanceRevealed)
            }
          }}
        >
          <span
            className={cn(
              'text-2xl font-bold transition-all',
              balanceColor,
              privacyMode && !isBalanceRevealed && 'blur-sm'
            )}
            aria-live="polite"
          >
            {balance >= 0 ? '+' : '-'}${Math.abs(balance).toFixed(2)}
          </span>
          {privacyMode && !isBalanceRevealed && (
            <p className="text-xs text-content-muted mt-1">Tap to reveal</p>
          )}
        </div>
      </div>

      {/* Progress Section */}
      {totalPlanned > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-xs font-medium text-content-muted">
              Spending: ${totalActual.toFixed(2)} / ${totalPlanned.toFixed(2)}
            </p>
            <span
              className={cn(
                'text-xs font-semibold',
                progressPercentage <= 100 ? 'text-success' : 'text-warning'
              )}
            >
              {Math.min(Math.round(progressPercentage), 999)}%
            </span>
          </div>
          <div className="w-full h-2 rounded-pill bg-surface-sunken overflow-hidden">
            <div
              className={cn(
                'h-full rounded-pill transition-all duration-300',
                progressPercentage <= 100 ? 'bg-success' : 'bg-warning'
              )}
              style={{ width: `${Math.min(progressPercentage, 100)}%` }}
              role="progressbar"
              aria-valuenow={Math.round(progressPercentage)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Spending progress"
            />
          </div>
        </div>
      )}

      {/* Footer Notes */}
      {account.notes && (
        <p className="text-xs text-content-muted line-clamp-1">{account.notes}</p>
      )}
    </div>
  )
}
