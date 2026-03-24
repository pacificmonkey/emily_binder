import { useState } from 'react'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/shared/loading-skeleton'
import { GoalCard } from '@/components/goals/goal-card'
import { AddGoalModal } from '@/components/goals/add-goal-modal'
import { useGoals } from '@/hooks/use-goals'

function GoalsSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2].map((i) => (
        <Skeleton key={i} className="h-64" />
      ))}
    </div>
  )
}

function GoalSection({
  title,
  type,
  isLoading,
  goals,
}: {
  title: string
  type: 'destiny' | 'quest'
  isLoading: boolean
  goals: any[]
}) {
  const emptyMessage =
    type === 'destiny'
      ? 'No destinies yet. Set a long-term goal to work toward.'
      : 'No quests yet. Create a short-term challenge.'

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-content">{title}</h2>

      {isLoading ? (
        <GoalsSkeleton />
      ) : goals.length === 0 ? (
        <EmptyState message={emptyMessage} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {goals.map((goal) => (
            <GoalCard key={goal.goal_id} goal={goal} />
          ))}
        </div>
      )}
    </section>
  )
}

export default function GoalsPage() {
  const [addGoalOpen, setAddGoalOpen] = useState(false)

  const { data: destinies, isLoading: destiniesLoading } = useGoals('destiny')
  const { data: quests, isLoading: questsLoading } = useGoals('quest')

  return (
    <div className="space-y-8">
      <PageHeader
        title="Goals"
        action={
          <Button onClick={() => setAddGoalOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New goal
          </Button>
        }
      />

      {/* Destinies Section */}
      <GoalSection
        title="Destinies"
        type="destiny"
        isLoading={destiniesLoading}
        goals={destinies || []}
      />

      {/* Quests Section */}
      <GoalSection
        title="Quests"
        type="quest"
        isLoading={questsLoading}
        goals={quests || []}
      />

      {/* Add Goal Modal */}
      <AddGoalModal open={addGoalOpen} onClose={() => setAddGoalOpen(false)} />
    </div>
  )
}
