import { useState, useMemo } from 'react'
import { Modal, Button, LoadingSpinner, EmptyState } from '@/components/ui'
import { AddMissionModal } from '@/components/missions'
import { useAllMissions } from '@/hooks/useMissions'
import type { MissionWithCategory } from '@/services/missions'
import styles from './MissionPickerModal.module.css'

interface MissionPickerModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (missionId: string) => void
  excludeMissionIds?: string[]
  title?: string
}

export function MissionPickerModal({
  isOpen,
  onClose,
  onSelect,
  excludeMissionIds = [],
  title = 'Add Mission',
}: MissionPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const { data: missions, isLoading } = useAllMissions()

  // Filter out excluded missions and apply search
  const filteredMissions = useMemo(() => {
    if (!missions) return []

    const excludeSet = new Set(excludeMissionIds)
    return missions.filter(mission => {
      // Exclude already-linked missions
      if (excludeSet.has(mission.id)) return false

      // Apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          mission.title.toLowerCase().includes(query) ||
          mission.category?.name?.toLowerCase().includes(query)
        )
      }

      return true
    })
  }, [missions, excludeMissionIds, searchQuery])

  const handleSelect = (missionId: string) => {
    onSelect(missionId)
    onClose()
  }

  const handleMissionCreated = (missionId: string) => {
    // When a new mission is created, select it and close both modals
    setShowCreateModal(false)
    onSelect(missionId)
    onClose()
  }

  return (
    <>
      <Modal isOpen={isOpen && !showCreateModal} onClose={onClose} title={title}>
        <div className={styles.content}>
          {/* Create New Mission Button */}
          <button
            className={styles.createNewButton}
            onClick={() => setShowCreateModal(true)}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Create New Mission</span>
          </button>

          <div className={styles.divider}>
            <span>or select existing</span>
          </div>

          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search missions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <div className={styles.missionList}>
            {isLoading ? (
              <div className={styles.loadingContainer}>
                <LoadingSpinner />
              </div>
            ) : filteredMissions.length === 0 ? (
              <EmptyState
                icon={
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                }
                title={searchQuery ? 'No matching missions' : 'No missions available'}
                description={
                  searchQuery
                    ? 'Try a different search term or create a new mission'
                    : excludeMissionIds.length > 0
                    ? 'All missions are already linked - create a new one above'
                    : 'Create a new mission using the button above'
                }
              />
            ) : (
              filteredMissions.map(mission => (
                <MissionOption
                  key={mission.id}
                  mission={mission}
                  onSelect={() => handleSelect(mission.id)}
                />
              ))
            )}
          </div>

          <div className={styles.actions}>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Mission Modal */}
      <AddMissionModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onMissionCreated={handleMissionCreated}
      />
    </>
  )
}

interface MissionOptionProps {
  mission: MissionWithCategory
  onSelect: () => void
}

function MissionOption({ mission, onSelect }: MissionOptionProps) {
  return (
    <button className={styles.missionOption} onClick={onSelect}>
      <span className={styles.missionIcon}>
        {mission.category?.icon || '📋'}
      </span>
      <div className={styles.missionContent}>
        <span className={styles.missionTitle}>{mission.title}</span>
        <span className={styles.missionMeta}>
          {mission.category?.name} • {mission.category?.vp_value ?? 0} VP
        </span>
      </div>
      <svg
        className={styles.addIcon}
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </button>
  )
}
