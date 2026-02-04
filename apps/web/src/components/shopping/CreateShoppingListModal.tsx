import { useState } from 'react'
import { useCreateShoppingList } from '@/hooks/useShopping'
import { useRecipes, useFavoriteItems } from '@/hooks/useRecipes'
import styles from './CreateShoppingListModal.module.css'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export function CreateShoppingListModal({ isOpen, onClose }: Props) {
  const [title, setTitle] = useState('')
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>([])
  const [includeFavorites, setIncludeFavorites] = useState(false)
  const [manualItems, setManualItems] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data: recipes = [] } = useRecipes()
  const { data: favorites = [] } = useFavoriteItems()
  const createShoppingList = useCreateShoppingList()

  const resetForm = () => {
    setTitle('')
    setSelectedRecipeIds([])
    setIncludeFavorites(false)
    setManualItems('')
    setError(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const toggleRecipe = (recipeId: string) => {
    if (selectedRecipeIds.includes(recipeId)) {
      setSelectedRecipeIds(selectedRecipeIds.filter((id) => id !== recipeId))
    } else {
      setSelectedRecipeIds([...selectedRecipeIds, recipeId])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('List title is required')
      return
    }

    // Parse manual items (one per line)
    const items = manualItems
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line)
      .map((name) => ({ name }))

    try {
      await createShoppingList.mutateAsync({
        title: title.trim(),
        recipe_ids: selectedRecipeIds.length > 0 ? selectedRecipeIds : undefined,
        include_favorites: includeFavorites,
        items: items.length > 0 ? items : undefined,
      })
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create shopping list')
    }
  }

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Create Shopping List</h2>
          <button className={styles.closeButton} onClick={handleClose}>
            &times;
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.field}>
            <label className={styles.label}>List Name *</label>
            <input
              type="text"
              className={styles.input}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Weekly Groceries"
              autoFocus
            />
          </div>

          {recipes.length > 0 && (
            <div className={styles.field}>
              <label className={styles.label}>Add from Recipes</label>
              <div className={styles.recipeList}>
                {recipes.map((recipe) => (
                  <label key={recipe.recipe_id} className={styles.recipeItem}>
                    <input
                      type="checkbox"
                      checked={selectedRecipeIds.includes(recipe.recipe_id)}
                      onChange={() => toggleRecipe(recipe.recipe_id)}
                    />
                    <span>{recipe.title}</span>
                    {recipe.ingredient_count && (
                      <span className={styles.ingredientCount}>
                        {recipe.ingredient_count} items
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          {favorites.length > 0 && (
            <div className={styles.field}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={includeFavorites}
                  onChange={(e) => setIncludeFavorites(e.target.checked)}
                />
                <span>Include staple items ({favorites.length})</span>
              </label>
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.label}>Additional Items</label>
            <textarea
              className={`${styles.input} ${styles.textarea}`}
              value={manualItems}
              onChange={(e) => setManualItems(e.target.value)}
              placeholder="Enter one item per line..."
              rows={4}
            />
            <span className={styles.hint}>Enter one item per line</span>
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
            disabled={createShoppingList.isPending}
          >
            {createShoppingList.isPending ? 'Creating...' : 'Create List'}
          </button>
        </div>
      </div>
    </div>
  )
}
