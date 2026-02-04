import { useTodaysTasks, useCompleteTask, useUncompleteTask } from '@/hooks/useTasks'
import { TaskCard } from './TaskCard'
import styles from './TaskList.module.css'

export function TaskList() {
  const { data: tasks, isLoading, error } = useTodaysTasks()
  const completeTask = useCompleteTask()
  const uncompleteTask = useUncompleteTask()

  const handleComplete = async (taskId: string) => {
    await completeTask.mutateAsync({ taskId })
  }

  const handleUncomplete = async (taskId: string) => {
    await uncompleteTask.mutateAsync(taskId)
  }

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.error}>
        Failed to load tasks. Please try again.
      </div>
    )
  }

  const completedCount = tasks?.filter(
    t => t.task_instance?.completion_status === 'done'
  ).length ?? 0

  const totalCount = tasks?.length ?? 0

  if (totalCount === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>✨</div>
        <p className={styles.emptyText}>No tasks for today</p>
        <p className={styles.emptySubtext}>
          Add a task to get started on your missions!
        </p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Today's Tasks</h2>
        <span className={styles.count}>
          {completedCount} / {totalCount} done
        </span>
      </div>

      <div className={styles.list}>
        {tasks?.map(task => (
          <TaskCard
            key={task.task_id}
            task={task}
            onComplete={handleComplete}
            onUncomplete={handleUncomplete}
          />
        ))}
      </div>
    </div>
  )
}
