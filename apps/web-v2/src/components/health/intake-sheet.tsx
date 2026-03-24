import { useState } from 'react'
import { useLogIntake } from '@/hooks/use-medications'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface IntakeSheetProps {
  prescriptionId: string
  prescriptionName: string
  onClose: () => void
}

type IntakeStatus = 'taken' | 'skipped' | 'missed'

export function IntakeSheet({ prescriptionId, prescriptionName, onClose }: IntakeSheetProps) {
  const [status, setStatus] = useState<IntakeStatus>('taken')
  const [notes, setNotes] = useState('')
  const logIntake = useLogIntake()

  const handleSubmit = async () => {
    await logIntake.mutateAsync({
      prescription_id: prescriptionId,
      status,
      notes: notes || undefined,
      taken_at: new Date().toISOString(),
    })
    onClose()
  }

  const statusOptions: { value: IntakeStatus; label: string; color: string }[] = [
    { value: 'taken', label: 'Taken', color: 'bg-success text-white' },
    { value: 'skipped', label: 'Skipped', color: 'bg-warning text-white' },
    { value: 'missed', label: 'Missed', color: 'bg-danger text-white' },
  ]

  return (
    <div className="space-y-6 p-4">
      <div>
        <h2 className="text-lg font-semibold text-content">Log dose</h2>
        <p className="text-sm text-content-secondary">{prescriptionName}</p>
      </div>

      {/* Status selector */}
      <div>
        <Label>Status</Label>
        <div className="mt-2 flex gap-2" role="radiogroup" aria-label="Dose status">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatus(opt.value)}
              className={cn(
                'flex-1 rounded-soft py-3 text-sm font-medium transition-colors min-h-[44px]',
                'focus-visible:ring-2 focus-visible:ring-accent',
                status === opt.value
                  ? opt.color
                  : 'bg-surface-sunken text-content-secondary hover:bg-surface-sunken/80'
              )}
              role="radio"
              aria-checked={status === opt.value}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <Label htmlFor="intake-notes">Notes (optional)</Label>
        <Textarea
          id="intake-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any notes about this dose..."
          className="mt-1"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={logIntake.isPending} className="flex-1">
          {logIntake.isPending ? 'Logging...' : 'Log dose'}
        </Button>
      </div>
    </div>
  )
}
