import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { AppLayout } from '@/components/layout/AppLayout'
import {
  useIsAdmin,
  usePatientsForImpersonation,
  useFeatureModules,
  useToggleFeatureModule,
  useAuditLog,
} from '@/hooks/useAdmin'
import { useStoreItems, useCoinBalance, useCreateSticker } from '@/hooks/useStore'
import { useStreaks, useCreateStreak } from '@/hooks/useStreaks'
import { supabase } from '@/lib/supabase'
import styles from './Admin.module.css'

function AwardCoinsForm() {
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage(null)

    try {
      const { data, error } = await supabase.rpc('add_coins', {
        p_delta: parseInt(amount),
        p_reason: 'admin_grant',
        p_notes: reason || 'Admin awarded coins',
      })

      if (error) throw error
      const result = data as { success: boolean; new_balance?: number; error?: string }

      if (!result.success) {
        throw new Error(result.error || 'Failed to award coins')
      }

      setMessage({ type: 'success', text: `Awarded ${amount} coins! New balance: ${result.new_balance}` })
      setAmount('')
      setReason('')
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to award coins' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h3 className={styles.formTitle}>Award Coins</h3>
      <div className={styles.formRow}>
        <label className={styles.label}>
          Amount
          <input
            type="number"
            className={styles.input}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="1"
            required
          />
        </label>
        <label className={styles.label}>
          Reason
          <input
            type="text"
            className={styles.input}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Optional note"
          />
        </label>
      </div>
      <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
        {isSubmitting ? 'Awarding...' : 'Award Coins'}
      </button>
      {message && (
        <p className={`${styles.message} ${message.type === 'error' ? styles.error : styles.success}`}>
          {message.text}
        </p>
      )}
    </form>
  )
}

function CreateStickerForm() {
  const createSticker = useCreateSticker()
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('')
  const [cost, setCost] = useState('10')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    createSticker.mutate(
      {
        name,
        asset_key: emoji,
        coin_cost: parseInt(cost),
      },
      {
        onSuccess: () => {
          setName('')
          setEmoji('')
          setCost('10')
        },
      }
    )
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h3 className={styles.formTitle}>Create Sticker</h3>
      <div className={styles.formRow}>
        <label className={styles.label}>
          Name
          <input
            type="text"
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Rainbow Star"
            required
          />
        </label>
        <label className={styles.label}>
          Emoji
          <input
            type="text"
            className={styles.input}
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            placeholder="⭐"
            required
          />
        </label>
        <label className={styles.label}>
          Cost
          <input
            type="number"
            className={styles.input}
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            min="1"
            required
          />
        </label>
      </div>
      <button type="submit" className={styles.submitButton} disabled={createSticker.isPending}>
        {createSticker.isPending ? 'Creating...' : 'Create Sticker'}
      </button>
      {createSticker.isError && (
        <p className={`${styles.message} ${styles.error}`}>
          {createSticker.error instanceof Error ? createSticker.error.message : 'Failed to create sticker'}
        </p>
      )}
      {createSticker.isSuccess && (
        <p className={`${styles.message} ${styles.success}`}>Sticker created!</p>
      )}
    </form>
  )
}

function CreateStreakForm() {
  const createStreak = useCreateStreak()
  const [name, setName] = useState('')
  const [period, setPeriod] = useState<'daily' | 'weekly'>('daily')
  const [template, setTemplate] = useState<'complete_n_filtered' | 'complete_any_filtered' | 'perfect_must_do'>('complete_any_filtered')
  const [coinReward, setCoinReward] = useState('5')
  const [countThreshold, setCountThreshold] = useState('1')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    createStreak.mutate(
      {
        name,
        template_key: template,
        period,
        coin_reward: parseInt(coinReward),
        count_threshold: template === 'complete_n_filtered' ? parseInt(countThreshold) : undefined,
      },
      {
        onSuccess: () => {
          setName('')
          setCoinReward('5')
          setCountThreshold('1')
        },
      }
    )
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h3 className={styles.formTitle}>Create Streak</h3>
      <div className={styles.formRow}>
        <label className={styles.label}>
          Name
          <input
            type="text"
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Daily Tasks"
            required
          />
        </label>
        <label className={styles.label}>
          Period
          <select className={styles.select} value={period} onChange={(e) => setPeriod(e.target.value as 'daily' | 'weekly')}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </label>
      </div>
      <div className={styles.formRow}>
        <label className={styles.label}>
          Template
          <select className={styles.select} value={template} onChange={(e) => setTemplate(e.target.value as typeof template)}>
            <option value="complete_any_filtered">Complete any task</option>
            <option value="complete_n_filtered">Complete N tasks</option>
            <option value="perfect_must_do">All must-do tasks</option>
          </select>
        </label>
        {template === 'complete_n_filtered' && (
          <label className={styles.label}>
            Tasks Required
            <input
              type="number"
              className={styles.input}
              value={countThreshold}
              onChange={(e) => setCountThreshold(e.target.value)}
              min="1"
              required
            />
          </label>
        )}
        <label className={styles.label}>
          Coin Reward
          <input
            type="number"
            className={styles.input}
            value={coinReward}
            onChange={(e) => setCoinReward(e.target.value)}
            min="0"
            required
          />
        </label>
      </div>
      <button type="submit" className={styles.submitButton} disabled={createStreak.isPending}>
        {createStreak.isPending ? 'Creating...' : 'Create Streak'}
      </button>
      {createStreak.isError && (
        <p className={`${styles.message} ${styles.error}`}>
          {createStreak.error instanceof Error ? createStreak.error.message : 'Failed to create streak'}
        </p>
      )}
      {createStreak.isSuccess && (
        <p className={`${styles.message} ${styles.success}`}>Streak created!</p>
      )}
    </form>
  )
}

function StoreItemsList() {
  const { data: items = [], isLoading } = useStoreItems()

  if (isLoading) return <p className={styles.loading}>Loading store items...</p>

  return (
    <div className={styles.list}>
      <h3 className={styles.listTitle}>Store Items ({items.length})</h3>
      {items.length === 0 ? (
        <p className={styles.empty}>No store items yet</p>
      ) : (
        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <span>Type</span>
            <span>Name</span>
            <span>Cost</span>
          </div>
          {items.map((item) => (
            <div key={item.store_item_id} className={styles.tableRow}>
              <span>{item.type === 'sticker' ? '🎨' : item.type === 'consumable_token' ? '🛡️' : '📦'}</span>
              <span>{item.name}</span>
              <span>{item.coin_cost} coins</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StreaksList() {
  const { data: streaks = [], isLoading } = useStreaks()

  if (isLoading) return <p className={styles.loading}>Loading streaks...</p>

  return (
    <div className={styles.list}>
      <h3 className={styles.listTitle}>Active Streaks ({streaks.length})</h3>
      {streaks.length === 0 ? (
        <p className={styles.empty}>No streaks configured</p>
      ) : (
        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <span>Name</span>
            <span>Period</span>
            <span>Reward</span>
            <span>Current</span>
          </div>
          {streaks.map((streak) => (
            <div key={streak.streak_definition_id} className={styles.tableRow}>
              <span>{streak.name}</span>
              <span>{streak.period}</span>
              <span>{streak.coin_reward} coins</span>
              <span>{streak.state?.current_count || 0} day(s)</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PatientsList() {
  const { data: patients, refetch, isLoading } = usePatientsForImpersonation()

  return (
    <div className={styles.list}>
      <div className={styles.listHeader}>
        <h3 className={styles.listTitle}>Patients</h3>
        <button className={styles.refreshButton} onClick={() => refetch()}>
          Refresh
        </button>
      </div>
      {isLoading ? (
        <p className={styles.loading}>Loading...</p>
      ) : !patients || patients.length === 0 ? (
        <p className={styles.empty}>No patients found</p>
      ) : (
        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <span>Name</span>
            <span>Email</span>
          </div>
          {patients.map((patient) => (
            <div key={patient.patient_id} className={styles.tableRow}>
              <span>{patient.full_name}</span>
              <span>{patient.email}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function FeatureTogglesList() {
  const { data: modules = [], isLoading, refetch } = useFeatureModules()
  const toggleMutation = useToggleFeatureModule()

  const handleToggle = (featureKey: string, currentlyEnabled: boolean) => {
    toggleMutation.mutate({ featureKey, enabled: !currentlyEnabled })
  }

  if (isLoading) return <p className={styles.loading}>Loading feature modules...</p>

  return (
    <div className={styles.list}>
      <div className={styles.listHeader}>
        <h3 className={styles.listTitle}>Feature Toggles</h3>
        <button className={styles.refreshButton} onClick={() => refetch()}>
          Refresh
        </button>
      </div>
      {modules.length === 0 ? (
        <p className={styles.empty}>No feature modules found</p>
      ) : (
        <div className={styles.featureList}>
          {modules.map((module) => (
            <div key={module.feature_module_id} className={styles.featureItem}>
              <div className={styles.featureInfo}>
                <span className={styles.featureKey}>{module.key}</span>
                {module.description && (
                  <span className={styles.featureDescription}>{module.description}</span>
                )}
                {module.depends_on_module_keys && module.depends_on_module_keys.length > 0 && (
                  <span className={styles.featureDeps}>
                    Requires: {module.depends_on_module_keys.join(', ')}
                  </span>
                )}
              </div>
              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  checked={module.is_enabled}
                  onChange={() => handleToggle(module.key, module.is_enabled)}
                  disabled={toggleMutation.isPending}
                />
                <span className={styles.toggleSlider}></span>
              </label>
            </div>
          ))}
        </div>
      )}
      {toggleMutation.isError && (
        <p className={styles.message + ' ' + styles.error}>
          {toggleMutation.error instanceof Error ? toggleMutation.error.message : 'Failed to toggle feature'}
        </p>
      )}
    </div>
  )
}

function AuditLogViewer() {
  const [objectTypeFilter, setObjectTypeFilter] = useState<string>('')
  const [actionFilter, setActionFilter] = useState<string>('')

  const { data: entries = [], isLoading, refetch } = useAuditLog(
    50,
    0,
    objectTypeFilter || undefined,
    actionFilter || undefined
  )

  return (
    <div className={styles.list}>
      <div className={styles.listHeader}>
        <h3 className={styles.listTitle}>Audit Log</h3>
        <button className={styles.refreshButton} onClick={() => refetch()}>
          Refresh
        </button>
      </div>

      <div className={styles.filters}>
        <select
          className={styles.select}
          value={objectTypeFilter}
          onChange={(e) => setObjectTypeFilter(e.target.value)}
        >
          <option value="">All Types</option>
          <option value="task">Tasks</option>
          <option value="task_instance">Task Instances</option>
          <option value="event">Events</option>
          <option value="notification">Notifications</option>
          <option value="store_item">Store Items</option>
          <option value="streak_definition">Streaks</option>
        </select>
        <select
          className={styles.select}
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
        >
          <option value="">All Actions</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
        </select>
      </div>

      {isLoading ? (
        <p className={styles.loading}>Loading audit log...</p>
      ) : entries.length === 0 ? (
        <p className={styles.empty}>No audit entries found</p>
      ) : (
        <div className={styles.auditList}>
          {entries.map((entry) => (
            <div key={entry.audit_event_id} className={styles.auditEntry}>
              <div className={styles.auditHeader}>
                <span className={styles.auditAction + ' ' + styles['audit' + entry.action.charAt(0).toUpperCase() + entry.action.slice(1)]}>
                  {entry.action}
                </span>
                <span className={styles.auditType}>{entry.object_type}</span>
                <span className={styles.auditTime}>
                  {formatDistanceToNow(new Date(entry.occurred_at), { addSuffix: true })}
                </span>
              </div>
              <div className={styles.auditMeta}>
                <span>By: {entry.actor_email || 'System'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function Admin() {
  const { data: isAdmin, isLoading } = useIsAdmin()
  const { data: coinBalance } = useCoinBalance()
  const [activeTab, setActiveTab] = useState<'coins' | 'stickers' | 'streaks' | 'patients' | 'features' | 'audit'>('coins')

  if (isLoading) {
    return (
      <AppLayout>
        <div className={styles.container}>
          <p className={styles.loading}>Checking permissions...</p>
        </div>
      </AppLayout>
    )
  }

  if (!isAdmin) {
    return (
      <AppLayout>
        <div className={styles.container}>
          <div className={styles.accessDenied}>
            <span className={styles.accessDeniedIcon}>🚫</span>
            <h1>Access Denied</h1>
            <p>You need admin privileges to access this page.</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Admin Panel</h1>
          <div className={styles.coinDisplay}>
            <span className={styles.coinIcon}>🪙</span>
            <span>{coinBalance ?? 0} coins</span>
          </div>
        </header>

        <nav className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'coins' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('coins')}
          >
            Award Coins
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'stickers' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('stickers')}
          >
            Stickers
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'streaks' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('streaks')}
          >
            Streaks
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'patients' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('patients')}
          >
            Patients
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'features' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('features')}
          >
            Features
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'audit' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            Audit Log
          </button>
        </nav>

        <div className={styles.content}>
          {activeTab === 'coins' && <AwardCoinsForm />}

          {activeTab === 'stickers' && (
            <>
              <CreateStickerForm />
              <StoreItemsList />
            </>
          )}

          {activeTab === 'streaks' && (
            <>
              <CreateStreakForm />
              <StreaksList />
            </>
          )}

          {activeTab === 'patients' && <PatientsList />}

          {activeTab === 'features' && <FeatureTogglesList />}

          {activeTab === 'audit' && <AuditLogViewer />}
        </div>
      </div>
    </AppLayout>
  )
}
