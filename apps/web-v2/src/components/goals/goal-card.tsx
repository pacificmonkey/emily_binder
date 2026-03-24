import { forwardRef, useState } from 'react'
import { Trash2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { useDeleteGoal } from '@/hooks/use-goals'
import { GoalProgress } from './goal-progress'
import type { GoalWithMissions } from '@/types/database'

interface GoalCardProps {
  goal: GoalWithMissions
  className?: string
}

export const GoalCard = forwardRef<HTMLDivElement, GoalCardProps>(({ goal, className }, ref) => {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const deleteGoal = useDeleteGoal()

  const completedMissions = goal.missions.filter((m) => m.task_instance?.completion_status === 'done').length
  const totalMissions = goal.missions.length

  const handleDeleteConfirm = () => {
    deleteGoal.mutate(goal.goal_id)
    setDeleteConfirmOpen(false)
  }

  const goalTypeLabel = goal.goal_type === 'destiny' ? 'Destiny' : 'Quest'
  const isDestiny = goal.goal_type === 'destiny'

  return (
    <>
      <Card ref={ref} className={cn('overflow-hidden', className)}>
        <CardContent className="p-6">
          {/* Header with badge and delete button */}
          <div className="mb-4 flex items-start justify-between gap-3">
            <Badge
              variant={isDestiny ? 'default' : 'secondary'}
              className={isDestiny ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}
            >
              {goalTypeLabel}
            </Badge>
            <button
              onClick={() => setDeleteConfirmOpen(true)}
              className="rounded-soft p-2 text-content-muted transition-colors hover:bg-surface-sunken hover:text-danger"
              aria-label="Delete goal"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          {/* Title and description */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-content">{goal.title}</h3>
            {goal.description && <p className="mt-2 text-sm text-content-secondary">{goal.description}</p>}
          </div>

          {/* Progress ring and stats */}
          <div className="mb-6 flex items-center gap-4">
            <div className="flex-shrink-0">
              <GoalProgress completed={completedMissions} total={totalMissions} size="md" />
            </div>
            <div className="text-sm">
              <div className="text-content-secondary">Progress</div>
              <div className="mt-1 font-semibold text-content">
                {completedMissions} of {totalMissions} missions
              </div>
            </div>
          </div>

          {/* Missions list */}
          {totalMissions > 0 && (
            <div className="space-y-2 border-t border-border pt-4">
              <div className="text-xs font-semibold uppercase text-content-muted">Missions</div>
              <div className="space-y-2">
                {goal.missions.map((mission) => {
                  const isDone = mission.task_instance?.completion_status === 'done'
                  return (
                    <div key={mission.task_id} className="flex items-start gap-3 rounded-soft p-2 hover:bg-surface-sunken">
                      <div
                        className={cn(
                          'mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-soft border-2 transition-colors',
                          isDone
                            ? 'border-success bg-success'
                            : 'border-border bg-surface'
                        )}
                      >
                        {isDone && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={cn('text-sm', isDone ? 'line-through text-content-muted' : 'text-content')}>
                          {mission.title}
                        </p>
                        {mission.description && (
                          <p className="mt-0.5 text-xs text-content-muted">{mission.description}</p>
                        )}
                      </div>
                      {mission.points > 0 && (
                        <div className="flex-shrink-0 text-xs font-medium text-content-secondary">
                          {mission.points} pts
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Empty missions state */}
          {totalMissions === 0 && (
            <div className="rounded-soft bg-surface-sunken p-4 text-center text-sm text-content-muted">
              No missions linked yet
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete goal?"
        description="This goal and its missions will be permanently removed."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDeleteConfirm}
      />
    </>
  )
})

GoalCard.displayName = 'GoalCard'
