import { useState } from 'react'
import { useRecipes, useRecipe, useCreateRecipe, useUpdateRecipe, useDeleteRecipe, useToggleFavorite, useFavoriteItems, useCreateFavoriteItem, useDeleteFavoriteItem } from '@/hooks/use-recipes'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { SectionErrorBoundary } from '@/components/shared/error-boundary'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { Recipe, RecipeWithIngredients, CreateRecipeInput, RecipeUnit } from '@/types/database'
import { Heart, Clock, Users, Plus, X, ChefHat, UtensilsCrossed } from 'lucide-react'

const RECIPE_UNITS: RecipeUnit[] = ['tsp', 'tbsp', 'cup', 'oz', 'lb', 'g', 'kg', 'mL', 'L', 'count', 'pinch', 'other']

interface IngredientInput {
  name: string
  quantity: number | null
  unit: RecipeUnit | null
  notes: string | null
}

interface RecipeFormState {
  title: string
  description: string
  instructions: string
  servings: number | null
  prep_minutes: number | null
  cook_minutes: number | null
  tags: string
  ingredients: IngredientInput[]
}

const emptyFormState: RecipeFormState = {
  title: '',
  description: '',
  instructions: '',
  servings: null,
  prep_minutes: null,
  cook_minutes: null,
  tags: '',
  ingredients: [{ name: '', quantity: null, unit: null, notes: null }],
}

function RecipeFormModal({ isOpen, onClose, recipe, onSubmit, isLoading }: {
  isOpen: boolean
  onClose: () => void
  recipe?: RecipeWithIngredients | null
  onSubmit: (data: CreateRecipeInput) => Promise<void>
  isLoading: boolean
}) {
  const [form, setForm] = useState<RecipeFormState>(
    recipe
      ? {
          title: recipe.title,
          description: recipe.description || '',
          instructions: recipe.instructions || '',
          servings: recipe.servings,
          prep_minutes: recipe.prep_minutes,
          cook_minutes: recipe.cook_minutes,
          tags: recipe.tags.join(', '),
          ingredients: recipe.ingredients.map((ing: any) => ({
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
            notes: ing.notes,
          })),
        }
      : emptyFormState
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const input: CreateRecipeInput = {
      title: form.title,
      description: form.description || null,
      instructions: form.instructions || null,
      servings: form.servings,
      prep_minutes: form.prep_minutes,
      cook_minutes: form.cook_minutes,
      tags: form.tags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean),
      ingredients: form.ingredients.filter(ing => ing.name).map(ing => ({
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        notes: ing.notes,
      })),
    }

    await onSubmit(input)
    setForm(emptyFormState)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-content">
              {recipe ? 'Edit Recipe' : 'New Recipe'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-soft p-2 hover:bg-surface-hover"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Recipe Title</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g., Chocolate Chip Cookies"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional notes about this recipe"
              rows={2}
            />
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="servings">Servings</Label>
              <Input
                id="servings"
                type="number"
                value={form.servings || ''}
                onChange={(e) => setForm({ ...form, servings: e.target.value ? Number(e.target.value) : null })}
                placeholder="e.g., 4"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prep">Prep (min)</Label>
              <Input
                id="prep"
                type="number"
                value={form.prep_minutes || ''}
                onChange={(e) => setForm({ ...form, prep_minutes: e.target.value ? Number(e.target.value) : null })}
                placeholder="e.g., 10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cook">Cook (min)</Label>
              <Input
                id="cook"
                type="number"
                value={form.cook_minutes || ''}
                onChange={(e) => setForm({ ...form, cook_minutes: e.target.value ? Number(e.target.value) : null })}
                placeholder="e.g., 30"
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="e.g., dessert, easy, dairy-free"
            />
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <Label htmlFor="instructions">Instructions</Label>
            <Textarea
              id="instructions"
              value={form.instructions}
              onChange={(e) => setForm({ ...form, instructions: e.target.value })}
              placeholder="Step-by-step cooking instructions"
              rows={5}
            />
          </div>

          {/* Ingredients */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Ingredients</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setForm({
                  ...form,
                  ingredients: [...form.ingredients, { name: '', quantity: null, unit: null, notes: null }],
                })}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Ingredient
              </Button>
            </div>

            <div className="space-y-2">
              {form.ingredients.map((ing, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <Input
                    value={ing.name}
                    onChange={(e) => {
                      const newIng = [...form.ingredients]
                      newIng[idx].name = e.target.value
                      setForm({ ...form, ingredients: newIng })
                    }}
                    placeholder="Ingredient name"
                    className="flex-1"
                  />

                  <Input
                    type="number"
                    value={ing.quantity || ''}
                    onChange={(e) => {
                      const newIng = [...form.ingredients]
                      newIng[idx].quantity = e.target.value ? Number(e.target.value) : null
                      setForm({ ...form, ingredients: newIng })
                    }}
                    placeholder="Qty"
                    className="w-20"
                  />

                  <select
                    value={ing.unit || ''}
                    onChange={(e) => {
                      const newIng = [...form.ingredients]
                      newIng[idx].unit = (e.target.value as RecipeUnit) || null
                      setForm({ ...form, ingredients: newIng })
                    }}
                    className={cn(
                      'rounded-soft border border-input bg-surface px-3 py-2 text-sm',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'
                    )}
                  >
                    <option value="">Unit</option>
                    {RECIPE_UNITS.map(unit => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>

                  <Input
                    value={ing.notes || ''}
                    onChange={(e) => {
                      const newIng = [...form.ingredients]
                      newIng[idx].notes = e.target.value || null
                      setForm({ ...form, ingredients: newIng })
                    }}
                    placeholder="Notes"
                    className="flex-1"
                  />

                  <button
                    type="button"
                    onClick={() => setForm({
                      ...form,
                      ingredients: form.ingredients.filter((_, i) => i !== idx),
                    })}
                    className="rounded-soft p-2 hover:bg-surface-hover text-content-secondary hover:text-content"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !form.title}>
              {isLoading ? 'Saving...' : recipe ? 'Update Recipe' : 'Create Recipe'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

function RecipeCard({ recipe, onEdit, onDelete, onToggleFavorite }: {
  recipe: Recipe
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onToggleFavorite: (id: string) => void
}) {
  const totalTime = (recipe.prep_minutes || 0) + (recipe.cook_minutes || 0)

  return (
    <Card className="p-4 cursor-pointer hover:shadow-raised transition-shadow">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-content truncate">{recipe.title}</h3>
            {recipe.description && (
              <p className="text-sm text-content-secondary line-clamp-2 mt-1">
                {recipe.description}
              </p>
            )}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleFavorite(recipe.recipe_id)
            }}
            className="flex-shrink-0 p-2 hover:bg-surface-hover rounded-soft transition-colors"
          >
            <Heart
              className={cn(
                'h-5 w-5 transition-colors',
                recipe.is_favorite
                  ? 'fill-accent text-accent'
                  : 'text-content-muted hover:text-accent'
              )}
            />
          </button>
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap gap-2 text-sm text-content-secondary">
          {recipe.servings && (
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {recipe.servings} servings
            </div>
          )}

          {totalTime > 0 && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {totalTime} min
            </div>
          )}

          {recipe.ingredient_count && (
            <div className="flex items-center gap-1">
              <UtensilsCrossed className="h-4 w-4" />
              {recipe.ingredient_count} ingredients
            </div>
          )}
        </div>

        {/* Tags */}
        {recipe.tags && recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {recipe.tags.map((tag: any) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-surface-hover">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(recipe.recipe_id)
            }}
            className="flex-1"
          >
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(recipe.recipe_id)
            }}
            className="flex-1"
          >
            Delete
          </Button>
        </div>
      </div>
    </Card>
  )
}

function RecipeDetail({ recipeId, onClose }: {
  recipeId: string
  onClose: () => void
}) {
  const { data: recipe, isLoading } = useRecipe(recipeId)

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <div className="h-6 w-48 bg-surface-hover rounded-soft animate-pulse" />
        <div className="h-32 bg-surface-hover rounded-soft animate-pulse" />
      </div>
    )
  }

  if (!recipe) {
    return <p className="text-content-secondary p-4">Recipe not found</p>
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-start justify-between">
        <h2 className="text-xl font-semibold text-content">{recipe.title}</h2>
        <button
          onClick={onClose}
          className="rounded-soft p-2 hover:bg-surface-hover"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {recipe.description && (
        <p className="text-content-secondary">{recipe.description}</p>
      )}

      {/* Quick metadata */}
      {(recipe.servings || recipe.prep_minutes || recipe.cook_minutes) && (
        <div className="grid grid-cols-3 gap-4 text-center text-sm p-3 bg-surface-hover rounded-soft">
          {recipe.servings && (
            <div>
              <div className="font-semibold text-content">{recipe.servings}</div>
              <div className="text-content-secondary">servings</div>
            </div>
          )}
          {recipe.prep_minutes && (
            <div>
              <div className="font-semibold text-content">{recipe.prep_minutes}</div>
              <div className="text-content-secondary">prep min</div>
            </div>
          )}
          {recipe.cook_minutes && (
            <div>
              <div className="font-semibold text-content">{recipe.cook_minutes}</div>
              <div className="text-content-secondary">cook min</div>
            </div>
          )}
        </div>
      )}

      {/* Ingredients */}
      {recipe.ingredients && recipe.ingredients.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-content">Ingredients</h3>
          <ul className="space-y-1 text-content-secondary">
            {recipe.ingredients.map((ing, idx) => (
              <li key={idx} className="text-sm">
                <span className="font-medium">
                  {ing.quantity && `${ing.quantity} `}
                  {ing.unit && `${ing.unit} `}
                  {ing.name}
                </span>
                {ing.notes && <span className="text-content-muted"> - {ing.notes}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Instructions */}
      {recipe.instructions && (
        <div className="space-y-2">
          <h3 className="font-semibold text-content">Instructions</h3>
          <p className="text-sm text-content-secondary whitespace-pre-wrap">
            {recipe.instructions}
          </p>
        </div>
      )}

      {/* Tags */}
      {recipe.tags && recipe.tags.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-content text-sm">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {recipe.tags.map((tag: any) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function RecipesPage() {
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null)
  const [detailRecipeId, setDetailRecipeId] = useState<string | null>(null)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [addFavoriteOpen, setAddFavoriteOpen] = useState(false)
  const [newFavoriteName, setNewFavoriteName] = useState('')

  const { data: recipes, isLoading } = useRecipes(favoritesOnly)
  const { data: detailRecipe } = useRecipe(editingRecipeId || detailRecipeId)
  const { data: favorites } = useFavoriteItems()

  const createMutation = useCreateRecipe()
  const updateMutation = useUpdateRecipe()
  const deleteMutation = useDeleteRecipe()
  const toggleFavoriteMutation = useToggleFavorite()
  const createFavoriteItemMutation = useCreateFavoriteItem()
  const deleteFavoriteItemMutation = useDeleteFavoriteItem()

  const handleCreateRecipe = async (input: CreateRecipeInput) => {
    await createMutation.mutateAsync(input)
    setShowFormModal(false)
  }

  const handleEditRecipe = async (input: CreateRecipeInput) => {
    if (!editingRecipeId) return
    await updateMutation.mutateAsync({ recipeId: editingRecipeId, input })
    setEditingRecipeId(null)
    setShowFormModal(false)
  }

  const handleDeleteRecipe = async (recipeId: string) => {
    await deleteMutation.mutateAsync(recipeId)
    setDeleteConfirm(null)
  }

  const handleAddFavoriteItem = async () => {
    if (!newFavoriteName.trim()) return

    await createFavoriteItemMutation.mutateAsync({
      name: newFavoriteName.trim(),
    })
    setNewFavoriteName('')
    setAddFavoriteOpen(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recipes"
        action={
          <Button onClick={() => {
            setEditingRecipeId(null)
            setShowFormModal(true)
          }}>
            <Plus className="h-4 w-4 mr-2" />
            New Recipe
          </Button>
        }
      />

      <SectionErrorBoundary section="recipes">
        {/* Filters */}
        <div className="flex gap-2">
          <Button
            variant={favoritesOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFavoritesOnly(false)}
          >
            All
          </Button>
          <Button
            variant={favoritesOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFavoritesOnly(true)}
          >
            <Heart className="h-4 w-4 mr-2" />
            Favorites
          </Button>
        </div>

        {/* Loading state */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="p-4 space-y-3">
                <div className="h-6 w-32 bg-surface-hover rounded-soft animate-pulse" />
                <div className="h-4 w-full bg-surface-hover rounded-soft animate-pulse" />
                <div className="h-10 w-full bg-surface-hover rounded-soft animate-pulse" />
              </Card>
            ))}
          </div>
        ) : !recipes || recipes.length === 0 ? (
          <EmptyState
            message={favoritesOnly ? 'No favorite recipes yet.' : 'No recipes yet. Create your first one!'}
            icon={<ChefHat className="h-10 w-10" />}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {recipes.map((recipe) => (
              <div
                key={recipe.recipe_id}
                onClick={() => setDetailRecipeId(recipe.recipe_id)}
              >
                <RecipeCard
                  recipe={recipe}
                  onEdit={(id) => {
                    setEditingRecipeId(id)
                    setShowFormModal(true)
                  }}
                  onDelete={(id) => setDeleteConfirm(id)}
                  onToggleFavorite={(id) => toggleFavoriteMutation.mutate(id)}
                />
              </div>
            ))}
          </div>
        )}

        {/* Favorite Items Section */}
        {favorites && favorites.length > 0 && !favoritesOnly && (
          <div className="mt-8 pt-6 border-t border-surface-hover space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-content">Favorite Items (Staples)</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddFavoriteOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>

            <div className="grid gap-2 md:grid-cols-3">
              {favorites.map((item) => (
                <div
                  key={item.favorite_item_id}
                  className="flex items-center justify-between gap-3 p-3 bg-surface-hover rounded-soft"
                >
                  <div>
                    <p className="text-sm font-medium text-content">{item.name}</p>
                    {item.default_quantity && (
                      <p className="text-xs text-content-secondary">
                        {item.default_quantity} {item.default_unit || 'count'}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => deleteFavoriteItemMutation.mutate(item.favorite_item_id)}
                    className="p-1 hover:text-danger transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </SectionErrorBoundary>

      {/* Recipe Form Modal */}
      <RecipeFormModal
        isOpen={showFormModal}
        onClose={() => {
          setShowFormModal(false)
          setEditingRecipeId(null)
        }}
        recipe={editingRecipeId ? detailRecipe : undefined}
        onSubmit={editingRecipeId ? handleEditRecipe : handleCreateRecipe}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Recipe Detail Slide-over */}
      {detailRecipeId && !editingRecipeId && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDetailRecipeId(null)} />
          <div className="relative z-50 w-full sm:max-w-md h-[80vh] sm:h-auto sm:rounded-soft bg-surface shadow-raised overflow-y-auto">
            <RecipeDetail
              recipeId={detailRecipeId}
              onClose={() => setDetailRecipeId(null)}
            />
          </div>
        </div>
      )}

      {/* Add Favorite Item Modal */}
      {addFavoriteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md">
            <div className="p-6 space-y-4">
              <h2 className="text-lg font-semibold text-content">Add Favorite Item</h2>

              <div className="space-y-2">
                <Label htmlFor="favorite-name">Item Name</Label>
                <Input
                  id="favorite-name"
                  value={newFavoriteName}
                  onChange={(e) => setNewFavoriteName(e.target.value)}
                  placeholder="e.g., Olive oil, Eggs"
                  autoFocus
                />
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setAddFavoriteOpen(false)
                    setNewFavoriteName('')
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddFavoriteItem}
                  disabled={!newFavoriteName.trim() || createFavoriteItemMutation.isPending}
                >
                  Add
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Delete Recipe?"
        description="This action cannot be undone. The recipe and all its ingredients will be permanently deleted."
        confirmLabel="Delete"
        onConfirm={() => deleteConfirm && handleDeleteRecipe(deleteConfirm)}
        variant="danger"
      />
    </div>
  )
}
