'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { StatusBadge } from '@/components/shared/status-badge'
import { toast } from '@/components/ui/toaster'
import {
  useUpdateDiscussionStatus,
  useDeleteDiscussionItem,
} from '@/hooks/use-wellbeing'
import type { ProviderDiscussionItem, DiscussionItemStatus } from '@/types/database'


interface DiscussionItemProps {
  item: ProviderDiscussionItem
  onSuccess?: () => void
}

export const DiscussionItem = ({ item, onSuccess }: DiscussionItemProps) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [statusMenu, setStatusMenu] = useState(false)

  const updateStatus = useUpdateDiscussionStatus()
  const deleteItem = useDeleteDiscussionItem()

  const handleStatusChange = async (newStatus: DiscussionItemStatus) => {
    try {
      await updateStatus.mutateAsync({ id: item.discussion_item_id, status: newStatus })
      setStatusMenu(false)
      toast({ title: `Status updated to ${newStatus}` })
      onSuccess?.()
    } catch (error) {
      toast({ title: 'Failed to update status' })
      console.error('Error updating status:', error)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteItem.mutateAsync(item.discussion_item_id)
      setIsDeleteDialogOpen(false)
      toast({ title: 'Discussion item deleted' })
      onSuccess?.()
    } catch (error) {
      toast({ title: 'Failed to delete item' })
      console.error('Error deleting item:', error)
    }
  }

  const isLongDetails = item.details && item.details.length > 150

  return (
    <>
      <Card className="bg-surface p-4 shadow-soft">
        <div className="space-y-3">
          {/* Header: Title and Status */}
          <div className="flex items-start justify-between gap-3">
            <h3 className="flex-1 text-sm font-semibold text-content">
              {item.title}
            </h3>
            <StatusBadge variant="info" label={item.status} />
          </div>

          {/* Details */}
          {item.details && (
            <div>
              <p
                className={cn(
                  'text-sm text-text-content-secondary',
                  !isExpanded && isLongDetails && 'line-clamp-3'
                )}
              >
                {item.details}
              </p>
              {isLongDetails && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="mt-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  {isExpanded ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>
          )}

          {/* Linked Items */}
          <div className="flex flex-wrap gap-2">
            {item.provider_name && (
              <Badge variant="secondary" className="text-xs">
                Provider: {item.provider_name}
              </Badge>
            )}
            {item.event_title && (
              <Badge variant="secondary" className="text-xs">
                Event: {item.event_title}
                {item.event_starts_at && (
                  <>
                    {' '}
                    <span className="text-text-content-muted">
                      ({formatDistanceToNow(new Date(item.event_starts_at), {
                        addSuffix: false,
                      })})
                    </span>
                  </>
                )}
              </Badge>
            )}
          </div>

          {/* Timestamp */}
          <p className="text-xs text-text-content-muted">
            Created {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
          </p>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 border-t border-gray-200 pt-3">
            {/* Status Actions */}
            <div className="relative">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setStatusMenu(!statusMenu)}
                className="text-xs"
              >
                Change Status
              </Button>
              {statusMenu && (
                <div className="absolute left-0 top-full z-10 mt-1 flex flex-col rounded-soft border border-gray-200 bg-white shadow-raised">
                  {(['open', 'discussed', 'resolved', 'archived'] as const).map(
                    (status) => (
                      <button
                        key={status}
                        onClick={() => handleStatusChange(status)}
                        disabled={
                          status === item.status ||
                          updateStatus.isPending
                        }
                        className={cn(
                          'px-3 py-2 text-left text-xs font-medium transition-colors first:rounded-t-soft last:rounded-b-soft',
                          status === item.status
                            ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                            : 'hover:bg-gray-50 text-content'
                        )}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </button>
                    )
                  )}
                </div>
              )}
            </div>

            <Button
              size="sm"
              variant="destructive"
              onClick={() => setIsDeleteDialogOpen(true)}
              disabled={deleteItem.isPending}
              className="text-xs"
            >
              Delete
            </Button>
          </div>
        </div>
      </Card>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete Discussion Item?"
        description="This action cannot be undone. The discussion item will be permanently deleted."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
      />
    </>
  )
}
