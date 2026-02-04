import { useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import {
  useShoppingLists,
  useShoppingList,
  useDeleteShoppingList,
  useUpdateShoppingListStatus,
  useUpdateShoppingItemStatus,
  useAddShoppingItem,
  useDeleteShoppingItem,
} from '@/hooks/useShopping'
import { CreateShoppingListModal } from '@/components/shopping'
import type { ShoppingList, ShoppingListItem, ShoppingListItemStatus } from '@/types/database'
import styles from './Shopping.module.css'

type ViewMode = 'home' | 'store'

function formatDate(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function ShoppingListCard({
  list,
  onSelect,
  onDelete,
}: {
  list: ShoppingList
  onSelect: () => void
  onDelete: () => void
}) {
  return (
    <div className={styles.listCard} onClick={onSelect}>
      <div className={styles.listCardHeader}>
        <h3 className={styles.listCardTitle}>{list.title}</h3>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span className={`${styles.listCardStatus} ${styles[list.status]}`}>
            {list.status}
          </span>
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
      <div className={styles.listCardMeta}>
        <span>{list.item_count || 0} items</span>
        {(list.items_remaining ?? 0) > 0 && (
          <span>{list.items_remaining} to buy</span>
        )}
        <span>Created {formatDate(list.created_at)}</span>
      </div>
    </div>
  )
}

function ShoppingItem({
  item,
  mode,
  onStatusChange,
  onDelete,
}: {
  item: ShoppingListItem
  mode: ViewMode
  onStatusChange: (status: ShoppingListItemStatus) => void
  onDelete: () => void
}) {
  const handleClick = () => {
    if (mode === 'home') {
      // Home mode: toggle between need_to_buy and already_have
      if (item.status === 'need_to_buy') {
        onStatusChange('already_have')
      } else if (item.status === 'already_have') {
        onStatusChange('need_to_buy')
      }
    } else {
      // Store mode: toggle between need_to_buy and purchased
      if (item.status === 'need_to_buy') {
        onStatusChange('purchased')
      } else if (item.status === 'purchased') {
        onStatusChange('need_to_buy')
      }
    }
  }

  const isChecked = item.status === 'already_have' || item.status === 'purchased'
  const isDone = item.status === 'purchased' || item.status === 'already_have'

  return (
    <div className={`${styles.item} ${mode === 'store' ? styles.storeModeItem : ''}`}>
      <button
        className={`${styles.itemCheckbox} ${isChecked ? styles.checked : ''}`}
        onClick={handleClick}
      >
        {isChecked && '✓'}
      </button>
      <div className={styles.itemContent}>
        <div className={`${styles.itemName} ${isDone ? styles.done : ''}`}>
          {item.name}
        </div>
        {(item.quantity || item.notes) && (
          <div className={styles.itemMeta}>
            {item.quantity && `${item.quantity} ${item.unit || ''}`.trim()}
            {item.quantity && item.notes && ' • '}
            {item.notes}
          </div>
        )}
      </div>
      <div className={styles.itemActions}>
        <button
          className={styles.itemDeleteButton}
          onClick={onDelete}
          title="Remove"
        >
          &times;
        </button>
      </div>
    </div>
  )
}

function ShoppingListDetail({
  listId,
  onBack,
}: {
  listId: string
  onBack: () => void
}) {
  const [mode, setMode] = useState<ViewMode>('home')
  const [newItemName, setNewItemName] = useState('')

  const { data: list, isLoading, error } = useShoppingList(listId)
  const updateStatus = useUpdateShoppingItemStatus()
  const addItem = useAddShoppingItem()
  const deleteItem = useDeleteShoppingItem()
  const updateListStatus = useUpdateShoppingListStatus()
  const deleteList = useDeleteShoppingList()

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItemName.trim()) return

    try {
      await addItem.mutateAsync({
        shopping_list_id: listId,
        name: newItemName.trim(),
      })
      setNewItemName('')
    } catch (err) {
      console.error('Failed to add item:', err)
    }
  }

  const handleDeleteList = async () => {
    if (!confirm('Delete this shopping list?')) return
    try {
      await deleteList.mutateAsync(listId)
      onBack()
    } catch (err) {
      console.error('Failed to delete list:', err)
    }
  }

  const handleMarkComplete = async () => {
    try {
      await updateListStatus.mutateAsync({ listId, status: 'completed' })
    } catch (err) {
      console.error('Failed to mark complete:', err)
    }
  }

  if (isLoading) {
    return <div className={styles.loading}>Loading shopping list...</div>
  }

  if (error || !list) {
    return <div className={styles.error}>Shopping list not found</div>
  }

  const items = list.items || []
  const needToBuy = items.filter((i) => i.status === 'need_to_buy')
  const alreadyHave = items.filter((i) => i.status === 'already_have')
  const purchased = items.filter((i) => i.status === 'purchased')

  const totalItems = items.length
  const completedItems = alreadyHave.length + purchased.length
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0

  return (
    <div>
      <button className={styles.backButton} onClick={onBack}>
        ← Back to lists
      </button>

      <div className={styles.listDetail}>
        <div className={styles.listDetailHeader}>
          <h2 className={styles.listDetailTitle}>{list.title}</h2>
          <div className={styles.listDetailActions}>
            {list.status === 'active' && (
              <button
                className={`${styles.actionButton} ${styles.primary}`}
                onClick={handleMarkComplete}
              >
                Mark Complete
              </button>
            )}
            <button className={styles.deleteButton} onClick={handleDeleteList}>
              &times;
            </button>
          </div>
        </div>

        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
        <p className={styles.progressText}>
          {completedItems} of {totalItems} items done
        </p>

        <div className={styles.modeToggle}>
          <button
            className={`${styles.modeButton} ${mode === 'home' ? styles.modeButtonActive : ''}`}
            onClick={() => setMode('home')}
          >
            🏠 Before Shopping
          </button>
          <button
            className={`${styles.modeButton} ${mode === 'store' ? styles.modeButtonActive : ''}`}
            onClick={() => setMode('store')}
          >
            🛒 At the Store
          </button>
        </div>

        {mode === 'home' ? (
          <>
            <p className={styles.modeHint}>
              Check off items you already have at home
            </p>

            {needToBuy.length > 0 && (
              <div className={styles.itemsSection}>
                <h3 className={styles.itemsSectionTitle}>To Buy ({needToBuy.length})</h3>
                <div className={styles.itemsList}>
                  {needToBuy.map((item) => (
                    <ShoppingItem
                      key={item.shopping_list_item_id}
                      item={item}
                      mode={mode}
                      onStatusChange={(status) =>
                        updateStatus.mutate({ itemId: item.shopping_list_item_id, status })
                      }
                      onDelete={() => deleteItem.mutate(item.shopping_list_item_id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {alreadyHave.length > 0 && (
              <div className={styles.itemsSection}>
                <h3 className={styles.itemsSectionTitle}>Already Have ({alreadyHave.length})</h3>
                <div className={styles.itemsList}>
                  {alreadyHave.map((item) => (
                    <ShoppingItem
                      key={item.shopping_list_item_id}
                      item={item}
                      mode={mode}
                      onStatusChange={(status) =>
                        updateStatus.mutate({ itemId: item.shopping_list_item_id, status })
                      }
                      onDelete={() => deleteItem.mutate(item.shopping_list_item_id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {purchased.length > 0 && (
              <div className={styles.itemsSection}>
                <h3 className={styles.itemsSectionTitle}>Purchased ({purchased.length})</h3>
                <div className={styles.itemsList}>
                  {purchased.map((item) => (
                    <ShoppingItem
                      key={item.shopping_list_item_id}
                      item={item}
                      mode={mode}
                      onStatusChange={(status) =>
                        updateStatus.mutate({ itemId: item.shopping_list_item_id, status })
                      }
                      onDelete={() => deleteItem.mutate(item.shopping_list_item_id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {needToBuy.length === 0 && alreadyHave.length === 0 && purchased.length === 0 && (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>📝</div>
                <p className={styles.emptyText}>No items yet. Add some below!</p>
              </div>
            )}
          </>
        ) : (
          <>
            <p className={styles.modeHint}>
              Check off items as you put them in your cart
            </p>

            {needToBuy.length > 0 && (
              <div className={styles.itemsSection}>
                <h3 className={styles.itemsSectionTitle}>Shopping List ({needToBuy.length})</h3>
                <div className={styles.itemsList}>
                  {needToBuy.map((item) => (
                    <ShoppingItem
                      key={item.shopping_list_item_id}
                      item={item}
                      mode={mode}
                      onStatusChange={(status) =>
                        updateStatus.mutate({ itemId: item.shopping_list_item_id, status })
                      }
                      onDelete={() => deleteItem.mutate(item.shopping_list_item_id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {purchased.length > 0 && (
              <div className={styles.itemsSection}>
                <h3 className={styles.itemsSectionTitle}>In Cart ({purchased.length})</h3>
                <div className={styles.itemsList}>
                  {purchased.map((item) => (
                    <ShoppingItem
                      key={item.shopping_list_item_id}
                      item={item}
                      mode={mode}
                      onStatusChange={(status) =>
                        updateStatus.mutate({ itemId: item.shopping_list_item_id, status })
                      }
                      onDelete={() => deleteItem.mutate(item.shopping_list_item_id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {needToBuy.length === 0 && purchased.length === 0 && (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>✅</div>
                <p className={styles.emptyText}>All done! Nothing left to buy.</p>
              </div>
            )}
          </>
        )}

        <form className={styles.addItemForm} onSubmit={handleAddItem}>
          <input
            type="text"
            className={styles.addItemInput}
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="Add item..."
          />
          <button
            type="submit"
            className={styles.addItemButton}
            disabled={!newItemName.trim() || addItem.isPending}
          >
            Add
          </button>
        </form>
      </div>
    </div>
  )
}

export function Shopping() {
  const [showCreateList, setShowCreateList] = useState(false)
  const [selectedListId, setSelectedListId] = useState<string | null>(null)

  const { data: lists = [], isLoading, error } = useShoppingLists()
  const deleteList = useDeleteShoppingList()

  const handleDeleteList = async (listId: string) => {
    if (!confirm('Delete this shopping list?')) return
    try {
      await deleteList.mutateAsync(listId)
    } catch (err) {
      console.error('Failed to delete list:', err)
    }
  }

  const activeLists = lists.filter((l) => l.status === 'active')
  const completedLists = lists.filter((l) => l.status !== 'active')

  // If viewing a list detail
  if (selectedListId) {
    return (
      <AppLayout>
        <div className={styles.container}>
          <ShoppingListDetail
            listId={selectedListId}
            onBack={() => setSelectedListId(null)}
          />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Shopping</h1>
        </header>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Active Lists</h2>
            <button
              className={styles.addButton}
              onClick={() => setShowCreateList(true)}
            >
              + New List
            </button>
          </div>

          {error && (
            <div className={styles.error}>
              Failed to load shopping lists. Please try again.
            </div>
          )}

          {isLoading ? (
            <div className={styles.loading}>Loading shopping lists...</div>
          ) : activeLists.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>🛒</div>
              <p className={styles.emptyText}>No active shopping lists</p>
              <button
                className={styles.emptyAddButton}
                onClick={() => setShowCreateList(true)}
              >
                Create your first list
              </button>
            </div>
          ) : (
            <div className={styles.list}>
              {activeLists.map((list) => (
                <ShoppingListCard
                  key={list.shopping_list_id}
                  list={list}
                  onSelect={() => setSelectedListId(list.shopping_list_id)}
                  onDelete={() => handleDeleteList(list.shopping_list_id)}
                />
              ))}
            </div>
          )}
        </section>

        {completedLists.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Past Lists</h2>
            <div className={styles.list}>
              {completedLists.map((list) => (
                <ShoppingListCard
                  key={list.shopping_list_id}
                  list={list}
                  onSelect={() => setSelectedListId(list.shopping_list_id)}
                  onDelete={() => handleDeleteList(list.shopping_list_id)}
                />
              ))}
            </div>
          </section>
        )}

        <CreateShoppingListModal
          isOpen={showCreateList}
          onClose={() => setShowCreateList(false)}
        />
      </div>
    </AppLayout>
  )
}
