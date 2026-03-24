import { useState } from 'react'
import {
  useShoppingLists,
  useShoppingList,
  useCreateShoppingList,
  useUpdateItemStatus,
  useAddShoppingItem,
  useUpdateShoppingItem,
  useDeleteShoppingItem,
  useDeleteShoppingList,
  useUpdateShoppingListStatus,
} from '@/hooks/use-shopping'
import { useRecipes } from '@/hooks/use-recipes'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { SectionErrorBoundary } from '@/components/shared/error-boundary'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type {
  ShoppingList,
  ShoppingListItemStatus,
  CreateShoppingListInput,
} from '@/types/database'
import { Plus, X, Trash2, ChevronDown, ChevronUp, Check, ShoppingCart, Pencil } from 'lucide-react'

interface NewShoppingListForm {
  title: string
  selectedRecipeIds: string[]
  includeFavorites: boolean
  customItems: Array<{
    name: string
    quantity: number | null
    unit: string
    category_hint: string
    notes: string
  }>
}

const emptyListForm: NewShoppingListForm = {
  title: '',
  selectedRecipeIds: [],
  includeFavorites: false,
  customItems: [{ name: '', quantity: null, unit: '', category_hint: '', notes: '' }],
}

function NewShoppingListModal({ isOpen, onClose, recipes, onSubmit, isLoading }: {
  isOpen: boolean
  onClose: () => void
  recipes: any[] | undefined
  onSubmit: (input: CreateShoppingListInput) => Promise<void>
  isLoading: boolean
}) {
  const [form, setForm] = useState<NewShoppingListForm>(emptyListForm)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const input: CreateShoppingListInput = {
      title: form.title,
      recipe_ids: form.selectedRecipeIds,
      include_favorites: form.includeFavorites,
      items: form.customItems.filter(item => item.name).map(item => ({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit || undefined,
        category_hint: item.category_hint || undefined,
        notes: item.notes || undefined,
      })),
    }

    await onSubmit(input)
    setForm(emptyListForm)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-content">New Shopping List</h2>
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
            <Label htmlFor="title">List Title</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g., Weekly Groceries"
              required
            />
          </div>

          {/* Select Recipes */}
          {recipes && recipes.length > 0 && (
            <div className="space-y-2">
              <Label>Recipes (optional)</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {recipes.map((recipe) => (
                  <label key={recipe.recipe_id} className="flex items-center gap-3 p-2 hover:bg-surface-hover rounded-soft cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.selectedRecipeIds.includes(recipe.recipe_id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setForm({
                            ...form,
                            selectedRecipeIds: [...form.selectedRecipeIds, recipe.recipe_id],
                          })
                        } else {
                          setForm({
                            ...form,
                            selectedRecipeIds: form.selectedRecipeIds.filter(id => id !== recipe.recipe_id),
                          })
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm text-content">{recipe.title}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Include Favorites */}
          <label className="flex items-center gap-3 p-3 bg-surface-hover rounded-soft cursor-pointer">
            <input
              type="checkbox"
              checked={form.includeFavorites}
              onChange={(e) => setForm({ ...form, includeFavorites: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm text-content">Include favorite staple items</span>
          </label>

          {/* Custom Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Additional Items</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setForm({
                  ...form,
                  customItems: [...form.customItems, { name: '', quantity: null, unit: '', category_hint: '', notes: '' }],
                })}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

            <div className="space-y-2">
              {form.customItems.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <Input
                    value={item.name}
                    onChange={(e) => {
                      const newItems = [...form.customItems]
                      newItems[idx].name = e.target.value
                      setForm({ ...form, customItems: newItems })
                    }}
                    placeholder="Item name"
                    className="flex-1"
                  />

                  <Input
                    type="number"
                    value={item.quantity || ''}
                    onChange={(e) => {
                      const newItems = [...form.customItems]
                      newItems[idx].quantity = e.target.value ? Number(e.target.value) : null
                      setForm({ ...form, customItems: newItems })
                    }}
                    placeholder="Qty"
                    className="w-20"
                  />

                  <Input
                    value={item.unit}
                    onChange={(e) => {
                      const newItems = [...form.customItems]
                      newItems[idx].unit = e.target.value
                      setForm({ ...form, customItems: newItems })
                    }}
                    placeholder="Unit"
                    className="w-24"
                  />

                  <button
                    type="button"
                    onClick={() => setForm({
                      ...form,
                      customItems: form.customItems.filter((_, i) => i !== idx),
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
              {isLoading ? 'Creating...' : 'Create List'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

function ShoppingListCard({ list, onOpen }: {
  list: ShoppingList
  onOpen: (id: string) => void
}) {
  const statusColor = {
    active: 'bg-accent/10 text-accent',
    completed: 'bg-success/10 text-success-dark',
    archived: 'bg-content-muted/10 text-content-secondary',
  }

  return (
    <Card
      className="p-4 cursor-pointer hover:shadow-raised transition-shadow"
      onClick={() => onOpen(list.shopping_list_id)}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-content">{list.title}</h3>
          <Badge className={statusColor[list.status as keyof typeof statusColor]}>
            {list.status === 'active' ? 'In Progress' : list.status === 'completed' ? 'Done' : 'Archived'}
          </Badge>
        </div>

        <div className="text-sm text-content-secondary">
          {list.item_count} items
          {list.items_remaining ? ` • ${list.items_remaining} remaining` : ''}
        </div>
      </div>
    </Card>
  )
}

interface EditItemState {
  itemId: string
  quantity: number | null
  unit: string | null
  notes: string | null
}

function ShoppingListDetail({ listId, onClose, onDelete }: {
  listId: string
  onClose: () => void
  onDelete: (id: string) => void
}) {
  const { data: list, isLoading } = useShoppingList(listId)
  const [storeMode, setStoreMode] = useState(false)
  const [expandedGot, setExpandedGot] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [editingItem, setEditingItem] = useState<EditItemState | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const updateItemStatus = useUpdateItemStatus()
  const addItem = useAddShoppingItem()
  const updateItem = useUpdateShoppingItem()
  const deleteItem = useDeleteShoppingItem()
  const updateListStatus = useUpdateShoppingListStatus()
  const deleteList = useDeleteShoppingList()

  const handleAddItem = async () => {
    if (!newItemName.trim() || !list) return

    await addItem.mutateAsync({
      shopping_list_id: listId,
      name: newItemName.trim(),
    })
    setNewItemName('')
  }

  const handleUpdateItem = async () => {
    if (!editingItem || !list) return

    await updateItem.mutateAsync({
      itemId: editingItem.itemId,
      _listId: listId,
      updates: {
        quantity: editingItem.quantity ?? undefined,
        unit: editingItem.unit ?? undefined,
        notes: editingItem.notes ?? undefined,
      },
    })
    setEditingItem(null)
  }

  const handleStatusChange = async (itemId: string, status: ShoppingListItemStatus) => {
    await updateItemStatus.mutateAsync({ itemId, status })
  }

  const handleCompleteList = async () => {
    await updateListStatus.mutateAsync({ listId, status: 'completed' })
    onClose()
  }

  const handleDeleteItem = async (itemId: string) => {
    await deleteItem.mutateAsync({ itemId, listId: listId })
    setDeleteConfirm(null)
  }

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <div className="h-6 w-48 bg-surface-hover rounded-soft animate-pulse" />
        <div className="h-32 bg-surface-hover rounded-soft animate-pulse" />
      </div>
    )
  }

  if (!list) {
    return <p className="text-content-secondary p-4">List not found</p>
  }

  // Group items by status
  const itemsByStatus = {
    need_to_check_home: list.items.filter(i => i.status === 'need_to_check_home'),
    need_to_buy: list.items.filter(i => i.status === 'need_to_buy'),
    got: list.items.filter(i => i.status === 'already_have' || i.status === 'purchased'),
  }

  const isListComplete = itemsByStatus.need_to_check_home.length === 0 &&
    itemsByStatus.need_to_buy.length === 0

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-surface-hover p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-content">{list.title}</h2>
            <p className="text-sm text-content-secondary mt-1">
              {list.items.length} items
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-soft p-2 hover:bg-surface-hover"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode toggle */}
        {itemsByStatus.need_to_buy.length > 0 && (
          <Button
            variant={storeMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStoreMode(!storeMode)}
            className="w-full"
          >
            {storeMode ? 'Done with store' : 'Switch to store mode'}
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Store Mode - Simplified View */}
        {storeMode ? (
          <div className="space-y-4">
            {itemsByStatus.need_to_buy.map((item) => (
              <div
                key={item.shopping_list_item_id}
                className="flex items-center justify-between gap-4 p-4 bg-surface-hover rounded-soft"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-content">{item.name}</p>
                  {item.quantity && (
                    <p className="text-sm text-content-secondary">
                      {item.quantity} {item.unit || 'count'}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleStatusChange(item.shopping_list_item_id, 'purchased')}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange(item.shopping_list_item_id, 'skipped')}
                  >
                    Skip
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Phase 1: At Home */}
            {itemsByStatus.need_to_check_home.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-content text-sm uppercase tracking-wider">
                  Check at Home ({itemsByStatus.need_to_check_home.length})
                </h3>

                <div className="space-y-2">
                  {itemsByStatus.need_to_check_home.map((item) => (
                    <div
                      key={item.shopping_list_item_id}
                      className="flex items-center justify-between gap-3 p-3 bg-surface-hover rounded-soft group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-content">{item.name}</p>
                        {item.quantity && (
                          <p className="text-xs text-content-secondary">
                            {item.quantity} {item.unit || 'count'}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange(item.shopping_list_item_id, 'already_have')}
                          title="Already have at home"
                        >
                          Have
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleStatusChange(item.shopping_list_item_id, 'need_to_buy')}
                        >
                          Need
                        </Button>
                      </div>

                      <button
                        onClick={() => setDeleteConfirm(item.shopping_list_item_id)}
                        className="p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:text-danger"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Phase 2: At Store */}
            {itemsByStatus.need_to_buy.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-content text-sm uppercase tracking-wider">
                  Shop at Store ({itemsByStatus.need_to_buy.length})
                </h3>

                <div className="space-y-2">
                  {itemsByStatus.need_to_buy.map((item) => (
                    <div
                      key={item.shopping_list_item_id}
                      className="flex items-center justify-between gap-3 p-3 bg-accent/5 border border-accent/20 rounded-soft group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-content">{item.name}</p>
                        {item.quantity && (
                          <p className="text-xs text-content-secondary">
                            {item.quantity} {item.unit || 'count'}
                          </p>
                        )}
                        {item.notes && (
                          <p className="text-xs text-content-muted mt-1">{item.notes}</p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleStatusChange(item.shopping_list_item_id, 'purchased')}
                          className="font-semibold"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Got it
                        </Button>

                        <button
                          onClick={() => {
                            setEditingItem({
                              itemId: item.shopping_list_item_id,
                              quantity: item.quantity,
                              unit: item.unit,
                              notes: item.notes,
                            })
                          }}
                          className="p-1 hover:bg-surface transition-colors rounded"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => setDeleteConfirm(item.shopping_list_item_id)}
                          className="p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:text-danger"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Got Section */}
            {itemsByStatus.got.length > 0 && (
              <div className="space-y-3 mt-6 pt-4 border-t border-surface-hover">
                <button
                  onClick={() => setExpandedGot(!expandedGot)}
                  className="flex items-center justify-between w-full"
                >
                  <h3 className="font-semibold text-content text-sm uppercase tracking-wider">
                    Got ({itemsByStatus.got.length})
                  </h3>
                  {expandedGot ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {expandedGot && (
                  <div className="space-y-1">
                    {itemsByStatus.got.map((item) => (
                      <div
                        key={item.shopping_list_item_id}
                        className="flex items-center justify-between gap-2 p-2 text-sm text-content-secondary line-through"
                      >
                        <span>{item.name}</span>
                        {item.quantity && (
                          <span className="text-xs">
                            {item.quantity} {item.unit || 'count'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Empty state for completed list */}
            {isListComplete && itemsByStatus.got.length === 0 && (
              <EmptyState
                message="No items to shop for. Great job!"
                icon={<Check className="h-10 w-10 text-success-dark" />}
              />
            )}
          </>
        )}
      </div>

      {/* Footer - Add item + Actions */}
      <div className="border-t border-surface-hover p-4 space-y-3">
        {/* Add item input */}
        <div className="flex gap-2">
          <Input
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleAddItem()
              }
            }}
            placeholder="Add item..."
            className="flex-1"
          />
          <Button
            size="sm"
            onClick={handleAddItem}
            disabled={!newItemName.trim() || addItem.isPending}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* List actions */}
        <div className="flex gap-2">
          {isListComplete && list.status === 'active' && (
            <Button
              onClick={handleCompleteList}
              className="flex-1"
              disabled={updateListStatus.isPending}
            >
              Mark as Complete
            </Button>
          )}

          <Button
            variant="outline"
            onClick={() => onDelete(listId)}
            className="flex-1"
            disabled={deleteList.isPending}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-sm">
            <div className="p-6 space-y-4">
              <h3 className="font-semibold text-content">Edit Item</h3>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="qty">Quantity</Label>
                  <Input
                    id="qty"
                    type="number"
                    value={editingItem.quantity || ''}
                    onChange={(e) => setEditingItem({
                      ...editingItem,
                      quantity: e.target.value ? Number(e.target.value) : null,
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Input
                    id="unit"
                    value={editingItem.unit || ''}
                    onChange={(e) => setEditingItem({
                      ...editingItem,
                      unit: e.target.value || null,
                    })}
                    placeholder="e.g., oz, count, g"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    value={editingItem.notes || ''}
                    onChange={(e) => setEditingItem({
                      ...editingItem,
                      notes: e.target.value || null,
                    })}
                    placeholder="e.g., Organic, name brand"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setEditingItem(null)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateItem}
                  disabled={updateItem.isPending}
                >
                  Save
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Delete Item Confirmation */}
      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Remove Item?"
        description="This item will be removed from the shopping list."
        confirmLabel="Remove"
        onConfirm={() => deleteConfirm && handleDeleteItem(deleteConfirm)}
        variant="danger"
      />
    </div>
  )
}

export default function ShoppingPage() {
  const [showNewList, setShowNewList] = useState(false)
  const [selectedListId, setSelectedListId] = useState<string | null>(null)
  const [deleteListConfirm, setDeleteListConfirm] = useState<string | null>(null)

  const { data: lists, isLoading } = useShoppingLists('active')
  const { data: recipes } = useRecipes()

  const createList = useCreateShoppingList()
  const deleteList = useDeleteShoppingList()

  const handleCreateList = async (input: CreateShoppingListInput) => {
    const newListId = await createList.mutateAsync(input)
    setShowNewList(false)
    setSelectedListId(newListId)
  }

  const handleDeleteList = async (listId: string) => {
    await deleteList.mutateAsync(listId)
    setDeleteListConfirm(null)
    if (selectedListId === listId) {
      setSelectedListId(null)
    }
  }

  return (
    <div className="flex h-full">
      {/* Lists sidebar */}
      <div className="w-full lg:w-96 border-r border-surface-hover flex flex-col">
        {/* Header */}
        <div className="border-b border-surface-hover p-4 space-y-3">
          <PageHeader
            title="Shopping"
            action={
              <Button onClick={() => setShowNewList(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New
              </Button>
            }
          />
        </div>

        {/* Lists */}
        <div className="flex-1 overflow-y-auto p-4">
          <SectionErrorBoundary section="shopping-lists">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="p-3 space-y-2">
                    <div className="h-5 w-32 bg-surface-hover rounded animate-pulse" />
                    <div className="h-4 w-24 bg-surface-hover rounded animate-pulse" />
                  </Card>
                ))}
              </div>
            ) : !lists || lists.length === 0 ? (
              <EmptyState
                message="No shopping lists yet."
                icon={<ShoppingCart className="h-10 w-10" />}
              />
            ) : (
              <div className="space-y-2">
                {lists.map((list) => (
                  <div
                    key={list.shopping_list_id}
                    onClick={() => setSelectedListId(list.shopping_list_id)}
                    className={cn(
                      'cursor-pointer rounded-soft p-3 border-2 transition-colors',
                      selectedListId === list.shopping_list_id
                        ? 'border-accent bg-accent/5'
                        : 'border-transparent hover:bg-surface-hover'
                    )}
                  >
                    <ShoppingListCard
                      list={list}
                      onOpen={() => setSelectedListId(list.shopping_list_id)}
                    />
                  </div>
                ))}
              </div>
            )}
          </SectionErrorBoundary>
        </div>
      </div>

      {/* Detail pane */}
      <div className="hidden lg:flex flex-1 flex-col">
        {selectedListId ? (
          <ShoppingListDetail
            listId={selectedListId}
            onClose={() => setSelectedListId(null)}
            onDelete={(id) => {
              setDeleteListConfirm(id)
            }}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-content-secondary">Select a list to view details</p>
          </div>
        )}
      </div>

      {/* Mobile detail modal */}
      {selectedListId && (
        <div className="lg:hidden fixed inset-0 z-40 flex items-end sm:items-center justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedListId(null)} />
          <div className="relative z-50 w-full sm:max-w-md h-[80vh] sm:h-auto sm:rounded-soft bg-surface shadow-raised overflow-hidden flex flex-col">
            <ShoppingListDetail
              listId={selectedListId}
              onClose={() => setSelectedListId(null)}
              onDelete={(id) => setDeleteListConfirm(id)}
            />
          </div>
        </div>
      )}

      {/* New List Modal */}
      <NewShoppingListModal
        isOpen={showNewList}
        onClose={() => setShowNewList(false)}
        recipes={recipes}
        onSubmit={handleCreateList}
        isLoading={createList.isPending}
      />

      {/* Delete List Confirmation */}
      <ConfirmDialog
        open={!!deleteListConfirm}
        onOpenChange={(open) => !open && setDeleteListConfirm(null)}
        title="Delete Shopping List?"
        description="This action cannot be undone. The entire shopping list and all its items will be permanently deleted."
        confirmLabel="Delete"
        onConfirm={() => deleteListConfirm && handleDeleteList(deleteListConfirm)}
        variant="danger"
      />
    </div>
  )
}
