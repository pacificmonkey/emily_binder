import { cn } from '@/lib/utils'

interface EmptyStateProps {
  message: string
  actionLabel?: string
  onAction?: () => void
  icon?: React.ReactNode
  className?: string
}

export function EmptyState({ message, actionLabel, onAction, icon, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      {icon && <div className="mb-4 text-content-muted">{icon}</div>}
      <p className="text-content-secondary">{message}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 rounded-soft bg-accent px-4 py-2 text-sm font-medium text-accent-contrast hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
