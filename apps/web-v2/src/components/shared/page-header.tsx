import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, action, className }: PageHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div>
        <h1 className="text-2xl font-semibold text-content">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-content-secondary">{subtitle}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}
