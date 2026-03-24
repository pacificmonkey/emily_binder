import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { format } from 'date-fns'
import { Plus } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { useTodaysTasks, useCompleteTask, useUncompleteTask, useDailyWin } from '@/hooks/use-tasks'
import { useStreaks } from '@/hooks/use-streaks'
import { useUserProgress } from '@/hooks/use-user-progress'
import { useNotificationCount } from '@/hooks/use-notifications'
import { TaskList, TaskListSkeleton } from '@/components/tasks/task-list'
import { MoodCheck } from '@/components/shared/mood-check'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toaster'
import { SectionErrorBoundary } from '@/components/shared/error-boundary'

export default function TodayPage() {
  const navigate = useNavigate()
  const displayName = useAuthStore((s) => s.displayName)
  const { data: tasks, isLoading: tasksLoading, error: tasksError, refetch: refetchTasks } = useTodaysTasks()
  const { data: dailyWin } = useDailyWin()
  const { data: streaks } = useStreaks()
  const { data: progress } = useUserProgress()
  const { data: notifCount } = useNotificationCount()
  const completeTask = useCompleteTask()
  const uncompleteTask = useUncompleteTask()


  const handleComplete = (taskInstanceId: string) => {
    completeTask.mutate(taskInstanceId)

    // Show undo toast for 5 seconds

    toast({
      title: `+${(tasks?.find((t: any) => t.task_instance_id === taskInstanceId) as any)?.points || 0} points!`,
      variant: 'success',
      action: {
        label: 'Undo',
        onClick: () => {
          uncompleteTask.mutate(taskInstanceId)
          toast({ title: 'Task uncompleted.' })
        },
      },
      duration: 5000,
    })
  }

  const handleUncomplete = (taskInstanceId: string) => {
    uncompleteTask.mutate(taskInstanceId)
    toast({ title: 'Task uncompleted.' })
  }

  // Greeting
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  // Daily win calculation
  const totalTasks = tasks?.length ?? 0
  const completedTasks = tasks?.filter((t: any) => t.status === 'completed').length ?? 0
  const allDone = totalTasks > 0 && completedTasks >= totalTasks && (dailyWin?.is_won ?? false)

  return (
    <div className="space-y-6">
      {/* Greeting bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-content">
            {greeting}, {displayName || 'there'}
          </h1>
          <p className="text-sm text-content-secondary">{format(new Date(), 'EEEE, MMMM d')}</p>
        </div>
        <button
          onClick={() => navigate('/notifications')}
          className="relative rounded-full p-2 hover:bg-surface-sunken focus-visible:ring-2 focus-visible:ring-accent"
          aria-label={`Notifications${notifCount ? ` (${notifCount} unread)` : ''}`}
        >
          <Bell className="h-6 w-6 text-content-secondary" />
          {notifCount != null && notifCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
              {notifCount > 99 ? '99+' : notifCount}
            </span>
          )}
        </button>
      </div>

      {/* Daily progress card */}
      <SectionErrorBoundary section="progress">
        <Card>
          <CardContent className="space-y-4">
            {/* Points and level */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-content-secondary">Today: </span>
                <span className="font-semibold text-accent" aria-live="polite">
                  +{progress?.points_today ?? 0} VP
                </span>
              </div>
              <Badge variant="default">
                Lv {progress?.current_level ?? 1}
              </Badge>
            </div>

            {/* Level progress */}
            {progress && (
              <Progress
                value={progress.level_progress ?? 0}
                max={progress.level_target ?? 100}
                label={`Level progress: ${progress.level_progress ?? 0} of ${progress.level_target ?? 100} points`}
              />
            )}

            {/* Daily win bar */}
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-content-secondary">Daily Win</span>
                <span className="font-medium text-content" aria-live="polite">
                  {completedTasks} of {totalTasks} done
                </span>
              </div>
              <Progress
                value={completedTasks}
                max={Math.max(totalTasks, 1)}
                label={`Daily win: ${completedTasks} of ${totalTasks} tasks done`}
                className={allDone ? '[&>div]:bg-success' : ''}
              />
              {allDone && (
                <p className="mt-1 text-xs font-medium text-success" role="status">
                  You did it — all tasks done today!
                </p>
              )}
            </div>

            {/* Streak chips */}
            {streaks && (streaks as any[]).length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1 -mb-1" role="list" aria-label="Active streaks">
                {(streaks as any[]).map((streak: any) => (
                  <button
                    key={streak.streak_id || streak.streak_definition_id}
                    className="flex items-center gap-1.5 whitespace-nowrap rounded-pill bg-surface-sunken px-3 py-1.5 text-xs font-medium text-content-secondary hover:bg-surface-sunken/80 focus-visible:ring-2 focus-visible:ring-accent"
                    role="listitem"
                    aria-label={`${streak.name}: ${streak.current_count ?? 0} day streak`}
                  >
                    <span>{streak.emoji || '🔥'}</span>
                    <span>{streak.name}</span>
                    <span className="font-bold text-content">{streak.current_count ?? 0}d</span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </SectionErrorBoundary>

      {/* Mood check */}
      <MoodCheck />

      {/* Task list */}
      <SectionErrorBoundary section="tasks">
        {tasksLoading ? (
          <TaskListSkeleton />
        ) : tasksError ? (
          <div role="alert" className="rounded-soft bg-danger-light p-4 text-center">
            <p className="text-sm text-danger-dark">Couldn't load your tasks. Check your connection.</p>
            <Button variant="outline" size="sm" onClick={() => refetchTasks()} className="mt-2">
              Try again
            </Button>
          </div>
        ) : (
          <TaskList
            tasks={tasks ?? []}
            onComplete={handleComplete}
            onUncomplete={handleUncomplete}
            onAddTask={() => navigate('/tasks/add')}
          />
        )}
      </SectionErrorBoundary>

      {/* FAB */}
      <button
        onClick={() => navigate('/tasks/add')}
        className="fixed bottom-24 right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-contrast shadow-raised hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 sm:bottom-8"
        aria-label="Add task"
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  )
}
