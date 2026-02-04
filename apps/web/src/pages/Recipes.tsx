import { useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import {
  useRecipes,
  useRecipe,
  useDeleteRecipe,
  useToggleRecipeFavorite,
  useFavoriteItems,
  useDeleteFavoriteItem,
} from '@/hooks/useRecipes'
import { AddRecipeModal, AddFavoriteItemModal } from '@/components/recipes'
import type { Recipe } from '@/types/database'
import styles from './Recipes.module.css'

type TabType = 'recipes' | 'favorites'

function formatTime(minutes: number | null): string {
  if (!minutes) return ''
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

function RecipeCard({
  recipe,
  onSelect,
  onDelete,
  onToggleFavorite,
}: {
  recipe: Recipe
  onSelect: () => void
  onDelete: () => void
  onToggleFavorite: () => void
}) {
  const totalTime =
    (recipe.prep_minutes || 0) + (recipe.cook_minutes || 0)

  return (
    <div className={styles.recipeCard} onClick={onSelect}>
      <div className={styles.recipeHeader}>
        <h3 className={styles.recipeTitle}>
          {recipe.title}
          {recipe.is_favorite && <span className={styles.recipeFavorite}>⭐</span>}
        </h3>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            className={styles.favoriteButton}
            onClick={(e) => {
              e.stopPropagation()
              onToggleFavorite()
            }}
            title={recipe.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            {recipe.is_favorite ? '⭐' : '☆'}
          </button>
          <button
            className={styles.deleteButton}
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            title="Delete"
          >
            &times;
          </button>
        </div>
      </div>
      {recipe.description && (
        <p className={styles.recipeDescription}>{recipe.description}</p>
      )}
      <div className={styles.recipeMeta}>
        {totalTime > 0 && (
          <span className={`${styles.badge} ${styles.timeBadge}`}>
            {formatTime(totalTime)}
          </span>
        )}
        {recipe.servings && (
          <span className={`${styles.badge} ${styles.servingsBadge}`}>
            {recipe.servings} serving{recipe.servings !== 1 ? 's' : ''}
          </span>
        )}
        {recipe.ingredient_count && recipe.ingredient_count > 0 && (
          <span className={styles.badge}>
            {recipe.ingredient_count} ingredient{recipe.ingredient_count !== 1 ? 's' : ''}
          </span>
        )}
        {recipe.tags?.slice(0, 3).map((tag) => (
          <span key={tag} className={`${styles.badge} ${styles.tagBadge}`}>
            {tag}
          </span>
        ))}
      </div>
    </div>
  )
}

function RecipeDetail({
  recipeId,
  onBack,
}: {
  recipeId: string
  onBack: () => void
}) {
  const { data: recipe, isLoading, error } = useRecipe(recipeId)
  const toggleFavorite = useToggleRecipeFavorite()
  const deleteRecipe = useDeleteRecipe()

  const handleDelete = async () => {
    if (!confirm('Delete this recipe?')) return
    try {
      await deleteRecipe.mutateAsync(recipeId)
      onBack()
    } catch (err) {
      console.error('Failed to delete recipe:', err)
    }
  }

  if (isLoading) {
    return <div className={styles.loading}>Loading recipe...</div>
  }

  if (error || !recipe) {
    return <div className={styles.error}>Recipe not found</div>
  }

  const totalTime = (recipe.prep_minutes || 0) + (recipe.cook_minutes || 0)

  return (
    <div>
      <button className={styles.backButton} onClick={onBack}>
        ← Back to recipes
      </button>

      <div className={styles.recipeDetail}>
        <div className={styles.recipeDetailHeader}>
          <h2 className={styles.recipeDetailTitle}>
            {recipe.title}
            {recipe.is_favorite && ' ⭐'}
          </h2>
          <div className={styles.recipeDetailActions}>
            <button
              className={styles.favoriteButton}
              onClick={() => toggleFavorite.mutate(recipeId)}
              title={recipe.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              {recipe.is_favorite ? '⭐' : '☆'}
            </button>
            <button
              className={styles.deleteButton}
              onClick={handleDelete}
              title="Delete"
            >
              &times;
            </button>
          </div>
        </div>

        {recipe.description && (
          <p className={styles.recipeDescription}>{recipe.description}</p>
        )}

        <div className={styles.recipeDetailMeta}>
          {recipe.prep_minutes && (
            <div className={styles.metaItem}>
              <span className={styles.metaIcon}>🔪</span>
              <span>Prep: {formatTime(recipe.prep_minutes)}</span>
            </div>
          )}
          {recipe.cook_minutes && (
            <div className={styles.metaItem}>
              <span className={styles.metaIcon}>🍳</span>
              <span>Cook: {formatTime(recipe.cook_minutes)}</span>
            </div>
          )}
          {totalTime > 0 && (
            <div className={styles.metaItem}>
              <span className={styles.metaIcon}>⏱️</span>
              <span>Total: {formatTime(totalTime)}</span>
            </div>
          )}
          {recipe.servings && (
            <div className={styles.metaItem}>
              <span className={styles.metaIcon}>🍽️</span>
              <span>{recipe.servings} serving{recipe.servings !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {recipe.ingredients && recipe.ingredients.length > 0 && (
          <div className={styles.ingredientsSection}>
            <h3 className={styles.ingredientsTitle}>Ingredients</h3>
            <ul className={styles.ingredientsList}>
              {recipe.ingredients.map((ing) => (
                <li key={ing.recipe_ingredient_id} className={styles.ingredientItem}>
                  <span className={styles.ingredientQuantity}>
                    {ing.quantity ? `${ing.quantity} ${ing.unit || ''}`.trim() : '•'}
                  </span>
                  <span className={styles.ingredientName}>{ing.name}</span>
                  {ing.notes && (
                    <span className={styles.ingredientNotes}>({ing.notes})</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {recipe.instructions && (
          <div className={styles.instructionsSection}>
            <h3 className={styles.instructionsTitle}>Instructions</h3>
            <div className={styles.instructionsText}>{recipe.instructions}</div>
          </div>
        )}

        {recipe.tags && recipe.tags.length > 0 && (
          <div className={styles.tagsSection}>
            {recipe.tags.map((tag) => (
              <span key={tag} className={`${styles.badge} ${styles.tagBadge}`}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function Recipes() {
  const [activeTab, setActiveTab] = useState<TabType>('recipes')
  const [showAddRecipe, setShowAddRecipe] = useState(false)
  const [showAddFavorite, setShowAddFavorite] = useState(false)
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null)

  const { data: recipes = [], isLoading: loadingRecipes, error: recipesError } = useRecipes()
  const { data: favorites = [], isLoading: loadingFavorites, error: favoritesError } = useFavoriteItems()

  const deleteRecipe = useDeleteRecipe()
  const toggleFavorite = useToggleRecipeFavorite()
  const deleteFavorite = useDeleteFavoriteItem()

  const handleDeleteRecipe = async (recipeId: string) => {
    if (!confirm('Delete this recipe?')) return
    try {
      await deleteRecipe.mutateAsync(recipeId)
    } catch (err) {
      console.error('Failed to delete recipe:', err)
    }
  }

  const handleDeleteFavorite = async (favoriteItemId: string) => {
    if (!confirm('Delete this staple item?')) return
    try {
      await deleteFavorite.mutateAsync(favoriteItemId)
    } catch (err) {
      console.error('Failed to delete favorite:', err)
    }
  }

  // If viewing a recipe detail
  if (selectedRecipeId) {
    return (
      <AppLayout>
        <div className={styles.container}>
          <RecipeDetail
            recipeId={selectedRecipeId}
            onBack={() => setSelectedRecipeId(null)}
          />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Recipes</h1>
        </header>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'recipes' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('recipes')}
          >
            Recipes
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'favorites' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('favorites')}
          >
            Staples
          </button>
        </div>

        {activeTab === 'recipes' && (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>My Recipes</h2>
              <button
                className={styles.addButton}
                onClick={() => setShowAddRecipe(true)}
              >
                + Add Recipe
              </button>
            </div>

            {recipesError && (
              <div className={styles.error}>
                Failed to load recipes. Please try again.
              </div>
            )}

            {loadingRecipes ? (
              <div className={styles.loading}>Loading recipes...</div>
            ) : recipes.length === 0 ? (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>📖</div>
                <p className={styles.emptyText}>No recipes yet</p>
                <button
                  className={styles.emptyAddButton}
                  onClick={() => setShowAddRecipe(true)}
                >
                  Add your first recipe
                </button>
              </div>
            ) : (
              <div className={styles.list}>
                {recipes.map((recipe) => (
                  <RecipeCard
                    key={recipe.recipe_id}
                    recipe={recipe}
                    onSelect={() => setSelectedRecipeId(recipe.recipe_id)}
                    onDelete={() => handleDeleteRecipe(recipe.recipe_id)}
                    onToggleFavorite={() => toggleFavorite.mutate(recipe.recipe_id)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'favorites' && (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Staple Items</h2>
              <button
                className={styles.addButton}
                onClick={() => setShowAddFavorite(true)}
              >
                + Add Staple
              </button>
            </div>

            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
              Staple items are things you regularly need. They can be automatically added to shopping lists.
            </p>

            {favoritesError && (
              <div className={styles.error}>
                Failed to load staple items. Please try again.
              </div>
            )}

            {loadingFavorites ? (
              <div className={styles.loading}>Loading staple items...</div>
            ) : favorites.length === 0 ? (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>🥛</div>
                <p className={styles.emptyText}>No staple items yet</p>
                <button
                  className={styles.emptyAddButton}
                  onClick={() => setShowAddFavorite(true)}
                >
                  Add your first staple
                </button>
              </div>
            ) : (
              <div className={styles.list}>
                {favorites.map((item) => (
                  <div key={item.favorite_item_id} className={styles.favoriteCard}>
                    <div>
                      <h3 className={styles.favoriteName}>{item.name}</h3>
                      {(item.default_quantity || item.category_hint) && (
                        <p className={styles.favoriteDetail}>
                          {item.default_quantity && item.default_unit
                            ? `${item.default_quantity} ${item.default_unit}`
                            : item.default_quantity}
                          {item.category_hint && ` • ${item.category_hint}`}
                        </p>
                      )}
                    </div>
                    <button
                      className={styles.deleteButton}
                      onClick={() => handleDeleteFavorite(item.favorite_item_id)}
                      title="Delete"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <AddRecipeModal
          isOpen={showAddRecipe}
          onClose={() => setShowAddRecipe(false)}
        />

        <AddFavoriteItemModal
          isOpen={showAddFavorite}
          onClose={() => setShowAddFavorite(false)}
        />
      </div>
    </AppLayout>
  )
}
