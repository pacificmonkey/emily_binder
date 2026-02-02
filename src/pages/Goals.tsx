import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, Button, EmptyState, LoadingSpinner, ErrorCard } from '@/components/ui'
import { GoalProgressBar, CompletionRing, MissionPickerModal } from '@/components/goals'
import { usePermissions } from '@/hooks/usePermissions'
import { useDestinies, useQuests, useCreateGoal, useUpdateGoal, useDeleteGoal, useGoalProgress, useAddGoalItem, useRemoveGoalItem } from '@/hooks/useGoals'
import { useAllMissions } from '@/hooks/useMissions'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import type { GoalWithItems } from '@/services/goals'
import type { GoalItem } from '@/types/database'
import styles from './Goals.module.css'

type TabType = 'destinies' | 'quests'

interface GoalItemProps {
  goal: GoalWithItems
  onComplete: (goalId: string) => void
  onUncomplete?: (goalId: string) => void
  canUnmark?: boolean
  isExpanded?: boolean
  onToggleExpand?: () => void
  onAddMission?: () => void
  onRemoveMission?: (itemId: string) => void
  onDelete?: (goalId: string) => void
  missions?: Map<string, { title: string; icon: string | null }>
  canEdit?: boolean
  canDelete?: boolean
}

function GoalItem({
  goal,
  onComplete,
  onUncomplete,
  canUnmark,
  isExpanded,
  onToggleExpand,
  onAddMission,
  onRemoveMission,
  onDelete,
  missions,
  canEdit,
  canDelete,
}: GoalItemProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const { data: progress } = useGoalProgress(goal.id)
  const hasLinkedMissions = progress && progress.totalMissions > 0

  const handleClick = () => {
    if (goal.is_completed && canUnmark && onUncomplete) {
      onUncomplete(goal.id)
    } else if (!goal.is_completed) {
      onComplete(goal.id)
    }
  }

  const handleDelete = () => {
    if (onDelete) {
      onDelete(goal.id)
    }
    setShowDeleteConfirm(false)
  }

  // Get linked missions with their details
  const linkedMissions = goal.items.filter(item => item.mission_id)

  return (
    <div className={`${styles.goalItem} ${goal.is_completed ? styles.completed : ''}`}>
      {/* Show completion ring for goals with linked missions, checkbox otherwise */}
      {hasLinkedMissions && !goal.is_completed ? (
        <CompletionRing percentage={progress.percentComplete} size={36} strokeWidth={3} />
      ) : (
        <button
          className={`${styles.checkbox} ${goal.is_completed ? styles.checked : ''}`}
          onClick={handleClick}
          disabled={goal.is_completed && !canUnmark}
          aria-label={goal.is_completed ? (canUnmark ? 'Unmark as complete' : 'Completed') : 'Mark as complete'}
        >
          {goal.is_completed && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </button>
      )}
      <div className={styles.goalContent}>
        <div className={styles.goalHeader}>
          <span className={`${styles.goalTitle} ${goal.is_completed ? styles.completedText : ''}`}>
            {goal.title}
          </span>
          {onToggleExpand && (
            <button
              className={styles.expandButton}
              onClick={onToggleExpand}
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          )}
        </div>
        {goal.description_md && (
          <span className={styles.goalDescription}>{goal.description_md}</span>
        )}
        {/* Show progress bar for goals with linked missions */}
        {hasLinkedMissions && !goal.is_completed && (
          <GoalProgressBar goalId={goal.id} />
        )}

        {/* Expanded content: Show linked missions */}
        {isExpanded && (
          <div className={styles.linkedMissions}>
            <div className={styles.linkedMissionsHeader}>
              <span className={styles.linkedMissionsTitle}>Linked Missions</span>
              {canEdit && !goal.is_completed && onAddMission && (
                <button className={styles.addMissionButton} onClick={onAddMission}>
                  + Add Mission
                </button>
              )}
            </div>
            {linkedMissions.length === 0 ? (
              <div className={styles.noMissions}>
                <span>No missions linked yet</span>
                {canEdit && !goal.is_completed && onAddMission && (
                  <Button size="sm" variant="secondary" onClick={onAddMission}>
                    Add First Mission
                  </Button>
                )}
              </div>
            ) : (
              <ul className={styles.missionList}>
                {linkedMissions.map(item => {
                  const missionData = missions?.get(item.mission_id!)
                  return (
                    <li key={item.id} className={styles.linkedMissionItem}>
                      <span className={styles.linkedMissionIcon}>
                        {missionData?.icon || '📋'}
                      </span>
                      <span className={styles.linkedMissionTitle}>
                        {missionData?.title || 'Unknown Mission'}
                      </span>
                      {canEdit && !goal.is_completed && onRemoveMission && (
                        <button
                          className={styles.removeMissionButton}
                          onClick={() => onRemoveMission(item.id)}
                          aria-label="Remove mission"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}

            {/* Delete Section */}
            {canDelete && (
              <div className={styles.deleteSection}>
                {showDeleteConfirm ? (
                  <div className={styles.deleteConfirm}>
                    <span className={styles.deleteConfirmText}>
                      Delete this {goal.goal_type === 'destiny' ? 'destiny' : 'quest'}?
                    </span>
                    <div className={styles.deleteConfirmActions}>
                      <Button size="sm" variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
                        Cancel
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleDelete} className={styles.deleteConfirmButton}>
                        Delete
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    className={styles.deleteButton}
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    Delete {goal.goal_type === 'destiny' ? 'Destiny' : 'Quest'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function GoalsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('destinies')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newGoalTitle, setNewGoalTitle] = useState('')
  const [newGoalDescription, setNewGoalDescription] = useState('')
  const [expandedGoalIds, setExpandedGoalIds] = useState<Set<string>>(new Set())
  const [missionPickerGoalId, setMissionPickerGoalId] = useState<string | null>(null)

  const { user } = useAuth()
  const { canCreateDestiny, canCreateQuest, canUnmarkGoal, isEmily, isSupport, isJoey } = usePermissions()

  const { data: destinies, isLoading: destiniesLoading, error: destiniesError } = useDestinies()
  const { data: quests, isLoading: questsLoading, error: questsError } = useQuests()
  const { data: allMissions } = useAllMissions()
  const createGoal = useCreateGoal()
  const updateGoal = useUpdateGoal()
  const deleteGoal = useDeleteGoal()
  const addGoalItem = useAddGoalItem()
  const removeGoalItem = useRemoveGoalItem()

  // Create a map of mission_id -> mission details for quick lookup
  const missionsMap = new Map(
    allMissions?.map(m => [m.id, { title: m.title, icon: m.category?.icon || null }]) ?? []
  )

  const toggleGoalExpanded = (goalId: string) => {
    setExpandedGoalIds(prev => {
      const next = new Set(prev)
      if (next.has(goalId)) {
        next.delete(goalId)
      } else {
        next.add(goalId)
      }
      return next
    })
  }

  const handleAddMissionToGoal = async (missionId: string) => {
    if (!missionPickerGoalId) return
    await addGoalItem.mutateAsync({
      goal_id: missionPickerGoalId,
      mission_id: missionId,
    })
  }

  const handleRemoveMissionFromGoal = async (goalId: string, itemId: string) => {
    await removeGoalItem.mutateAsync({ goalId, itemId })
  }

  // Get excluded mission IDs for the mission picker
  const getExcludedMissionIds = (goalId: string) => {
    const goal = [...(destinies || []), ...(quests || [])].find(g => g.id === goalId)
    if (!goal) return []
    return goal.items.filter(item => item.mission_id).map(item => item.mission_id!)
  }

  const isLoading = activeTab === 'destinies' ? destiniesLoading : questsLoading
  const goals = activeTab === 'destinies' ? destinies : quests
  const error = activeTab === 'destinies' ? destiniesError : questsError
  const canCreate = activeTab === 'destinies' ? canCreateDestiny : canCreateQuest

  const handleCreateGoal = async () => {
    if (!user || !newGoalTitle.trim()) return

    const newGoal = await createGoal.mutateAsync({
      owner_user_id: user.id,
      created_by_user_id: user.id,
      title: newGoalTitle.trim(),
      description_md: newGoalDescription.trim() || null,
      goal_type: activeTab === 'destinies' ? 'destiny' : 'quest',
    })

    // Auto-expand the new goal and open mission picker
    if (newGoal) {
      setExpandedGoalIds(prev => new Set([...prev, newGoal.id]))
      setMissionPickerGoalId(newGoal.id)
    }

    setNewGoalTitle('')
    setNewGoalDescription('')
    setShowAddForm(false)
  }

  const handleComplete = async (goalId: string) => {
    await updateGoal.mutateAsync({
      goalId,
      updates: { is_completed: true },
    })
  }

  const handleUncomplete = async (goalId: string) => {
    await updateGoal.mutateAsync({
      goalId,
      updates: { is_completed: false },
    })
  }

  const handleDeleteGoal = async (goalId: string) => {
    await deleteGoal.mutateAsync(goalId)
    // Remove from expanded set if it was expanded
    setExpandedGoalIds(prev => {
      const next = new Set(prev)
      next.delete(goalId)
      return next
    })
  }

  // Determine delete permissions
  // Destinies: Emily and Joey can delete
  // Quests: Support and Joey can delete
  const canDeleteDestiny = isEmily || isJoey
  const canDeleteQuest = isSupport || isJoey

  const activeGoals = goals?.filter(g => !g.is_completed) || []
  const completedGoals = goals?.filter(g => g.is_completed) || []

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Goals</h1>
      </header>

      {/* Tab Navigation */}
      <div className={styles.tabs}>
        <button
          className={cn(styles.tab, activeTab === 'destinies' && styles.activeTab)}
          onClick={() => setActiveTab('destinies')}
        >
          <span className={styles.tabIcon}>⭐</span>
          Destinies
        </button>
        <button
          className={cn(styles.tab, activeTab === 'quests' && styles.activeTab)}
          onClick={() => setActiveTab('quests')}
        >
          <span className={styles.tabIcon}>🗺️</span>
          Quests
        </button>
      </div>

      {/* Error Display */}
      {error && <ErrorCard error={error} resourceName="goals" />}

      {/* Tab Content */}
      <section className={styles.section}>
        {isLoading ? (
          <Card>
            <CardContent>
              <div className={styles.loadingContainer}>
                <LoadingSpinner />
              </div>
            </CardContent>
          </Card>
        ) : !goals || goals.length === 0 ? (
          <Card>
            <CardContent>
              <EmptyState
                icon={
                  activeTab === 'destinies' ? (
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  ) : (
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  )
                }
                title={activeTab === 'destinies' ? 'No destinies yet' : 'No quests yet'}
                description={
                  activeTab === 'destinies'
                    ? isEmily
                      ? "Destinies are your personal goals. Create one to get started!"
                      : "Emily hasn't created any destinies yet."
                    : isSupport
                    ? "Create quests to help guide Emily on her journey."
                    : "No quests have been assigned yet."
                }
                action={
                  canCreate ? (
                    <Button size="sm" onClick={() => setShowAddForm(true)}>
                      Create {activeTab === 'destinies' ? 'Destiny' : 'Quest'}
                    </Button>
                  ) : undefined
                }
              />
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Active Goals */}
            {activeGoals.length > 0 && (
              <Card>
                <CardContent>
                  <div className={styles.goalList}>
                    {activeGoals.map(goal => (
                      <GoalItem
                        key={goal.id}
                        goal={goal}
                        onComplete={handleComplete}
                        onUncomplete={handleUncomplete}
                        canUnmark={canUnmarkGoal}
                        isExpanded={expandedGoalIds.has(goal.id)}
                        onToggleExpand={() => toggleGoalExpanded(goal.id)}
                        onAddMission={() => setMissionPickerGoalId(goal.id)}
                        onRemoveMission={(itemId) => handleRemoveMissionFromGoal(goal.id, itemId)}
                        onDelete={handleDeleteGoal}
                        missions={missionsMap}
                        canEdit={activeTab === 'destinies' ? isEmily : isSupport}
                        canDelete={activeTab === 'destinies' ? canDeleteDestiny : canDeleteQuest}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Completed Goals */}
            {completedGoals.length > 0 && (
              <div className={styles.completedSection}>
                <h3 className={styles.sectionTitle}>Completed</h3>
                <Card variant="outlined">
                  <CardContent>
                    <div className={styles.goalList}>
                      {completedGoals.map(goal => (
                        <GoalItem
                          key={goal.id}
                          goal={goal}
                          onComplete={handleComplete}
                          onUncomplete={handleUncomplete}
                          canUnmark={canUnmarkGoal}
                          isExpanded={expandedGoalIds.has(goal.id)}
                          onToggleExpand={() => toggleGoalExpanded(goal.id)}
                          onDelete={handleDeleteGoal}
                          missions={missionsMap}
                          canEdit={false}
                          canDelete={activeTab === 'destinies' ? canDeleteDestiny : canDeleteQuest}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Add Button */}
            {canCreate && !showAddForm && (
              <Button
                variant="secondary"
                onClick={() => setShowAddForm(true)}
                className={styles.addButton}
              >
                + Add {activeTab === 'destinies' ? 'Destiny' : 'Quest'}
              </Button>
            )}
          </>
        )}

        {/* Add Form */}
        {showAddForm && (
          <Card className={styles.addForm}>
            <CardContent>
              <input
                type="text"
                className={styles.input}
                placeholder={`New ${activeTab === 'destinies' ? 'destiny' : 'quest'} title...`}
                value={newGoalTitle}
                onChange={(e) => setNewGoalTitle(e.target.value)}
                autoFocus
              />
              <textarea
                className={styles.textarea}
                placeholder="Description (optional)"
                value={newGoalDescription}
                onChange={(e) => setNewGoalDescription(e.target.value)}
                rows={3}
              />
              <div className={styles.addFormActions}>
                <Button variant="ghost" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateGoal}
                  disabled={!newGoalTitle.trim() || createGoal.isPending}
                >
                  {createGoal.isPending ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Sticker Shop Link */}
      <Card variant="outlined" className={styles.shopCard}>
        <CardContent>
          <div className={styles.shopContent}>
            <span className={styles.shopIcon}>🏪</span>
            <div className={styles.shopText}>
              <h3 className={styles.shopTitle}>Sticker Shop</h3>
              <p className={styles.shopDescription}>Use coins to buy stickers</p>
            </div>
            <Link to="/shop">
              <Button variant="secondary" size="sm">
                Visit Shop
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Mission Picker Modal */}
      <MissionPickerModal
        isOpen={!!missionPickerGoalId}
        onClose={() => setMissionPickerGoalId(null)}
        onSelect={handleAddMissionToGoal}
        excludeMissionIds={missionPickerGoalId ? getExcludedMissionIds(missionPickerGoalId) : []}
        title={`Add Mission to ${activeTab === 'destinies' ? 'Destiny' : 'Quest'}`}
      />
    </div>
  )
}
