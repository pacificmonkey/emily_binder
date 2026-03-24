'use client'

import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { ListSkeleton } from '@/components/shared/loading-skeleton'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { NotificationItem } from '@/components/notifications/notification-item'
import {
  useNotifications,
  useDismissNotification,
  useAcknowledgeNotification,
  useSnoozeNotification,
  useDismissAllNotifications,
} from '@/hooks/use-notifications'

const NOTIFICATION_TYPES = [
  { id: 'all', label: 'All' },
  { id: 'reminder', label: 'Events' },
  { id: 'dose_reminder', label: 'Medications' },
  { id: 'low_stock', label: 'Stock Alerts' },
  { id: 'info', label: 'Info' },
]


export default function NotificationsPage() {
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [showDismissed, setShowDismissed] = useState(false)
  const [confirmDismissAll, setConfirmDismissAll] = useState(false)
  const [page, setPage] = useState(0)

  const { data: notifications = [], isLoading } = useNotifications(250, showDismissed)
  const dismissMutation = useDismissNotification()
  const acknowledgeMutation = useAcknowledgeNotification()
  const snoozeMutation = useSnoozeNotification()
  const dismissAllMutation = useDismissAllNotifications()

  // Filter and paginate notifications
  const filtered = useMemo(() => {
    let result = notifications

    if (selectedFilter !== 'all') {
      result = result.filter((n) => n.type === selectedFilter)
    }

    return result
  }, [notifications, selectedFilter])

  // Count by type
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: notifications.length }

    NOTIFICATION_TYPES.slice(1).forEach((type) => {
      counts[type.id] = notifications.filter((n) => n.type === type.id).length
    })

    return counts
  }, [notifications])

  // Paginate
  const ITEMS_PER_PAGE = 20
  const paginatedNotifications = filtered.slice(
    0,
    (page + 1) * ITEMS_PER_PAGE
  )
  const hasMore = filtered.length > (page + 1) * ITEMS_PER_PAGE

  const handleDismiss = (id: string) => {
    dismissMutation.mutate(id)
  }

  const handleAcknowledge = (id: string) => {
    acknowledgeMutation.mutate(id)
  }

  const handleSnooze = (id: string, minutes: number) => {
    snoozeMutation.mutate({ id, minutes })
  }

  const handleDismissAll = () => {
    dismissAllMutation.mutate(undefined, {
      onSuccess: () => {
        setConfirmDismissAll(false)
      },
    })
  }

  const dismissAllAction = (
    <button
      onClick={() => setConfirmDismissAll(true)}
      className="px-4 py-2 text-sm font-medium text-accent hover:text-accent-hover rounded-soft transition-colors"
      disabled={dismissAllMutation.isPending}
    >
      {dismissAllMutation.isPending ? 'Dismissing...' : 'Dismiss all'}
    </button>
  )

  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" action={dismissAllAction} />

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {NOTIFICATION_TYPES.map((type) => (
          <button
            key={type.id}
            onClick={() => {
              setSelectedFilter(type.id)
              setPage(0)
            }}
            className={cn(
              'px-4 py-2 rounded-pill text-sm font-medium transition-colors',
              selectedFilter === type.id
                ? 'bg-accent text-accent-contrast'
                : 'bg-surface-sunken text-content hover:bg-surface-sunken/80'
            )}
          >
            {type.label}
            {typeCounts[type.id] > 0 && (
              <span className="ml-1.5 text-xs opacity-75">
                ({typeCounts[type.id]})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Show dismissed toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="show-dismissed"
          checked={showDismissed}
          onChange={(e) => {
            setShowDismissed(e.target.checked)
            setPage(0)
          }}
          className="rounded"
        />
        <label htmlFor="show-dismissed" className="text-sm text-content-secondary cursor-pointer">
          Show dismissed notifications
        </label>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <ListSkeleton count={5} />
      ) : paginatedNotifications.length === 0 ? (
        <EmptyState message="All caught up! No notifications." icon="✨" />
      ) : (
        <>
          {/* Notification list */}
          <div className="space-y-3">
            {paginatedNotifications.map((notification) => (
              <NotificationItem
                key={notification.notification_id}
                notification={notification}
                onDismiss={handleDismiss}
                onAcknowledge={handleAcknowledge}
                onSnooze={handleSnooze}
              />
            ))}
          </div>

          {/* Load more button */}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <button
                onClick={() => setPage(page + 1)}
                className="px-6 py-2 rounded-soft bg-accent text-accent-contrast hover:bg-accent-hover font-medium transition-colors"
              >
                Load more
              </button>
            </div>
          )}
        </>
      )}

      {/* Confirm dialog */}
      <ConfirmDialog
        open={confirmDismissAll}
        onOpenChange={setConfirmDismissAll}
        title="Dismiss all notifications?"
        description="This will dismiss all your notifications. You can still see them if you toggle 'Show dismissed'."
        confirmLabel="Dismiss all"
        onConfirm={handleDismissAll}
      />
    </div>
  )
}
