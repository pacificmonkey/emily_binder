import { useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import {
  useRecentSymptoms,
  useDiscussionItems,
  useDeleteSymptomEntry,
  useUpdateDiscussionItemStatus,
  useDeleteDiscussionItem,
} from '@/hooks/useWellbeing'
import { LogSymptomModal, AddDiscussionItemModal } from '@/components/wellbeing'
import type { DiscussionItemStatus } from '@/types/database'
import styles from './Wellbeing.module.css'

const domainLabels: Record<string, string> = {
  physical: 'Physical',
  mental: 'Mental',
  sensory: 'Sensory',
  sleep: 'Sleep',
  other: 'Other',
}

const domainIcons: Record<string, string> = {
  physical: '💪',
  mental: '🧠',
  sensory: '👁️',
  sleep: '😴',
  other: '📋',
}

function formatDate(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

type TabType = 'symptoms' | 'discussions'

export function Wellbeing() {
  const [activeTab, setActiveTab] = useState<TabType>('symptoms')
  const [showLogSymptom, setShowLogSymptom] = useState(false)
  const [showAddDiscussion, setShowAddDiscussion] = useState(false)

  const { data: symptoms = [], isLoading: loadingSymptoms, error: symptomsError } = useRecentSymptoms()
  const { data: discussions = [], isLoading: loadingDiscussions, error: discussionsError } = useDiscussionItems()

  const deleteSymptom = useDeleteSymptomEntry()
  const updateDiscussionStatus = useUpdateDiscussionItemStatus()
  const deleteDiscussion = useDeleteDiscussionItem()

  const handleDeleteSymptom = async (symptomEntryId: string) => {
    if (!confirm('Delete this symptom entry?')) return
    try {
      await deleteSymptom.mutateAsync(symptomEntryId)
    } catch (err) {
      console.error('Failed to delete symptom:', err)
    }
  }

  const handleUpdateDiscussionStatus = async (
    discussionItemId: string,
    status: DiscussionItemStatus
  ) => {
    try {
      await updateDiscussionStatus.mutateAsync({ discussionItemId, status })
    } catch (err) {
      console.error('Failed to update discussion status:', err)
    }
  }

  const handleDeleteDiscussion = async (discussionItemId: string) => {
    if (!confirm('Delete this discussion item?')) return
    try {
      await deleteDiscussion.mutateAsync(discussionItemId)
    } catch (err) {
      console.error('Failed to delete discussion:', err)
    }
  }

  const openDiscussions = discussions.filter(d => d.status === 'open')
  const otherDiscussions = discussions.filter(d => d.status !== 'open')

  return (
    <AppLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Wellbeing</h1>
        </header>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'symptoms' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('symptoms')}
          >
            Symptoms
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'discussions' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('discussions')}
          >
            Provider Topics
          </button>
        </div>

        {activeTab === 'symptoms' && (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Recent Symptoms</h2>
              <button
                className={styles.addButton}
                onClick={() => setShowLogSymptom(true)}
              >
                + Log Symptom
              </button>
            </div>

            {symptomsError && (
              <div className={styles.error}>
                Failed to load symptoms. Please try again.
              </div>
            )}

            {loadingSymptoms ? (
              <div className={styles.loading}>Loading symptoms...</div>
            ) : symptoms.length === 0 ? (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>📋</div>
                <p className={styles.emptyText}>No symptoms logged yet</p>
                <button
                  className={styles.emptyAddButton}
                  onClick={() => setShowLogSymptom(true)}
                >
                  Log your first symptom
                </button>
              </div>
            ) : (
              <div className={styles.list}>
                {symptoms.map((symptom) => (
                  <div key={symptom.symptom_entry_id} className={styles.symptomCard}>
                    <div className={styles.symptomHeader}>
                      <div>
                        <h3 className={styles.symptomLabel}>
                          {domainIcons[symptom.domain]} {symptom.label}
                        </h3>
                        <span className={styles.symptomTime}>
                          {formatDate(symptom.occurred_at)}
                        </span>
                      </div>
                      <button
                        className={styles.deleteButton}
                        onClick={() => handleDeleteSymptom(symptom.symptom_entry_id)}
                        title="Delete"
                      >
                        &times;
                      </button>
                    </div>
                    <div className={styles.symptomMeta}>
                      <span className={`${styles.badge} ${styles.domainBadge}`}>
                        {domainLabels[symptom.domain]}
                      </span>
                      <span className={`${styles.badge} ${styles.severityBadge} ${styles[symptom.severity]}`}>
                        {symptom.severity.charAt(0).toUpperCase() + symptom.severity.slice(1)}
                      </span>
                      {symptom.duration_minutes && (
                        <span className={`${styles.badge} ${styles.severityBadge}`}>
                          {symptom.duration_minutes} min
                        </span>
                      )}
                    </div>
                    {(symptom.possible_trigger || symptom.what_helped || symptom.notes) && (
                      <div className={styles.symptomDetails}>
                        {symptom.possible_trigger && (
                          <p className={styles.symptomDetail}>
                            <strong>Trigger:</strong> {symptom.possible_trigger}
                          </p>
                        )}
                        {symptom.what_helped && (
                          <p className={styles.symptomDetail}>
                            <strong>What helped:</strong> {symptom.what_helped}
                          </p>
                        )}
                        {symptom.notes && (
                          <p className={styles.symptomDetail}>
                            <strong>Notes:</strong> {symptom.notes}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'discussions' && (
          <>
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>To Discuss</h2>
                <button
                  className={styles.addButton}
                  onClick={() => setShowAddDiscussion(true)}
                >
                  + Add Topic
                </button>
              </div>

              {discussionsError && (
                <div className={styles.error}>
                  Failed to load discussion items. Please try again.
                </div>
              )}

              {loadingDiscussions ? (
                <div className={styles.loading}>Loading discussion items...</div>
              ) : openDiscussions.length === 0 ? (
                <div className={styles.empty}>
                  <div className={styles.emptyIcon}>💬</div>
                  <p className={styles.emptyText}>No topics to discuss</p>
                  <button
                    className={styles.emptyAddButton}
                    onClick={() => setShowAddDiscussion(true)}
                  >
                    Add a topic
                  </button>
                </div>
              ) : (
                <div className={styles.list}>
                  {openDiscussions.map((item) => (
                    <div key={item.discussion_item_id} className={styles.discussionCard}>
                      <div className={styles.discussionHeader}>
                        <h3 className={styles.discussionTitle}>{item.title}</h3>
                        <button
                          className={styles.deleteButton}
                          onClick={() => handleDeleteDiscussion(item.discussion_item_id)}
                          title="Delete"
                        >
                          &times;
                        </button>
                      </div>
                      {item.details && (
                        <p className={styles.discussionDetails}>{item.details}</p>
                      )}
                      <div className={styles.discussionMeta}>
                        <span className={`${styles.statusBadge} ${styles[item.status]}`}>
                          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                        </span>
                        {item.provider_name && (
                          <span className={`${styles.badge} ${styles.providerBadge}`}>
                            {item.provider_name}
                          </span>
                        )}
                      </div>
                      <div className={styles.discussionActions}>
                        <button
                          className={`${styles.actionButton} ${styles.primary}`}
                          onClick={() => handleUpdateDiscussionStatus(item.discussion_item_id, 'discussed')}
                        >
                          Mark Discussed
                        </button>
                        <button
                          className={styles.actionButton}
                          onClick={() => handleUpdateDiscussionStatus(item.discussion_item_id, 'resolved')}
                        >
                          Resolved
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {otherDiscussions.length > 0 && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Past Topics</h2>
                <div className={styles.list}>
                  {otherDiscussions.map((item) => (
                    <div key={item.discussion_item_id} className={styles.discussionCard}>
                      <div className={styles.discussionHeader}>
                        <h3 className={styles.discussionTitle}>{item.title}</h3>
                        <button
                          className={styles.deleteButton}
                          onClick={() => handleDeleteDiscussion(item.discussion_item_id)}
                          title="Delete"
                        >
                          &times;
                        </button>
                      </div>
                      {item.details && (
                        <p className={styles.discussionDetails}>{item.details}</p>
                      )}
                      <div className={styles.discussionMeta}>
                        <span className={`${styles.statusBadge} ${styles[item.status]}`}>
                          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                        </span>
                      </div>
                      {item.status !== 'open' && (
                        <div className={styles.discussionActions}>
                          <button
                            className={styles.actionButton}
                            onClick={() => handleUpdateDiscussionStatus(item.discussion_item_id, 'open')}
                          >
                            Reopen
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        <LogSymptomModal
          isOpen={showLogSymptom}
          onClose={() => setShowLogSymptom(false)}
        />

        <AddDiscussionItemModal
          isOpen={showAddDiscussion}
          onClose={() => setShowAddDiscussion(false)}
        />
      </div>
    </AppLayout>
  )
}
