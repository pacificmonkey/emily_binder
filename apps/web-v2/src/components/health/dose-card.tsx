import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

interface DoseCardProps {
  dose: {
    prescription_id: string
    display_name: string
    scheduled_time?: string | null
    status?: 'taken' | 'pending' | 'missed' | 'skipped'
  }
  onLog?: (prescriptionId: string) => void
}

export function DoseCard({ dose, onLog }: DoseCardProps) {
  const isTaken = dose.status === 'taken'
  const isMissed = dose.status === 'missed'

  return (
    <div className={cn(
      'flex flex-col items-center gap-1.5 rounded-soft p-3 min-w-[100px]',
      isTaken ? 'bg-success-light' : isMissed ? 'bg-danger-light' : 'bg-surface shadow-soft'
    )}>
      <span className="text-xs font-medium text-content truncate max-w-full">
        {dose.display_name}
      </span>
      {dose.scheduled_time && (
        <span className="text-[10px] text-content-muted">
          {dose.scheduled_time}
        </span>
      )}
      {isTaken ? (
        <span className="flex items-center gap-1 text-xs font-medium text-success-dark">
          <Check className="h-3.5 w-3.5" /> Taken
        </span>
      ) : (
        <button
          onClick={() => onLog?.(dose.prescription_id)}
          className="rounded-soft bg-accent px-3 py-1 text-xs font-medium text-accent-contrast hover:bg-accent-hover min-h-[32px]"
        >
          Log dose
        </button>
      )}
    </div>
  )
}
