import { useState, useRef } from 'react'
import { cn } from '@/lib/utils'
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'

interface TaskCardProps {
  task: {
    task_instance_id: string
    task_id: string
    title: string
    description?: string | null
    category_name?: string | null
    category_color?: string | null
    category_icon?: string | null
    difficulty?: string | null
    points?: number
    status: string
    must_do?: boolean
    sub_steps?: Array<{ id: string; label: string; completed: boolean }>
  }
  onComplete: (taskInstanceId: string) => void
  onUncomplete: (taskInstanceId: string) => void
  onTap?: (task: any) => void
  className?: string
}

const difficultyVariant: Record<string, 'secondary' | 'warning' | 'danger'> = {
  easy: 'secondary',
  medium: 'warning',
  hard: 'danger',
}

export function TaskCard({ task, onComplete, onUncomplete, onTap, className }: TaskCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [showPoints, setShowPoints] = useState(false)
  const reducedMotion = useReducedMotion()
  const isCompleted = task.status === 'completed'
  const checkboxRef = useRef<HTMLButtonElement>(null)

  const handleToggle = () => {
    if (isCompleted) {
      onUncomplete(task.task_instance_id)
    } else {
      onComplete(task.task_instance_id)
      setShowPoints(true)
      setTimeout(() => setShowPoints(false), 500)
    }
  }

  return (
    <div
      className={cn(
        'relative rounded-soft bg-surface shadow-soft p-4',
        'border-l-4 transition-shadow hover:shadow-raised',
        'focus-within:ring-2 focus-within:ring-accent',
        isCompleted && 'opacity-60',
        className
      )}
      style={{ borderLeftColor: task.category_color || 'hsl(var(--accent))' }}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          ref={checkboxRef}
          onClick={handleToggle}
          className={cn(
            'mt-0.5 flex h-6 w-6 min-h-[44px] min-w-[44px] items-center justify-center rounded border-2 transition-colors',
            '-m-[9px]', // Expand touch target without affecting layout
            isCompleted
              ? 'border-success bg-success text-white'
              : 'border-border hover:border-accent'
          )}
          aria-label={isCompleted ? `Undo ${task.title}` : `Mark ${task.title} as done`}
          role="checkbox"
          aria-checked={isCompleted}
        >
          {isCompleted && <Check className="h-4 w-4" />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <button
            onClick={() => onTap?.(task)}
            className="text-left w-full"
          >
            <span className={cn(
              'text-sm font-medium text-content',
              isCompleted && 'line-through text-content-muted'
            )}>
              {task.title}
            </span>
          </button>

          <div className="mt-1 flex flex-wrap items-center gap-2">
            {task.difficulty && (
              <Badge variant={difficultyVariant[task.difficulty] || 'secondary'}>
                {task.difficulty}
              </Badge>
            )}
            {task.points != null && task.points > 0 && (
              <span className="text-xs text-content-muted">{task.points} VP</span>
            )}
            {task.must_do && (
              <Badge variant="danger">must-do</Badge>
            )}
          </div>

          {/* Sub-steps */}
          {task.sub_steps && task.sub_steps.length > 0 && (
            <>
              <button
                onClick={() => setExpanded(!expanded)}
                className="mt-2 flex items-center gap-1 text-xs text-content-muted hover:text-content-secondary"
                aria-expanded={expanded}
              >
                {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {task.sub_steps.length} steps
              </button>
              {expanded && (
                <div className="mt-2 space-y-1.5 pl-1">
                  {task.sub_steps.map((step) => (
                    <label key={step.id} className="flex items-center gap-2 text-xs text-content-secondary">
                      <input
                        type="checkbox"
                        checked={step.completed}
                        readOnly
                        className="h-4 w-4 rounded border-border"
                      />
                      <span className={step.completed ? 'line-through' : ''}>{step.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* VP float-up animation */}
      <AnimatePresence>
        {showPoints && task.points && (
          reducedMotion ? (
            <span className="absolute right-4 top-2 text-sm font-bold text-success animate-fade-in">
              +{task.points}
            </span>
          ) : (
            <motion.span
              initial={{ y: 0, opacity: 1 }}
              animate={{ y: -30, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="absolute right-4 top-2 text-sm font-bold text-success"
            >
              +{task.points}
            </motion.span>
          )
        )}
      </AnimatePresence>
    </div>
  )
}

export function TaskCardSkeleton() {
  return (
    <div className="rounded-soft bg-surface shadow-soft p-4 space-y-3 border-l-4 border-surface-sunken">
      <div className="flex items-center gap-3">
        <div className="h-6 w-6 rounded bg-surface-sunken animate-pulse" />
        <div className="h-5 w-48 rounded bg-surface-sunken animate-pulse" />
      </div>
      <div className="flex gap-2">
        <div className="h-5 w-16 rounded-pill bg-surface-sunken animate-pulse" />
        <div className="h-5 w-12 rounded-pill bg-surface-sunken animate-pulse" />
      </div>
    </div>
  )
}
