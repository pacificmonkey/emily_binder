import { useState, useEffect } from 'react'
import { Card, CardContent, Button, LoadingSpinner } from '@/components/ui'
import { usePermissions } from '@/hooks/usePermissions'
import {
  usePendingProposals,
  useOpenTodos,
  useProposalCounts,
  useReviewProposal,
  useResolveTodo,
  useEconomyConfigAdmin,
  useUpdateEconomyConfig,
  useAllStickers,
  useCreateSticker,
  useUpdateSticker,
  useDeleteSticker,
  useAdminCategories,
  useAllGoalsAdmin,
  useUpdateGoalAdmin,
  useDeleteGoalAdmin,
  useAllMoodFeelings,
  useCreateMoodFeeling,
  useUpdateMoodFeeling,
} from '@/hooks/useAdmin'
import {
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '@/hooks/useCategories'
import {
  useAllBudgetExpenseCategories,
  useCreateBudgetExpenseCategory,
  useUpdateBudgetExpenseCategory,
  useDeleteBudgetExpenseCategory,
} from '@/hooks/useBudget'
import { Navigate, useSearchParams, useNavigate } from 'react-router-dom'
import type { ProposalWithRelations, GoalWithOwner } from '@/services/admin'
import type { JoeyTodo, StickerCatalog, Category, MoodFeeling, MoodQuadrant, BudgetExpenseCategory } from '@/types/database'
import styles from './Admin.module.css'

type ViewType = 'dashboard' | 'proposals' | 'todos' | 'categories' | 'stickers' | 'economy' | 'goals' | 'feelings' | 'expense-categories'

// =============================================================================
// PROPOSALS SECTION
// =============================================================================

interface ProposalItemProps {
  proposal: ProposalWithRelations
  onApprove: () => void
  onReject: () => void
  isLoading: boolean
}

function ProposalItem({ proposal, onApprove, onReject, isLoading }: ProposalItemProps) {
  return (
    <div className={styles.proposalItem}>
      <div className={styles.proposalInfo}>
        <span className={styles.proposalTitle}>{proposal.title}</span>
        <span className={styles.proposalMeta}>
          {proposal.category?.name} • {proposal.recurrence_pattern}
          {proposal.is_urgent && <span className={styles.urgentBadge}>Urgent</span>}
        </span>
        {proposal.instructions_md && (
          <span className={styles.proposalInstructions}>{proposal.instructions_md}</span>
        )}
      </div>
      <div className={styles.proposalActions}>
        <Button size="sm" variant="ghost" onClick={onReject} disabled={isLoading}>
          Reject
        </Button>
        <Button size="sm" onClick={onApprove} disabled={isLoading}>
          Approve
        </Button>
      </div>
    </div>
  )
}

// =============================================================================
// TODOS SECTION
// =============================================================================

interface TodoItemProps {
  todo: JoeyTodo
  onResolve: () => void
  isLoading: boolean
}

function TodoItem({ todo, onResolve, isLoading }: TodoItemProps) {
  const typeLabels: Record<string, string> = {
    deadline_risk: 'Deadline Risk',
    urgent_report: 'Urgent Report',
    health_refill_risk: 'Refill Alert',
  }
  const typeIcons: Record<string, string> = {
    deadline_risk: '⏰',
    urgent_report: '🚨',
    health_refill_risk: '💊',
  }

  return (
    <div className={styles.todoItem}>
      <span className={styles.todoIcon}>{typeIcons[todo.type] || '📋'}</span>
      <div className={styles.todoInfo}>
        <span className={styles.todoTitle}>{todo.title}</span>
        <span className={styles.todoType}>{typeLabels[todo.type] || todo.type}</span>
        {todo.description && <span className={styles.todoDescription}>{todo.description}</span>}
      </div>
      <Button size="sm" variant="secondary" onClick={onResolve} disabled={isLoading}>
        Done
      </Button>
    </div>
  )
}

// =============================================================================
// CATEGORY EDITOR
// =============================================================================

interface CategoryEditorProps {
  onBack: () => void
}

function CategoryEditor({ onBack }: CategoryEditorProps) {
  const { data: categories, isLoading, error } = useAdminCategories()
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()

  // Debug logging
  if (error) console.error('[Admin] Categories error:', error)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('#6b7280')
  const [editIcon, setEditIcon] = useState('')
  const [newName, setNewName] = useState('')

  const handleEdit = (cat: Category) => {
    setEditingId(cat.id)
    setEditName(cat.name)
    setEditColor(cat.color || '#6b7280')
    setEditIcon(cat.icon || '')
  }

  const handleSave = async () => {
    if (!editingId || !editName.trim()) return
    await updateCategory.mutateAsync({
      id: editingId,
      updates: { name: editName.trim(), color: editColor, icon: editIcon || null },
    })
    setEditingId(null)
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    await createCategory.mutateAsync({
      name: newName.trim(),
      color: '#6b7280',
      icon: null,
      vp_value: 5,
      is_mandatory_default: false,
      sort_order: (categories?.length || 0) + 1,
      end_of_day_policy: 'carryover_next_day',
    })
    setNewName('')
  }

  const handleDelete = async (id: string) => {
    if (confirm('Delete this category? Missions using it will be affected.')) {
      await deleteCategory.mutateAsync(id)
    }
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backButton} onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <h1 className={styles.title}>Categories</h1>
      </header>

      {isLoading ? (
        <Card><CardContent><div className={styles.loadingContainer}><LoadingSpinner /></div></CardContent></Card>
      ) : error ? (
        <Card><CardContent><div style={{ padding: 'var(--space-4)', color: 'var(--color-danger-700)', backgroundColor: 'var(--color-danger-50)', borderRadius: 'var(--radius-md)' }}>Error loading categories: {error instanceof Error ? error.message : 'Unknown error'}</div></CardContent></Card>
      ) : (
        <>
          <Card>
            <CardContent>
              <div className={styles.itemList}>
                {categories?.map(cat => (
                  <div key={cat.id} className={styles.editableItem}>
                    {editingId === cat.id ? (
                      <div className={styles.editForm}>
                        <input
                          type="text"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className={styles.input}
                          placeholder="Category name"
                        />
                        <input
                          type="color"
                          value={editColor}
                          onChange={e => setEditColor(e.target.value)}
                          className={styles.colorInput}
                        />
                        <input
                          type="text"
                          value={editIcon}
                          onChange={e => setEditIcon(e.target.value)}
                          className={styles.input}
                          placeholder="Icon (emoji)"
                          style={{ width: '60px' }}
                        />
                        <Button size="sm" onClick={handleSave} disabled={updateCategory.isPending}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                      </div>
                    ) : (
                      <div className={styles.itemRow}>
                        <span className={styles.itemIcon} style={{ color: cat.color || undefined }}>{cat.icon || '📁'}</span>
                        <span className={styles.itemName}>{cat.name}</span>
                        <div className={styles.itemActions}>
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(cat)}>Edit</Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(cat.id)}>Delete</Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className={styles.addForm}>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className={styles.input}
                  placeholder="New category name..."
                />
                <Button onClick={handleCreate} disabled={!newName.trim() || createCategory.isPending}>
                  Add Category
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

// =============================================================================
// STICKER EDITOR
// =============================================================================

interface StickerEditorProps {
  onBack: () => void
}

function StickerEditor({ onBack }: StickerEditorProps) {
  const { data: stickers, isLoading, error } = useAllStickers()
  const createSticker = useCreateSticker()
  const updateSticker = useUpdateSticker()
  const deleteSticker = useDeleteSticker()

  // Debug logging
  if (error) console.error('[Admin] Stickers error:', error)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState(10)
  const [editUrl, setEditUrl] = useState('')
  const [editCategory, setEditCategory] = useState('')

  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState(10)
  const [newUrl, setNewUrl] = useState('')
  const [newCategory, setNewCategory] = useState('')

  const handleEdit = (sticker: StickerCatalog) => {
    setEditingId(sticker.id)
    setEditName(sticker.name)
    setEditPrice(sticker.cost_coins)
    setEditUrl(sticker.image_url)
    setEditCategory(sticker.category || '')
  }

  const handleSave = async () => {
    if (!editingId || !editName.trim()) return
    await updateSticker.mutateAsync({
      id: editingId,
      updates: {
        name: editName.trim(),
        cost_coins: editPrice,
        image_url: editUrl,
        category: editCategory || null,
      },
    })
    setEditingId(null)
  }

  const handleCreate = async () => {
    if (!newName.trim() || !newUrl.trim()) return
    await createSticker.mutateAsync({
      name: newName.trim(),
      image_url: newUrl.trim(),
      cost_coins: newPrice,
      category: newCategory || null,
    })
    setNewName('')
    setNewUrl('')
    setNewPrice(10)
    setNewCategory('')
    setShowAdd(false)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Deactivate this sticker? Users who own it will keep it.')) {
      await deleteSticker.mutateAsync(id)
    }
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backButton} onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <h1 className={styles.title}>Stickers</h1>
      </header>

      {isLoading ? (
        <Card><CardContent><div className={styles.loadingContainer}><LoadingSpinner /></div></CardContent></Card>
      ) : error ? (
        <Card><CardContent><div style={{ padding: 'var(--space-4)', color: 'var(--color-danger-700)', backgroundColor: 'var(--color-danger-50)', borderRadius: 'var(--radius-md)' }}>Error loading stickers: {error instanceof Error ? error.message : 'Unknown error'}</div></CardContent></Card>
      ) : (
        <>
          <Card>
            <CardContent>
              <div className={styles.itemList}>
                {stickers?.map(sticker => (
                  <div key={sticker.id} className={`${styles.editableItem} ${!sticker.active ? styles.inactive : ''}`}>
                    {editingId === sticker.id ? (
                      <div className={styles.editForm}>
                        <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className={styles.input} placeholder="Name" />
                        <input type="number" value={editPrice} onChange={e => setEditPrice(Number(e.target.value))} className={styles.input} style={{ width: '80px' }} min={0} />
                        <input type="text" value={editUrl} onChange={e => setEditUrl(e.target.value)} className={styles.input} placeholder="Image URL" />
                        <input type="text" value={editCategory} onChange={e => setEditCategory(e.target.value)} className={styles.input} placeholder="Category" style={{ width: '100px' }} />
                        <Button size="sm" onClick={handleSave} disabled={updateSticker.isPending}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                      </div>
                    ) : (
                      <div className={styles.itemRow}>
                        <span className={styles.stickerPreview}>
                          {sticker.image_url.startsWith('/') ? '🖼️' : '🖼️'}
                        </span>
                        <span className={styles.itemName}>{sticker.name}</span>
                        <span className={styles.stickerPrice}>{sticker.cost_coins} coins</span>
                        <span className={styles.stickerCategory}>{sticker.category || '-'}</span>
                        <div className={styles.itemActions}>
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(sticker)}>Edit</Button>
                          {sticker.active && <Button size="sm" variant="ghost" onClick={() => handleDelete(sticker.id)}>Delete</Button>}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {showAdd ? (
            <Card>
              <CardContent>
                <div className={styles.addFormVertical}>
                  <input type="text" value={newName} onChange={e => setNewName(e.target.value)} className={styles.input} placeholder="Sticker name" />
                  <input type="text" value={newUrl} onChange={e => setNewUrl(e.target.value)} className={styles.input} placeholder="Image URL (e.g., /stickers/star.svg)" />
                  <div className={styles.addFormRow}>
                    <input type="number" value={newPrice} onChange={e => setNewPrice(Number(e.target.value))} className={styles.input} placeholder="Price" min={0} style={{ width: '100px' }} />
                    <span>coins</span>
                    <input type="text" value={newCategory} onChange={e => setNewCategory(e.target.value)} className={styles.input} placeholder="Category" style={{ width: '120px' }} />
                  </div>
                  <div className={styles.addFormActions}>
                    <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
                    <Button onClick={handleCreate} disabled={!newName.trim() || !newUrl.trim() || createSticker.isPending}>Add Sticker</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button variant="secondary" onClick={() => setShowAdd(true)}>+ Add Sticker</Button>
          )}
        </>
      )}
    </div>
  )
}

// =============================================================================
// ECONOMY EDITOR (Level Curve)
// =============================================================================

interface EconomyEditorProps {
  onBack: () => void
}

function EconomyEditor({ onBack }: EconomyEditorProps) {
  const { data: config, isLoading, error } = useEconomyConfigAdmin()
  const updateConfig = useUpdateEconomyConfig()

  // Debug logging
  if (error) console.error('[Admin] Economy config error:', error)

  const [thresholds, setThresholds] = useState<number[]>([0, 100, 250, 500, 1000, 2000, 4000, 8000, 16000, 32000])
  const [coinsPerLevel, setCoinsPerLevel] = useState<number[]>([0, 5, 10, 15, 20, 25, 30, 40, 50, 100])
  const [dailyWinThreshold, setDailyWinThreshold] = useState(15)
  const [graceTokenCost, setGraceTokenCost] = useState(50)
  const [hasChanges, setHasChanges] = useState(false)
  const [initialized, setInitialized] = useState(false)

  // Initialize from config when it loads
  useEffect(() => {
    if (config && !initialized) {
      setThresholds(config.level_thresholds as number[] || [0, 100, 250, 500, 1000, 2000, 4000, 8000, 16000, 32000])
      setCoinsPerLevel(config.coins_per_level as number[] || [0, 5, 10, 15, 20, 25, 30, 40, 50, 100])
      setDailyWinThreshold(config.daily_win_threshold)
      setGraceTokenCost(config.grace_token_cost)
      setInitialized(true)
    }
  }, [config, initialized])

  const handleThresholdChange = (index: number, value: number) => {
    const newThresholds = [...thresholds]
    newThresholds[index] = value
    setThresholds(newThresholds)
    setHasChanges(true)
  }

  const handleCoinsChange = (index: number, value: number) => {
    const newCoins = [...coinsPerLevel]
    newCoins[index] = value
    setCoinsPerLevel(newCoins)
    setHasChanges(true)
  }

  const handleAddLevel = () => {
    const lastThreshold = thresholds[thresholds.length - 1] || 0
    setThresholds([...thresholds, lastThreshold * 2])
    setCoinsPerLevel([...coinsPerLevel, 100])
    setHasChanges(true)
  }

  const handleRemoveLevel = () => {
    if (thresholds.length > 2) {
      setThresholds(thresholds.slice(0, -1))
      setCoinsPerLevel(coinsPerLevel.slice(0, -1))
      setHasChanges(true)
    }
  }

  const handleSave = async () => {
    await updateConfig.mutateAsync({
      level_thresholds: thresholds,
      coins_per_level: coinsPerLevel,
      daily_win_threshold: dailyWinThreshold,
      grace_token_cost: graceTokenCost,
    })
    setHasChanges(false)
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backButton} onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <h1 className={styles.title}>Economy Settings</h1>
      </header>

      {isLoading ? (
        <Card><CardContent><div className={styles.loadingContainer}><LoadingSpinner /></div></CardContent></Card>
      ) : error ? (
        <Card><CardContent><div style={{ padding: 'var(--space-4)', color: 'var(--color-danger-700)', backgroundColor: 'var(--color-danger-50)', borderRadius: 'var(--radius-md)' }}>Error loading economy config: {error instanceof Error ? error.message : 'Unknown error'}</div></CardContent></Card>
      ) : (
        <>
          <Card>
            <CardContent>
              <h3 className={styles.sectionTitle}>Level Progression</h3>
              <p className={styles.sectionDesc}>VP required to reach each level and coins awarded</p>
              <div className={styles.levelGrid}>
                <div className={styles.levelHeader}>
                  <span>Level</span>
                  <span>VP Required</span>
                  <span>Coins Awarded</span>
                </div>
                {thresholds.map((threshold, i) => (
                  <div key={i} className={styles.levelRow}>
                    <span className={styles.levelNum}>Level {i + 1}</span>
                    <input
                      type="number"
                      value={threshold}
                      onChange={e => handleThresholdChange(i, Number(e.target.value))}
                      className={styles.input}
                      min={0}
                      disabled={i === 0}
                    />
                    <input
                      type="number"
                      value={coinsPerLevel[i] || 0}
                      onChange={e => handleCoinsChange(i, Number(e.target.value))}
                      className={styles.input}
                      min={0}
                    />
                  </div>
                ))}
              </div>
              <div className={styles.levelActions}>
                <Button size="sm" variant="ghost" onClick={handleAddLevel}>+ Add Level</Button>
                <Button size="sm" variant="ghost" onClick={handleRemoveLevel} disabled={thresholds.length <= 2}>- Remove Level</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <h3 className={styles.sectionTitle}>Other Settings</h3>
              <div className={styles.settingsGrid}>
                <div className={styles.settingRow}>
                  <label>Daily Win VP Threshold</label>
                  <input
                    type="number"
                    value={dailyWinThreshold}
                    onChange={e => { setDailyWinThreshold(Number(e.target.value)); setHasChanges(true) }}
                    className={styles.input}
                    min={1}
                  />
                </div>
                <div className={styles.settingRow}>
                  <label>Grace Token Cost (coins)</label>
                  <input
                    type="number"
                    value={graceTokenCost}
                    onChange={e => { setGraceTokenCost(Number(e.target.value)); setHasChanges(true) }}
                    className={styles.input}
                    min={0}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {hasChanges && (
            <Button onClick={handleSave} disabled={updateConfig.isPending}>
              {updateConfig.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </>
      )}
    </div>
  )
}

// =============================================================================
// GOALS MANAGEMENT
// =============================================================================

interface GoalsManagerProps {
  onBack: () => void
}

function GoalsManager({ onBack }: GoalsManagerProps) {
  const { data: goals, isLoading, error } = useAllGoalsAdmin()
  const updateGoal = useUpdateGoalAdmin()
  const deleteGoal = useDeleteGoalAdmin()

  // Debug logging
  if (error) console.error('[Admin] Goals error:', error)

  const handleToggleComplete = async (goal: GoalWithOwner) => {
    await updateGoal.mutateAsync({
      id: goal.id,
      updates: { is_completed: !goal.is_completed },
    })
  }

  const handleToggleArchive = async (goal: GoalWithOwner) => {
    await updateGoal.mutateAsync({
      id: goal.id,
      updates: { archived: !goal.archived },
    })
  }

  const handleDelete = async (id: string) => {
    if (confirm('Delete this goal permanently?')) {
      await deleteGoal.mutateAsync(id)
    }
  }

  const activeGoals = goals?.filter(g => !g.archived) || []
  const archivedGoals = goals?.filter(g => g.archived) || []

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backButton} onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <h1 className={styles.title}>Goals</h1>
      </header>

      {isLoading ? (
        <Card><CardContent><div className={styles.loadingContainer}><LoadingSpinner /></div></CardContent></Card>
      ) : error ? (
        <Card><CardContent><div style={{ padding: 'var(--space-4)', color: 'var(--color-danger-700)', backgroundColor: 'var(--color-danger-50)', borderRadius: 'var(--radius-md)' }}>Error loading goals: {error instanceof Error ? error.message : 'Unknown error'}</div></CardContent></Card>
      ) : (
        <>
          <Card>
            <CardContent>
              <h3 className={styles.sectionTitle}>Active Goals ({activeGoals.length})</h3>
              <div className={styles.goalList}>
                {activeGoals.map(goal => (
                  <div key={goal.id} className={`${styles.goalItem} ${goal.is_completed ? styles.completed : ''}`}>
                    <div className={styles.goalInfo}>
                      <span className={styles.goalType}>{goal.goal_type === 'destiny' ? '⭐' : '🗺️'}</span>
                      <div className={styles.goalDetails}>
                        <span className={styles.goalTitle}>{goal.title}</span>
                        <span className={styles.goalMeta}>
                          {goal.owner?.display_name || 'Unknown'} • {goal.goal_type}
                          {goal.is_completed && ' • Completed'}
                        </span>
                      </div>
                    </div>
                    <div className={styles.goalActions}>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleComplete(goal)}
                        disabled={updateGoal.isPending}
                      >
                        {goal.is_completed ? 'Unmark' : 'Complete'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleArchive(goal)}
                        disabled={updateGoal.isPending}
                      >
                        Archive
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(goal.id)}
                        disabled={deleteGoal.isPending}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
                {activeGoals.length === 0 && (
                  <div className={styles.emptyState}>
                    <span className={styles.emptyIcon}>📋</span>
                    <p className={styles.emptyText}>No active goals</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {archivedGoals.length > 0 && (
            <Card variant="outlined">
              <CardContent>
                <h3 className={styles.sectionTitle}>Archived ({archivedGoals.length})</h3>
                <div className={styles.goalList}>
                  {archivedGoals.map(goal => (
                    <div key={goal.id} className={`${styles.goalItem} ${styles.archived}`}>
                      <div className={styles.goalInfo}>
                        <span className={styles.goalType}>{goal.goal_type === 'destiny' ? '⭐' : '🗺️'}</span>
                        <span className={styles.goalTitle}>{goal.title}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleArchive(goal)}
                        disabled={updateGoal.isPending}
                      >
                        Restore
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

// =============================================================================
// FEELING EDITOR
// =============================================================================

interface FeelingEditorProps {
  onBack: () => void
}

const QUADRANT_OPTIONS: { value: MoodQuadrant; label: string; emoji: string }[] = [
  { value: 'high_energy_pleasant', label: 'High Energy, Pleasant', emoji: '😊' },
  { value: 'high_energy_unpleasant', label: 'High Energy, Unpleasant', emoji: '😤' },
  { value: 'low_energy_pleasant', label: 'Low Energy, Pleasant', emoji: '😌' },
  { value: 'low_energy_unpleasant', label: 'Low Energy, Unpleasant', emoji: '😔' },
]

function FeelingEditor({ onBack }: FeelingEditorProps) {
  const { data: feelings, isLoading, error } = useAllMoodFeelings()
  const createFeeling = useCreateMoodFeeling()
  const updateFeeling = useUpdateMoodFeeling()

  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newQuadrant, setNewQuadrant] = useState<MoodQuadrant>('high_energy_pleasant')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editQuadrant, setEditQuadrant] = useState<MoodQuadrant>('high_energy_pleasant')

  const handleCreate = async () => {
    if (!newName.trim()) return
    const maxSortOrder = feelings?.reduce((max, f) => Math.max(max, f.sort_order), 0) ?? 0
    await createFeeling.mutateAsync({
      name: newName.trim(),
      quadrant: newQuadrant,
      sort_order: maxSortOrder + 1,
      active: true,
    })
    setNewName('')
    setShowAddForm(false)
  }

  const handleStartEdit = (feeling: MoodFeeling) => {
    setEditingId(feeling.id)
    setEditName(feeling.name)
    setEditQuadrant(feeling.quadrant)
  }

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return
    await updateFeeling.mutateAsync({
      id: editingId,
      updates: { name: editName.trim(), quadrant: editQuadrant },
    })
    setEditingId(null)
  }

  const handleToggleActive = async (feeling: MoodFeeling) => {
    await updateFeeling.mutateAsync({
      id: feeling.id,
      updates: { active: !feeling.active },
    })
  }

  // Group feelings by quadrant
  const feelingsByQuadrant = QUADRANT_OPTIONS.map(q => ({
    ...q,
    feelings: feelings?.filter(f => f.quadrant === q.value).sort((a, b) => a.sort_order - b.sort_order) ?? [],
  }))

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backButton} onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <h1 className={styles.title}>Mood Feelings</h1>
      </header>

      {/* Add Feeling Form */}
      <Card>
        <CardContent>
          {showAddForm ? (
            <div className={styles.addForm}>
              <div className={styles.formRow}>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Feeling name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <select
                  className={styles.select}
                  value={newQuadrant}
                  onChange={(e) => setNewQuadrant(e.target.value as MoodQuadrant)}
                >
                  {QUADRANT_OPTIONS.map(q => (
                    <option key={q.value} value={q.value}>
                      {q.emoji} {q.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formActions}>
                <Button variant="ghost" onClick={() => setShowAddForm(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={!newName.trim() || createFeeling.isPending}>
                  {createFeeling.isPending ? 'Adding...' : 'Add Feeling'}
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={() => setShowAddForm(true)}>+ Add Feeling</Button>
          )}
        </CardContent>
      </Card>

      {/* Feelings by Quadrant */}
      {isLoading ? (
        <Card><CardContent><div className={styles.loadingContainer}><LoadingSpinner /></div></CardContent></Card>
      ) : error ? (
        <Card><CardContent><div style={{ padding: 'var(--space-4)', color: 'var(--color-danger-700)', backgroundColor: 'var(--color-danger-50)', borderRadius: 'var(--radius-md)' }}>Error: {error instanceof Error ? error.message : 'Unknown error'}</div></CardContent></Card>
      ) : (
        feelingsByQuadrant.map(quadrant => (
          <Card key={quadrant.value} variant="outlined">
            <CardContent>
              <h3 className={styles.sectionTitle}>
                {quadrant.emoji} {quadrant.label} ({quadrant.feelings.length})
              </h3>
              <div className={styles.feelingList}>
                {quadrant.feelings.map(feeling => (
                  <div
                    key={feeling.id}
                    className={`${styles.feelingItem} ${!feeling.active ? styles.inactive : ''}`}
                  >
                    {editingId === feeling.id ? (
                      <div className={styles.editForm}>
                        <input
                          type="text"
                          className={styles.input}
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                        />
                        <select
                          className={styles.select}
                          value={editQuadrant}
                          onChange={(e) => setEditQuadrant(e.target.value as MoodQuadrant)}
                        >
                          {QUADRANT_OPTIONS.map(q => (
                            <option key={q.value} value={q.value}>{q.emoji} {q.label}</option>
                          ))}
                        </select>
                        <Button size="sm" onClick={handleSaveEdit} disabled={updateFeeling.isPending}>
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className={styles.feelingName}>{feeling.name}</span>
                        <div className={styles.feelingActions}>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStartEdit(feeling)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleActive(feeling)}
                            disabled={updateFeeling.isPending}
                          >
                            {feeling.active ? 'Deactivate' : 'Activate'}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {quadrant.feelings.length === 0 && (
                  <div className={styles.emptyState}>
                    <p className={styles.emptyText}>No feelings in this quadrant</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}

// =============================================================================
// BUDGET EXPENSE CATEGORY EDITOR
// =============================================================================

interface BudgetCategoryEditorProps {
  onBack: () => void
}

function BudgetCategoryEditor({ onBack }: BudgetCategoryEditorProps) {
  const { data: categories, isLoading, error } = useAllBudgetExpenseCategories()
  const createCategory = useCreateBudgetExpenseCategory()
  const updateCategory = useUpdateBudgetExpenseCategory()
  const deleteCategory = useDeleteBudgetExpenseCategory()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editIcon, setEditIcon] = useState('')
  const [editVp, setEditVp] = useState(0)

  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('📦')
  const [newVp, setNewVp] = useState(0)

  const handleEdit = (cat: BudgetExpenseCategory) => {
    setEditingId(cat.id)
    setEditName(cat.name)
    setEditIcon(cat.icon)
    setEditVp(cat.vp_value)
  }

  const handleSave = async () => {
    if (!editingId || !editName.trim()) return
    await updateCategory.mutateAsync({
      id: editingId,
      updates: {
        name: editName.trim(),
        icon: editIcon,
        vp_value: editVp,
      },
    })
    setEditingId(null)
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    const maxSort = categories?.reduce((max, c) => Math.max(max, c.sort_order), 0) ?? 0
    await createCategory.mutateAsync({
      name: newName.trim(),
      icon: newIcon || '📦',
      vp_value: newVp,
      sort_order: maxSort + 1,
    })
    setNewName('')
    setNewIcon('📦')
    setNewVp(0)
    setShowAdd(false)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Delete this expense category? Existing expenses using it will keep their category text.')) {
      await deleteCategory.mutateAsync(id)
    }
  }

  const handleToggleActive = async (cat: BudgetExpenseCategory) => {
    await updateCategory.mutateAsync({
      id: cat.id,
      updates: { is_active: !cat.is_active },
    })
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backButton} onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <h1 className={styles.title}>Budget Categories</h1>
      </header>

      {isLoading ? (
        <Card><CardContent><div className={styles.loadingContainer}><LoadingSpinner /></div></CardContent></Card>
      ) : error ? (
        <Card><CardContent><div style={{ padding: 'var(--space-4)', color: 'var(--color-danger-700)', backgroundColor: 'var(--color-danger-50)', borderRadius: 'var(--radius-md)' }}>Error loading categories: {error instanceof Error ? error.message : 'Unknown error'}</div></CardContent></Card>
      ) : (
        <>
          <Card>
            <CardContent>
              <p className={styles.sectionDesc}>Expense categories for budget tracking. VP is awarded when logging actual expenses.</p>
              <div className={styles.itemList}>
                {categories?.map(cat => (
                  <div key={cat.id} className={`${styles.editableItem} ${!cat.is_active ? styles.inactive : ''}`}>
                    {editingId === cat.id ? (
                      <div className={styles.editForm}>
                        <input
                          type="text"
                          value={editIcon}
                          onChange={e => setEditIcon(e.target.value)}
                          className={styles.input}
                          placeholder="Icon"
                          style={{ width: '50px', textAlign: 'center' }}
                        />
                        <input
                          type="text"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className={styles.input}
                          placeholder="Category name"
                        />
                        <div className={styles.vpInput}>
                          <input
                            type="number"
                            value={editVp}
                            onChange={e => setEditVp(Number(e.target.value))}
                            className={styles.input}
                            min={0}
                            style={{ width: '60px' }}
                          />
                          <span>VP</span>
                        </div>
                        <Button size="sm" onClick={handleSave} disabled={updateCategory.isPending}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                      </div>
                    ) : (
                      <div className={styles.itemRow}>
                        <span className={styles.itemIcon}>{cat.icon}</span>
                        <span className={styles.itemName}>{cat.name}</span>
                        <span className={styles.vpBadge}>{cat.vp_value} VP</span>
                        <div className={styles.itemActions}>
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(cat)}>Edit</Button>
                          <Button size="sm" variant="ghost" onClick={() => handleToggleActive(cat)}>
                            {cat.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(cat.id)}>Delete</Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {showAdd ? (
            <Card>
              <CardContent>
                <div className={styles.addFormVertical}>
                  <div className={styles.formRow}>
                    <input
                      type="text"
                      value={newIcon}
                      onChange={e => setNewIcon(e.target.value)}
                      className={styles.input}
                      placeholder="Icon"
                      style={{ width: '50px', textAlign: 'center' }}
                    />
                    <input
                      type="text"
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      className={styles.input}
                      placeholder="Category name"
                      style={{ flex: 1 }}
                    />
                  </div>
                  <div className={styles.addFormRow}>
                    <span>VP awarded when logging:</span>
                    <input
                      type="number"
                      value={newVp}
                      onChange={e => setNewVp(Number(e.target.value))}
                      className={styles.input}
                      min={0}
                      style={{ width: '60px' }}
                    />
                  </div>
                  <div className={styles.addFormActions}>
                    <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
                    <Button onClick={handleCreate} disabled={!newName.trim() || createCategory.isPending}>
                      Add Category
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button variant="secondary" onClick={() => setShowAdd(true)}>+ Add Category</Button>
          )}
        </>
      )}
    </div>
  )
}

// =============================================================================
// ADMIN SECTIONS CONFIG
// =============================================================================

interface AdminSection {
  id: ViewType
  title: string
  description: string
  icon: string
}

const adminSections: AdminSection[] = [
  { id: 'proposals', title: 'Proposals', description: 'Review pending mission proposals', icon: '📋' },
  { id: 'todos', title: 'Alerts', description: 'View alerts and action items', icon: '🔔' },
  { id: 'categories', title: 'Mission Categories', description: 'Manage mission categories', icon: '📁' },
  { id: 'expense-categories', title: 'Budget Categories', description: 'Manage expense categories with VP', icon: '💵' },
  { id: 'feelings', title: 'Feelings', description: 'Manage mood feeling vocabulary', icon: '💭' },
  { id: 'stickers', title: 'Stickers', description: 'Manage sticker catalog & prices', icon: '🌟' },
  { id: 'economy', title: 'Economy', description: 'Level curve, VP & coin settings', icon: '💰' },
  { id: 'goals', title: 'Goals', description: 'View and manage all goals', icon: '🎯' },
]

// =============================================================================
// MAIN ADMIN PAGE
// =============================================================================

export function AdminPage() {
  const { isJoey } = usePermissions()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  // Get current view from URL params, default to dashboard
  const currentView = (searchParams.get('view') as ViewType) || 'dashboard'

  // Helper to navigate to a view (updates URL)
  const setCurrentView = (view: ViewType) => {
    if (view === 'dashboard') {
      setSearchParams({})
    } else {
      setSearchParams({ view })
    }
  }

  // Helper to go back to dashboard (for back buttons)
  const goBackToDashboard = () => {
    navigate('/admin')
  }

  const { data: pendingProposals, isLoading: proposalsLoading, error: proposalsError } = usePendingProposals()
  const { data: openTodos, isLoading: todosLoading, error: todosError } = useOpenTodos()
  const { data: proposalCounts } = useProposalCounts()

  const reviewProposal = useReviewProposal()
  const resolveTodo = useResolveTodo()

  // Debug logging
  if (proposalsError) console.error('[Admin] Proposals error:', proposalsError)
  if (todosError) console.error('[Admin] Todos error:', todosError)

  if (!isJoey) {
    return <Navigate to="/" replace />
  }

  const handleApprove = async (proposalId: string) => {
    await reviewProposal.mutateAsync({ proposalId, status: 'approved' })
  }

  const handleReject = async (proposalId: string) => {
    await reviewProposal.mutateAsync({ proposalId, status: 'rejected' })
  }

  const handleResolveTodo = async (todoId: string) => {
    await resolveTodo.mutateAsync(todoId)
  }

  // Render sub-views
  if (currentView === 'categories') {
    return <CategoryEditor onBack={goBackToDashboard} />
  }

  if (currentView === 'stickers') {
    return <StickerEditor onBack={goBackToDashboard} />
  }

  if (currentView === 'economy') {
    return <EconomyEditor onBack={goBackToDashboard} />
  }

  if (currentView === 'goals') {
    return <GoalsManager onBack={goBackToDashboard} />
  }

  if (currentView === 'feelings') {
    return <FeelingEditor onBack={goBackToDashboard} />
  }

  if (currentView === 'expense-categories') {
    return <BudgetCategoryEditor onBack={goBackToDashboard} />
  }

  if (currentView === 'proposals') {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <button className={styles.backButton} onClick={goBackToDashboard}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>
          <h1 className={styles.title}>Proposals</h1>
        </header>

        {proposalsLoading ? (
          <Card><CardContent><div className={styles.loadingContainer}><LoadingSpinner /></div></CardContent></Card>
        ) : proposalsError ? (
          <Card><CardContent><div style={{ padding: 'var(--space-4)', color: 'var(--color-danger-700)', backgroundColor: 'var(--color-danger-50)', borderRadius: 'var(--radius-md)' }}>Error loading proposals: {proposalsError instanceof Error ? proposalsError.message : 'Unknown error'}</div></CardContent></Card>
        ) : !pendingProposals || pendingProposals.length === 0 ? (
          <Card><CardContent><div className={styles.emptyState}><span className={styles.emptyIcon}>✅</span><p className={styles.emptyText}>No pending proposals</p></div></CardContent></Card>
        ) : (
          <Card>
            <CardContent>
              <div className={styles.proposalList}>
                {pendingProposals.map(proposal => (
                  <ProposalItem
                    key={proposal.id}
                    proposal={proposal}
                    onApprove={() => handleApprove(proposal.id)}
                    onReject={() => handleReject(proposal.id)}
                    isLoading={reviewProposal.isPending}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  if (currentView === 'todos') {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <button className={styles.backButton} onClick={goBackToDashboard}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>
          <h1 className={styles.title}>Alerts</h1>
        </header>

        {todosLoading ? (
          <Card><CardContent><div className={styles.loadingContainer}><LoadingSpinner /></div></CardContent></Card>
        ) : todosError ? (
          <Card><CardContent><div style={{ padding: 'var(--space-4)', color: 'var(--color-danger-700)', backgroundColor: 'var(--color-danger-50)', borderRadius: 'var(--radius-md)' }}>Error loading alerts: {todosError instanceof Error ? todosError.message : 'Unknown error'}</div></CardContent></Card>
        ) : !openTodos || openTodos.length === 0 ? (
          <Card><CardContent><div className={styles.emptyState}><span className={styles.emptyIcon}>✅</span><p className={styles.emptyText}>No open alerts</p></div></CardContent></Card>
        ) : (
          <Card>
            <CardContent>
              <div className={styles.todoList}>
                {openTodos.map(todo => (
                  <TodoItem
                    key={todo.id}
                    todo={todo}
                    onResolve={() => handleResolveTodo(todo.id)}
                    isLoading={resolveTodo.isPending}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // Dashboard view
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Admin Console</h1>
        <p className={styles.subtitle}>Joey's management dashboard</p>
      </header>

      {/* Quick Stats */}
      <div className={styles.statsRow}>
        <Card className={styles.statCard}>
          <CardContent>
            <div className={styles.stat}>
              <span className={styles.statValue}>{proposalCounts?.pending ?? 0}</span>
              <span className={styles.statLabel}>Pending Proposals</span>
            </div>
          </CardContent>
        </Card>
        <Card className={styles.statCard}>
          <CardContent>
            <div className={styles.stat}>
              <span className={styles.statValue}>{openTodos?.length ?? 0}</span>
              <span className={styles.statLabel}>Open Alerts</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Sections */}
      <div className={styles.grid}>
        {adminSections.map((section) => (
          <button
            key={section.id}
            className={styles.sectionButton}
            onClick={() => setCurrentView(section.id)}
          >
            <Card variant="outlined" className={styles.card}>
              <CardContent>
                <div className={styles.cardContent}>
                  <span className={styles.icon}>{section.icon}</span>
                  <div className={styles.text}>
                    <h3 className={styles.cardTitle}>{section.title}</h3>
                    <p className={styles.cardDescription}>{section.description}</p>
                  </div>
                  <svg className={styles.arrow} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>
    </div>
  )
}
