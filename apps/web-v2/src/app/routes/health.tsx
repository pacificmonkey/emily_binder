import { useState, useMemo } from 'react'
import { usePrescriptions, useTodaysIntakes } from '@/hooks/use-medications'
import { MedicationCard, MedicationCardSkeleton } from '@/components/health/medication-card'
import { DoseCard } from '@/components/health/dose-card'
import { IntakeSheet } from '@/components/health/intake-sheet'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { SectionErrorBoundary } from '@/components/shared/error-boundary'
import { Pill } from 'lucide-react'

export default function HealthPage() {
  const { data: prescriptions, isLoading, error, refetch } = usePrescriptions()
  const { data: todaysIntakes } = useTodaysIntakes()
  const [intakeTarget, setIntakeTarget] = useState<{ id: string; name: string } | null>(null)

  // Group prescriptions by supply risk
  const grouped = useMemo(() => {
    if (!prescriptions) return { critical: [], warning: [], ok: [] }

    const critical: any[] = []
    const warning: any[] = []
    const ok: any[] = []

    for (const rx of prescriptions as any[]) {
      const days = rx.days_remaining
      if (days != null && days < 3) critical.push(rx)
      else if (days != null && days <= 7) warning.push(rx)
      else ok.push(rx)
    }

    return { critical, warning, ok }
  }, [prescriptions])

  return (
    <div className="space-y-6">
      <PageHeader title="Health" />

      <SectionErrorBoundary section="medications">
        {isLoading ? (
          <div className="space-y-3">
            <MedicationCardSkeleton />
            <MedicationCardSkeleton />
            <MedicationCardSkeleton />
          </div>
        ) : error ? (
          <div role="alert" className="rounded-soft bg-danger-light p-4 text-center">
            <p className="text-sm text-danger-dark">Couldn't load your medications. Check your connection.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">Try again</Button>
          </div>
        ) : !prescriptions || (prescriptions as any[]).length === 0 ? (
          <EmptyState
            message="No medications added yet."
            icon={<Pill className="h-10 w-10" />}
          />
        ) : (
          <>
            {/* Today's doses */}
            {todaysIntakes && (todaysIntakes as any[]).length > 0 && (
              <div>
                <h2 className="mb-2 text-sm font-semibold text-content-secondary">Today's doses</h2>
                <div className="flex gap-3 overflow-x-auto pb-2 -mb-2">
                  {(todaysIntakes as any[]).map((dose: any, i: number) => (
                    <DoseCard
                      key={`${dose.prescription_id}-${i}`}
                      dose={dose}
                      onLog={(id) => setIntakeTarget({ id, name: dose.display_name })}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Critical */}
            {grouped.critical.length > 0 && (
              <div>
                <h2 className="mb-2 text-sm font-semibold text-danger-dark uppercase tracking-wider">Critical</h2>
                <div className="space-y-2">
                  {grouped.critical.map((rx: any) => (
                    <MedicationCard key={rx.prescription_id} prescription={rx} />
                  ))}
                </div>
              </div>
            )}

            {/* Low */}
            {grouped.warning.length > 0 && (
              <div>
                <h2 className="mb-2 text-sm font-semibold text-warning-dark uppercase tracking-wider">Low</h2>
                <div className="space-y-2">
                  {grouped.warning.map((rx: any) => (
                    <MedicationCard key={rx.prescription_id} prescription={rx} />
                  ))}
                </div>
              </div>
            )}

            {/* OK */}
            {grouped.ok.length > 0 && (
              <div>
                <h2 className="mb-2 text-sm font-semibold text-success-dark uppercase tracking-wider">OK</h2>
                <div className="space-y-2">
                  {grouped.ok.map((rx: any) => (
                    <MedicationCard key={rx.prescription_id} prescription={rx} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </SectionErrorBoundary>

      {/* Intake sheet overlay */}
      {intakeTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIntakeTarget(null)} />
          <div className="relative z-50 w-full max-w-md rounded-t-2xl bg-surface sm:rounded-soft">
            <IntakeSheet
              prescriptionId={intakeTarget.id}
              prescriptionName={intakeTarget.name}
              onClose={() => setIntakeTarget(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
