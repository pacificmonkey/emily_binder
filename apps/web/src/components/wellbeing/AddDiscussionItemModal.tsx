import { useState, type FormEvent } from 'react'
import { useCreateDiscussionItem } from '@/hooks/useWellbeing'
import styles from './LogSymptomModal.module.css'

interface AddDiscussionItemModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AddDiscussionItemModal({ isOpen, onClose }: AddDiscussionItemModalProps) {
  const [title, setTitle] = useState('')
  const [details, setDetails] = useState('')

  const [error, setError] = useState<string | null>(null)
  const createDiscussionItem = useCreateDiscussionItem()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setError(null)

    try {
      await createDiscussionItem.mutateAsync({
        title: title.trim(),
        details: details.trim() || null,
      })

      // Reset form and close
      setTitle('')
      setDetails('')
      onClose()
    } catch (err) {
      console.error('Failed to add discussion item:', err)
      setError(err instanceof Error ? err.message : 'Failed to add discussion item')
    }
  }

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Add Discussion Item</h2>
          <button className={styles.closeButton} onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          <div className={styles.field}>
            <label htmlFor="title" className={styles.label}>
              What do you want to discuss?
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className={styles.input}
              placeholder="e.g., Side effects from medication"
              required
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="details" className={styles.label}>
              Details - optional
            </label>
            <textarea
              id="details"
              value={details}
              onChange={e => setDetails(e.target.value)}
              className={`${styles.input} ${styles.textarea}`}
              placeholder="Add more context or questions you want to ask..."
            />
          </div>
        </form>

        <div className={styles.footer}>
          <button type="button" className={styles.cancelButton} onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className={styles.submitButton}
            onClick={handleSubmit}
            disabled={!title.trim() || createDiscussionItem.isPending}
          >
            {createDiscussionItem.isPending ? 'Adding...' : 'Add Item'}
          </button>
        </div>
      </div>
    </div>
  )
}
