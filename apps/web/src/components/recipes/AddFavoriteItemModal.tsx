import { useState } from 'react'
import { useCreateFavoriteItem } from '@/hooks/useRecipes'
import styles from './AddRecipeModal.module.css'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export function AddFavoriteItemModal({ isOpen, onClose }: Props) {
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('')
  const [categoryHint, setCategoryHint] = useState('')
  const [error, setError] = useState<string | null>(null)

  const createFavoriteItem = useCreateFavoriteItem()

  const resetForm = () => {
    setName('')
    setQuantity('')
    setUnit('')
    setCategoryHint('')
    setError(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Item name is required')
      return
    }

    try {
      await createFavoriteItem.mutateAsync({
        name: name.trim(),
        default_quantity: quantity ? parseFloat(quantity) : null,
        default_unit: unit.trim() || null,
        category_hint: categoryHint.trim() || null,
      })
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create staple item')
    }
  }

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <div className={styles.header}>
          <h2 className={styles.title}>Add Staple Item</h2>
          <button className={styles.closeButton} onClick={handleClose}>
            &times;
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.field}>
            <label className={styles.label}>Item Name *</label>
            <input
              type="text"
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Milk"
              autoFocus
            />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Default Quantity</label>
              <input
                type="number"
                className={styles.input}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="1"
                step="0.5"
                min="0"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Unit</label>
              <input
                type="text"
                className={styles.input}
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="gallon"
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Category (for organization)</label>
            <input
              type="text"
              className={styles.input}
              value={categoryHint}
              onChange={(e) => setCategoryHint(e.target.value)}
              placeholder="e.g., Dairy, Produce, Pantry"
            />
          </div>
        </form>

        <div className={styles.footer}>
          <button type="button" className={styles.cancelButton} onClick={handleClose}>
            Cancel
          </button>
          <button
            type="submit"
            className={styles.submitButton}
            onClick={handleSubmit}
            disabled={createFavoriteItem.isPending}
          >
            {createFavoriteItem.isPending ? 'Saving...' : 'Add Staple'}
          </button>
        </div>
      </div>
    </div>
  )
}
