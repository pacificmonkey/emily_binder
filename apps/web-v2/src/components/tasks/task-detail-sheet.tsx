import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { X, Trash2, Archive, Clock } from 'lucide-react'

interface TaskDetailSheetProps {
  task: any
  onClose: () => void
  onDelete?: (taskId: string) => void
  onArchive?: (taskId: string) => void
}

export function TaskDetailSheet({ task, onClose, onDelete, onArchive }: TaskDetailSheetProps) {
  if (!task) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative z-50 w-full max-w-lg rounded-t-2xl bg-surface p-6 sm:rounded-soft max-h-[80vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-label={`Task: ${task.title}`}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-content">{task.title}</h2>
            {task.category_name && (
              <div className="mt-1 flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: task.category_color }}
                  aria-hidden="true"
                />
                <span className="text-sm text-content-secondary">{task.category_name}</span>
              </div>
            )}
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-surface-sunken" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Meta */}
        <div className="flex flex-wrap gap-2 mb-4">
          {task.difficulty && (
            <Badge variant={task.difficulty === 'easy' ? 'secondary' : task.difficulty === 'hard' ? 'danger' : 'warning'}>
              {task.difficulty}
            </Badge>
          )}
          {task.points != null && <Badge variant="default">{task.points} VP</Badge>}
          {task.must_do && <Badge variant="danger">must-do</Badge>}
          {task.status === 'completed' && <Badge variant="success">done</Badge>}
        </div>

        {/* Description */}
        {task.description && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-content-secondary mb-1">Description</h3>
            <p className="text-sm text-content">{task.description}</p>
          </div>
        )}

        {/* Sub-steps */}
        {task.sub_steps && task.sub_steps.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-content-secondary mb-2">Steps</h3>
            <div className="space-y-2">
              {task.sub_steps.map((step: any) => (
                <label key={step.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={step.completed} readOnly className="h-4 w-4 rounded" />
                  <span className={step.completed ? 'text-content-muted line-through' : 'text-content'}>
                    {step.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Completion info */}
        {task.completed_at && (
          <div className="mb-4 flex items-center gap-2 text-xs text-content-muted">
            <Clock className="h-3.5 w-3.5" />
            Completed {format(new Date(task.completed_at), "MMM d 'at' h:mm a")}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t border-border">
          {onArchive && (
            <Button variant="outline" size="sm" onClick={() => onArchive(task.task_id)}>
              <Archive className="h-4 w-4 mr-1" /> Archive
            </Button>
          )}
          {onDelete && (
            <Button variant="destructive" size="sm" onClick={() => onDelete(task.task_id)}>
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
