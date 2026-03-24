import { useState } from 'react'
import { useAuditLog, useAuditLogCount } from '@/hooks/use-admin'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp, ScrollText } from 'lucide-react'
import { format } from 'date-fns'

const ITEMS_PER_PAGE = 25

interface ExpandableRowProps {
  entry: {
    audit_event_id: string
    object_type: string
    object_id: string
    action: string
    actor_email: string | null
    field_changes: Record<string, unknown> | null
    occurred_at: string
  }
  isExpanded: boolean
  onToggle: () => void
}

function ExpandableRow({ entry, isExpanded, onToggle }: ExpandableRowProps) {
  return (
    <>
      <tr
        className="border-b border-border hover:bg-surface-sunken transition-colors cursor-pointer"
        onClick={onToggle}
      >
        <td className="px-4 py-3 text-xs text-content-secondary whitespace-nowrap">
          {format(new Date(entry.occurred_at), 'MMM d, HH:mm:ss')}
        </td>
        <td className="px-4 py-3 text-xs text-content truncate">
          {entry.actor_email || 'System'}
        </td>
        <td className="px-4 py-3 text-xs text-content capitalize">
          {entry.action}
        </td>
        <td className="px-4 py-3 text-xs text-content uppercase">
          {entry.object_type}
        </td>
        <td className="px-4 py-3 text-xs text-content-secondary font-mono truncate">
          {entry.object_id}
        </td>
        <td className="px-4 py-3 text-center">
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-content-muted" />
          ) : (
            <ChevronDown className="h-4 w-4 text-content-muted" />
          )}
        </td>
      </tr>
      {isExpanded && entry.field_changes && (
        <tr className="border-b border-border bg-surface-sunken">
          <td colSpan={6} className="px-4 py-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-content-secondary">Changes:</p>
              <pre className="text-xs bg-surface p-3 rounded border border-border overflow-x-auto text-content-muted">
                {JSON.stringify(entry.field_changes, null, 2)}
              </pre>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function AuditLogPage() {
  const [page, setPage] = useState(0)
  const [objectTypeFilter, setObjectTypeFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const { data: entries, isLoading } = useAuditLog(
    ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE,
    objectTypeFilter || undefined,
    actionFilter || undefined
  )
  const { data: totalCount } = useAuditLogCount(
    objectTypeFilter || undefined,
    actionFilter || undefined
  )

  const totalPages = totalCount ? Math.ceil(totalCount / ITEMS_PER_PAGE) : 0

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  // Extract unique object types and actions for filter dropdowns
  const objectTypes = new Set(entries?.map((e) => e.object_type) || [])
  const actions = new Set(entries?.map((e) => e.action) || [])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-12 bg-surface-sunken rounded animate-pulse" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 bg-surface-sunken rounded animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-full">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-accent-light rounded-soft">
            <ScrollText className="h-5 w-5 text-accent" />
          </div>
          <h2 className="text-lg font-semibold text-content">Audit Log</h2>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="space-y-2">
            <label className="text-xs font-medium text-content-secondary">
              Object Type
            </label>
            <select
              value={objectTypeFilter}
              onChange={(e) => {
                setObjectTypeFilter(e.target.value)
                setPage(0)
              }}
              className={cn(
                'w-full px-3 py-2 border border-border rounded-soft bg-surface',
                'text-content text-sm transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent'
              )}
            >
              <option value="">All Types</option>
              {Array.from(objectTypes).map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-content-secondary">
              Action
            </label>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value)
                setPage(0)
              }}
              className={cn(
                'w-full px-3 py-2 border border-border rounded-soft bg-surface',
                'text-content text-sm transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent'
              )}
            >
              <option value="">All Actions</option>
              {Array.from(actions).map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        {entries && entries.length > 0 ? (
          <>
            <div className="overflow-x-auto border border-border rounded-soft">
              <table className="w-full">
                <thead className="bg-surface-sunken border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-content-secondary">
                      Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-content-secondary">
                      Actor
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-content-secondary">
                      Action
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-content-secondary">
                      Object Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-content-secondary">
                      Object ID
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-content-secondary">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <ExpandableRow
                      key={entry.audit_event_id}
                      entry={entry}
                      isExpanded={expandedRows.has(entry.audit_event_id)}
                      onToggle={() => toggleRow(entry.audit_event_id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-6 flex items-center justify-between">
              <div className="text-xs text-content-secondary">
                Showing {page * ITEMS_PER_PAGE + 1} to{' '}
                {Math.min((page + 1) * ITEMS_PER_PAGE, totalCount || 0)} of{' '}
                {totalCount || 0} entries
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-2 px-3 text-sm">
                  Page {page + 1} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-content-secondary py-8 text-center">
            No audit log entries found
          </p>
        )}
      </Card>
    </div>
  )
}
