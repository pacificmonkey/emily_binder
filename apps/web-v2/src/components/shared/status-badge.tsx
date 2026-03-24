import { cn } from '@/lib/utils'
import { AlertTriangle, AlertCircle, CheckCircle, Info } from 'lucide-react'

type StatusVariant = 'critical' | 'warning' | 'ok' | 'info'

interface StatusBadgeProps {
  variant: StatusVariant
  label: string
  className?: string
}

const variantConfig: Record<StatusVariant, { bg: string; text: string; icon: typeof AlertCircle }> = {
  critical: { bg: 'bg-danger-light', text: 'text-danger-dark', icon: AlertCircle },
  warning: { bg: 'bg-warning-light', text: 'text-warning-dark', icon: AlertTriangle },
  ok: { bg: 'bg-success-light', text: 'text-success-dark', icon: CheckCircle },
  info: { bg: 'bg-info-light', text: 'text-info-dark', icon: Info },
}

export function StatusBadge({ variant, label, className }: StatusBadgeProps) {
  const config = variantConfig[variant]
  const Icon = config.icon

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-pill px-2.5 py-0.5 text-xs font-medium',
      config.bg,
      config.text,
      className
    )}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </span>
  )
}
