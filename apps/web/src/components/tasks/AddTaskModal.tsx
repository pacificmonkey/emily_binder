import { useState, type FormEvent } from 'react'
import { useCreateTask } from '@/hooks/useTasks'
import styles from './AddTaskModal.module.css'

interface AddTaskModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AddTaskModal({ isOpen, onClose }: AddTaskModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [points, setPoints] = useState('10')
  const [mustDo, setMustDo] = useState(false)

  const createTask = useCreateTask()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    await createTask.mutateAsync({
      title: title.trim(),
      description: description.trim() || null,
      points: parseInt(points, 10) || 10,
      must_do: mustDo,
    })

    // Reset form and close
    setTitle('')
    setDescription('')
    setPoints('10')
    setMustDo(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Add Task</h2>
          <button className={styles.closeButton} onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="title" className={styles.label}>
              Task Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className={styles.input}
              placeholder="What needs to be done?"
              required
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="description" className={styles.label}>
              Description (optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className={`${styles.input} ${styles.textarea}`}
              placeholder="Add details..."
            />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="points" className={styles.label}>
                Points
              </label>
              <input
                id="points"
                type="number"
                min="1"
                max="100"
                value={points}
                onChange={e => setPoints(e.target.value)}
                className={styles.input}
              />
            </div>
          </div>

          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={mustDo}
              onChange={e => setMustDo(e.target.checked)}
            />
            <span>Mark as Must Do</span>
          </label>
        </form>

        <div className={styles.footer}>
          <button type="button" className={styles.cancelButton} onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className={styles.submitButton}
            onClick={handleSubmit}
            disabled={!title.trim() || createTask.isPending}
          >
            {createTask.isPending ? 'Adding...' : 'Add Task'}
          </button>
        </div>
      </div>
    </div>
  )
}
