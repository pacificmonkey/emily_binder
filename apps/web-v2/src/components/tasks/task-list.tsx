import { TaskCard, TaskCardSkeleton } from './task-card'
import { EmptyState } from '@/components/shared/empty-state'
import { ClipboardList } from 'lucide-react'

interface TaskListProps {
  tasks: any[]
  onComplete: (taskInstanceId: string) => void
  onUncomplete: (taskInstanceId: string) => void
  onTap?: (task: any) => void
  onAddTask?: () => void
}

export function TaskList({ tasks, onComplete, onUncomplete, onTap, onAddTask }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <EmptyState
        message="Nothing planned for today."
        actionLabel="Add a task"
        onAction={onAddTask}
        icon={<ClipboardList className="h-10 w-10" />}
      />
    )
  }

  // Group by category
  const grouped = tasks.reduce((acc: Record<string, any[]>, task: any) => {
    const category = task.category_name || 'Uncategorized'
    if (!acc[category]) acc[category] = []
    acc[category].push(task)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([category, categoryTasks]) => (
        <div key={category}>
          <h2 className="mb-2 text-sm font-semibold text-content-secondary uppercase tracking-wider">
            {category}
          </h2>
          <div className="space-y-2">
            {(categoryTasks as any[]).map((task: any) => (
              <TaskCard
                key={task.task_instance_id}
                task={task}
                onComplete={onComplete}
                onUncomplete={onUncomplete}
                onTap={onTap}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function TaskListSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 h-4 w-24 rounded bg-surface-sunken animate-pulse" />
        <div className="space-y-2">
          <TaskCardSkeleton />
          <TaskCardSkeleton />
          <TaskCardSkeleton />
        </div>
      </div>
    </div>
  )
}
