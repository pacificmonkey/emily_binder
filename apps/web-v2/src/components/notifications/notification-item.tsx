'use client'

import { useState } from 'react'
import { formatDistanceToNow, isPast } from 'date-fns'
import { cn } from '@/lib/utils'
import type { NotificationListItem } from '@/services/notifications'
import { useNavigate } from 'react-router-dom'

interface NotificationItemProps {
  notification: NotificationListItem
  onDismiss: (id: string) => void
  onAcknowledge: (id: string) => void
  onSnooze: (id: string, minutes: number) => void
  compact?: boolean
}

const notificationIcons: Record<string, string> = {
  reminder: '🔔',
  info: 'ℹ️',
  custom: '💬',
  dose_reminder: '💊',
  low_stock: '⚠️',
  refill_due: '🔄',
  missed_dose: '⏰',
  expiration: '📅',
  interaction_warning: '⚠️',
}

function NotificationIcon({ type }: { type: string }) {
  return <span className="text-xl">{notificationIcons[type] || '🔔'}</span>
}

function SnoozePill({
  id,
  minutes,
  onSnooze,
}: {
  id: string
  minutes: number
  onSnooze: (id: string, minutes: number) => void
}) {
  return (
    <button
      onClick={() => onSnooze(id, minutes)}
      className="text-sm px-3 py-1 rounded-pill bg-surface-sunken hover:bg-surface-sunken/80 text-content transition-colors"
    >
      {minutes === 60 ? '1 hour' : minutes === 240 ? '4 hours' : '1 day'}
    </button>
  )
}

function SnoozeDropdown({
  id,
  onSnooze,
}: {
  id: string
  onSnooze: (id: string, minutes: number) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="text-sm px-3 py-1 rounded-soft bg-surface-sunken hover:bg-surface-sunken/80 text-content transition-colors"
      >
        💤 Snooze
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-32 bg-surface border border-border rounded-soft shadow-raised z-10">
          <SnoozePill
            id={id}
            minutes={60}
            onSnooze={(id, minutes) => {
              onSnooze(id, minutes)
              setOpen(false)
            }}
          />
          <SnoozePill
            id={id}
            minutes={240}
            onSnooze={(id, minutes) => {
              onSnooze(id, minutes)
              setOpen(false)
            }}
          />
          <SnoozePill
            id={id}
            minutes={1440}
            onSnooze={(id, minutes) => {
              onSnooze(id, minutes)
              setOpen(false)
            }}
          />
        </div>
      )}
    </div>
  )
}

export function NotificationItem({
  notification,
  onDismiss,
  onAcknowledge,
  onSnooze,
  compact = false,
}: NotificationItemProps) {
  const navigate = useNavigate()
  const isAcknowledged = !!notification.acknowledged_at
  const isSnoozed = notification.snooze_until && isPast(new Date(notification.snooze_until)) === false

  const handleViewLink = () => {
    if (notification.link_type && notification.link_id) {
      navigate(`/${notification.link_type}/${notification.link_id}`)
    }
  }

  const handleTap = () => {
    if (!isAcknowledged) {
      onAcknowledge(notification.notification_id)
    }
  }

  if (compact) {
    return (
      <button
        onClick={handleTap}
        className={cn(
          'w-full text-left p-3 rounded-soft bg-surface-sunken hover:bg-surface-sunken/80 transition-colors border-l-2 border-transparent',
          !isAcknowledged && 'border-l-accent bg-surface-sunken'
        )}
      >
        <div className="flex items-start gap-3">
          <NotificationIcon type={notification.type} />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-content">{notification.title}</p>
            {notification.body && (
              <p className="text-xs text-content-secondary line-clamp-1">
                {notification.body}
              </p>
            )}
            <p className="text-xs text-content-muted mt-1">
              {formatDistanceToNow(new Date(notification.created_at), {
                addSuffix: true,
              })}
            </p>
          </div>
          {!isAcknowledged && (
            <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0 mt-1" />
          )}
        </div>
      </button>
    )
  }

  return (
    <div
      className={cn(
        'rounded-soft bg-surface shadow-soft p-4 border-l-4 border-transparent transition-shadow hover:shadow-raised',
        !isAcknowledged && 'border-l-accent',
        isSnoozed && 'opacity-75'
      )}
      onClick={handleTap}
    >
      <div className="flex items-start gap-3 mb-3">
        <NotificationIcon type={notification.type} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-content">{notification.title}</h3>
            {!isAcknowledged && (
              <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0 mt-1" />
            )}
          </div>
          {notification.body && (
            <p className="text-sm text-content-secondary mt-1">{notification.body}</p>
          )}
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-content-muted">
              {formatDistanceToNow(new Date(notification.created_at), {
                addSuffix: true,
              })}
            </span>
            {isSnoozed && notification.snooze_until && (
              <span className="text-xs text-content-muted">
                Snoozed until {formatDistanceToNow(new Date(notification.snooze_until), {
                  addSuffix: true,
                })}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-4">
        <button
          onClick={() => onDismiss(notification.notification_id)}
          className="text-sm px-3 py-1 rounded-soft hover:bg-surface-sunken text-content-secondary transition-colors"
          aria-label="Dismiss notification"
        >
          ✕
        </button>

        {!isSnoozed && (
          <SnoozeDropdown id={notification.notification_id} onSnooze={onSnooze} />
        )}

        {notification.link_type && notification.link_id && (
          <button
            onClick={handleViewLink}
            className="text-sm px-3 py-1 rounded-soft bg-accent text-accent-contrast hover:bg-accent-hover transition-colors ml-auto"
          >
            View
          </button>
        )}
      </div>
    </div>
  )
}
