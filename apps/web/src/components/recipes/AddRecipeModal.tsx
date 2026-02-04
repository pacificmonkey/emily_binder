import { useState, KeyboardEvent } from 'react'
import { useCreateRecipe } from '@/hooks/useRecipes'
import type { RecipeUnit } from '@/types/database'
import styles from './AddRecipeModal.module.css'

interface Ingredient {
  name: string
  quantity: string
  unit: RecipeUnit | ''
  notes: string
}

const UNITS: RecipeUnit[] = ['tsp', 'tbsp', 'cup', 'oz', 'lb', 'g', 'kg', 'mL', 'L', 'count', 'pinch', 'other']

interface Props {
  isOpen: boolean
  onClose: () => void
}

export function AddRecipeModal({ isOpen, onClose }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [instructions, setInstructions] = useState('')
  const [servings, setServings] = useState('')
  const [prepMinutes, setPrepMinutes] = useState('')
  const [cookMinutes, setCookMinutes] = useState('')
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { name: '', quantity: '', unit: '', notes: '' },
  ])
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [isFavorite, setIsFavorite] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createRecipe = useCreateRecipe()

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setInstructions('')
    setServings('')
    setPrepMinutes('')
    setCookMinutes('')
    setIngredients([{ name: '', quantity: '', unit: '', notes: '' }])
    setTags([])
    setTagInput('')
    setIsFavorite(false)
    setError(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const addIngredient = () => {
    setIngredients([...ingredients, { name: '', quantity: '', unit: '', notes: '' }])
  }

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  const updateIngredient = (index: number, field: keyof Ingredient, value: string) => {
    const updated = [...ingredients]
    updated[index] = { ...updated[index], [field]: value }
    setIngredients(updated)
  }

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const tag = tagInput.trim().toLowerCase()
      if (tag && !tags.includes(tag)) {
        setTags([...tags, tag])
      }
      setTagInput('')
    } else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      setTags(tags.slice(0, -1))
    }
  }

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('Recipe title is required')
      return
    }

    // Filter out empty ingredients
    const validIngredients = ingredients
      .filter((ing) => ing.name.trim())
      .map((ing) => ({
        name: ing.name.trim(),
        quantity: ing.quantity ? parseFloat(ing.quantity) : null,
        unit: ing.unit || null,
        notes: ing.notes.trim() || null,
      }))

    try {
      await createRecipe.mutateAsync({
        title: title.trim(),
        description: description.trim() || null,
        instructions: instructions.trim() || null,
        servings: servings ? parseInt(servings) : null,
        prep_minutes: prepMinutes ? parseInt(prepMinutes) : null,
        cook_minutes: cookMinutes ? parseInt(cookMinutes) : null,
        tags: tags.length > 0 ? tags : undefined,
        is_favorite: isFavorite,
        ingredients: validIngredients,
      })
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create recipe')
    }
  }

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Add Recipe</h2>
          <button className={styles.closeButton} onClick={handleClose}>
            &times;
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.field}>
            <label className={styles.label}>Recipe Name *</label>
            <input
              type="text"
              className={styles.input}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Chicken Stir Fry"
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Description</label>
            <textarea
              className={`${styles.input} ${styles.textarea}`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the dish..."
              rows={2}
            />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Prep Time (min)</label>
              <input
                type="number"
                className={styles.input}
                value={prepMinutes}
                onChange={(e) => setPrepMinutes(e.target.value)}
                placeholder="15"
                min="0"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Cook Time (min)</label>
              <input
                type="number"
                className={styles.input}
                value={cookMinutes}
                onChange={(e) => setCookMinutes(e.target.value)}
                placeholder="30"
                min="0"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Servings</label>
              <input
                type="number"
                className={styles.input}
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                placeholder="4"
                min="1"
              />
            </div>
          </div>

          <div className={styles.field}>
            <div className={styles.ingredientsHeader}>
              <label className={styles.label}>Ingredients</label>
            </div>
            <div className={styles.ingredientsList}>
              {ingredients.map((ing, index) => (
                <div key={index} className={styles.ingredientRow}>
                  <input
                    type="text"
                    className={`${styles.input} ${styles.ingredientName}`}
                    value={ing.name}
                    onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                    placeholder="Ingredient name"
                  />
                  <input
                    type="number"
                    className={`${styles.input} ${styles.ingredientQuantity}`}
                    value={ing.quantity}
                    onChange={(e) => updateIngredient(index, 'quantity', e.target.value)}
                    placeholder="Qty"
                    step="0.25"
                    min="0"
                  />
                  <select
                    className={`${styles.select} ${styles.ingredientUnit}`}
                    value={ing.unit}
                    onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                  >
                    <option value="">Unit</option>
                    {UNITS.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                  {ingredients.length > 1 && (
                    <button
                      type="button"
                      className={styles.removeButton}
                      onClick={() => removeIngredient(index)}
                    >
                      &times;
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                className={styles.addIngredientButton}
                onClick={addIngredient}
              >
                + Add Ingredient
              </button>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Instructions</label>
            <textarea
              className={`${styles.input} ${styles.textarea}`}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Step-by-step instructions..."
              rows={4}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Tags</label>
            <div className={styles.tagsInput}>
              {tags.map((tag) => (
                <span key={tag} className={styles.tag}>
                  {tag}
                  <button
                    type="button"
                    className={styles.tagRemove}
                    onClick={() => removeTag(tag)}
                  >
                    &times;
                  </button>
                </span>
              ))}
              <input
                type="text"
                className={styles.tagInput}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder={tags.length === 0 ? "Type and press Enter..." : ""}
              />
            </div>
            <span className={styles.tagHint}>Press Enter to add a tag</span>
          </div>

          <div className={styles.field}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isFavorite}
                onChange={(e) => setIsFavorite(e.target.checked)}
              />
              <span className={styles.label} style={{ marginBottom: 0 }}>
                Add to favorites ⭐
              </span>
            </label>
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
            disabled={createRecipe.isPending}
          >
            {createRecipe.isPending ? 'Saving...' : 'Save Recipe'}
          </button>
        </div>
      </div>
    </div>
  )
}
