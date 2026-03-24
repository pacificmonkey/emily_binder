import { cn } from '@/lib/utils'
import { StatusBadge } from '@/components/shared/status-badge'
import { Pill, Clock, AlertTriangle } from 'lucide-react'

interface MedicationCardProps {
  prescription: {
    prescription_id: string
    display_name: string
    strength_value?: number | null
    strength_unit?: string | null
    days_remaining?: number | null
    supply_status?: string
    frequency_description?: string | null
    times_per_day?: number | null
    next_refill_date?: string | null
  }
  onTap?: (prescription: any) => void
}

function getSupplyRisk(daysRemaining: number | null | undefined): { variant: 'critical' | 'warning' | 'ok'; label: string } {
  if (daysRemaining == null) return { variant: 'ok', label: 'Unknown supply' }
  if (daysRemaining < 3) return { variant: 'critical', label: 'Critical' }
  if (daysRemaining <= 7) return { variant: 'warning', label: 'Low' }
  return { variant: 'ok', label: 'OK' }
}

export function MedicationCard({ prescription, onTap }: MedicationCardProps) {
  const risk = getSupplyRisk(prescription.days_remaining)

  const riskBg: Record<string, string> = {
    critical: 'bg-danger-light/50',
    warning: 'bg-warning-light/50',
    ok: '',
  }

  return (
    <button
      onClick={() => onTap?.(prescription)}
      className={cn(
        'w-full text-left rounded-soft shadow-soft p-4 transition-shadow hover:shadow-raised',
        'focus-visible:ring-2 focus-visible:ring-accent',
        riskBg[risk.variant] || 'bg-surface'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Pill className="h-4 w-4 text-content-secondary flex-shrink-0" aria-hidden="true" />
            <span className="font-medium text-content truncate">
              {prescription.display_name}
              {prescription.strength_value && (
                <span className="text-content-secondary">
                  {' '}{prescription.strength_value}{prescription.strength_unit || 'mg'}
                </span>
              )}
            </span>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-content-secondary">
            {prescription.days_remaining != null && (
              <span>~{prescription.days_remaining} days left</span>
            )}
            {prescription.frequency_description && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" aria-hidden="true" />
                {prescription.frequency_description}
              </span>
            )}
          </div>

          {prescription.next_refill_date && risk.variant !== 'ok' && (
            <div className="mt-1.5 flex items-center gap-1 text-xs text-warning-dark">
              <AlertTriangle className="h-3 w-3" aria-hidden="true" />
              Refill: {prescription.next_refill_date}
            </div>
          )}
        </div>

        <StatusBadge variant={risk.variant} label={risk.label} />
      </div>
    </button>
  )
}

export function MedicationCardSkeleton() {
  return (
    <div className="rounded-soft bg-surface shadow-soft p-4 space-y-2">
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 rounded bg-surface-sunken animate-pulse" />
        <div className="h-5 w-40 rounded bg-surface-sunken animate-pulse" />
      </div>
      <div className="flex gap-3">
        <div className="h-4 w-24 rounded bg-surface-sunken animate-pulse" />
        <div className="h-4 w-16 rounded bg-surface-sunken animate-pulse" />
      </div>
    </div>
  )
}
