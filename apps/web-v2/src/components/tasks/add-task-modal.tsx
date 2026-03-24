import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateTask } from '@/hooks/use-tasks'
import { useCategories } from '@/hooks/use-categories'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

const addTaskSchema = z.object({
  title: z.string().min(1, 'Give your task a name'),
  description: z.string().optional(),
  category_id: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  must_do: z.boolean().default(false),
})

type AddTaskForm = z.infer<typeof addTaskSchema>

interface AddTaskModalProps {
  open: boolean
  onClose: () => void
}

export function AddTaskModal({ open, onClose }: AddTaskModalProps) {
  const createTask = useCreateTask()
  const { data: categories } = useCategories()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<AddTaskForm>({
    resolver: zodResolver(addTaskSchema),
    defaultValues: {
      difficulty: 'medium',
      must_do: false,
    },
  })

  const difficulty = watch('difficulty')

  const onSubmit = async (data: AddTaskForm) => {
    await createTask.mutateAsync(data)
    reset()
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-50 w-full max-w-lg rounded-t-2xl bg-surface p-6 sm:rounded-soft" role="dialog" aria-modal="true" aria-label="Add task">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-content">Add task</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-surface-sunken" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Title */}
          <div>
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              {...register('title')}
              placeholder="What needs to be done?"
              className={cn('mt-1', errors.title && 'border-danger')}
              autoFocus
            />
            {errors.title && (
              <p className="mt-1 text-xs text-danger">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="task-desc">Description (optional)</Label>
            <Textarea
              id="task-desc"
              {...register('description')}
              placeholder="Add some details..."
              className="mt-1"
            />
          </div>

          {/* Category */}
          {categories && (categories as any[]).length > 0 && (
            <div>
              <Label htmlFor="task-category">Category (optional)</Label>
              <select
                id="task-category"
                {...register('category_id')}
                className="mt-1 w-full rounded-soft border border-border bg-surface px-3 py-2 text-sm text-content focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              >
                <option value="">No category</option>
                {(categories as any[]).map((cat: any) => (
                  <option key={cat.category_id} value={cat.category_id}>
                    {cat.icon ? `${cat.icon} ` : ''}{cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Difficulty */}
          <div>
            <Label>Difficulty</Label>
            <div className="mt-2 flex gap-2" role="radiogroup" aria-label="Task difficulty">
              {(['easy', 'medium', 'hard'] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setValue('difficulty', level)}
                  className={cn(
                    'flex-1 rounded-pill py-2 text-sm font-medium transition-colors capitalize min-h-[44px]',
                    'focus-visible:ring-2 focus-visible:ring-accent',
                    difficulty === level
                      ? level === 'easy' ? 'bg-success-light text-success-dark'
                        : level === 'medium' ? 'bg-warning-light text-warning-dark'
                        : 'bg-danger-light text-danger-dark'
                      : 'bg-surface-sunken text-content-muted hover:bg-surface-sunken/80'
                  )}
                  role="radio"
                  aria-checked={difficulty === level}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Must-do */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              {...register('must_do')}
              className="h-5 w-5 rounded border-border text-accent focus:ring-accent"
            />
            <span className="text-sm text-content">Must-do (counts toward daily win)</span>
          </label>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={createTask.isPending} className="flex-1">
              {createTask.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
