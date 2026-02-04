import { useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { TaskList, AddTaskModal } from '@/components/tasks'
import { PointsDisplay } from '@/components/progress'
import { StreakChips } from '@/components/streaks'
import { StickerOverlay } from '@/components/stickers'
import styles from './Home.module.css'

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export function Home() {
  const [showAddTask, setShowAddTask] = useState(false)

  return (
    <AppLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.greeting}>Today's Missions</h1>
          <p className={styles.date}>{formatDate(new Date())}</p>
        </header>

        <section className={styles.progressSection}>
          <PointsDisplay />
          <StreakChips />
        </section>

        <section className={styles.tasksSection}>
          <TaskList />
        </section>

        <button
          className={styles.fab}
          onClick={() => setShowAddTask(true)}
          aria-label="Add task"
        >
          +
        </button>

        <AddTaskModal
          isOpen={showAddTask}
          onClose={() => setShowAddTask(false)}
        />

        <StickerOverlay />
      </div>
    </AppLayout>
  )
}
