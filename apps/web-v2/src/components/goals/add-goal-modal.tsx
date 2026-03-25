import { useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCreateGoal } from '@/hooks/use-goals'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import type { GoalType } from '@/types/database'

const addGoalSchema = z.object({
  title: z.string().min(1, 'Give your goal a name'),
  description: z.string().optional(),
  goal_type: z.enum(['destiny', 'quest']).default('quest'),
  missions: z.array(
    z.object({
      title: z.string().min(1, 'Mission name is required'),
      description: z.string().optional(),
      points: z.coerce.number().min(0).default(10),
      must_do: z.boolean().default(false),
    })
  ).optional(),
})

type AddGoalForm = z.infer<typeof addGoalSchema>

interface AddGoalModalProps {
  open: boolean
  onClose: () => void
}

export function AddGoalModal({ open, onClose }: AddGoalModalProps) {
  const createGoal = useCreateGoal()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    control,
    formState: { errors },
  } = useForm<AddGoalForm>({
    resolver: zodResolver(addGoalSchema),
    defaultValues: {
      goal_type: 'quest',
      missions: [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'missions',
  })

  const goalType = watch('goal_type') as GoalType

  const onSubmit = async (data: AddGoalForm) => {
    try {
      setIsSubmitting(true)
      await createGoal.mutateAsync({
        title: data.title,
        description: data.description || null,
        goal_type: data.goal_type,
        missions: data.missions && data.missions.length > 0 ? data.missions : undefined,
      })
      reset()
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative z-50 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl bg-surface p-6 sm:rounded-soft"
        role="dialog"
        aria-modal="true"
        aria-label="Add goal"
      >
        <div className="flex items-center justify-between mb-6 sticky top-0 bg-surface -m-6 p-6 pb-4">
          <h2 className="text-lg font-semibold text-content">Add goal</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-surface-sunken" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Title */}
          <div>
            <Label htmlFor="goal-title">Goal name</Label>
            <Input
              id="goal-title"
              {...register('title')}
              placeholder="What do you want to accomplish?"
              className={cn('mt-1', errors.title && 'border-danger')}
              autoFocus
            />
            {errors.title && <p className="mt-1 text-xs text-danger">{errors.title.message}</p>}
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="goal-desc">Description (optional)</Label>
            <Textarea
              id="goal-desc"
              {...register('description')}
              placeholder="Why is this goal important?"
              className="mt-1"
            />
          </div>

          {/* Goal Type Toggle */}
          <div>
            <Label>Type</Label>
            <div className="mt-2 flex gap-2">
              {(['quest', 'destiny'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setValue('goal_type', type)}
                  className={cn(
                    'flex-1 rounded-soft border-2 px-4 py-2 text-sm font-medium transition-colors',
                    goalType === type
                      ? type === 'destiny'
                        ? 'border-purple-400 bg-purple-50 text-purple-700'
                        : 'border-blue-400 bg-blue-50 text-blue-700'
                      : 'border-border bg-surface text-content-secondary hover:border-border-dark'
                  )}
                >
                  {type === 'destiny' ? 'Destiny (Long-term)' : 'Quest (Short-term)'}
                </button>
              ))}
              <input type="hidden" {...register('goal_type')} />
            </div>
          </div>

          {/* Missions Section */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <Label>Missions (optional)</Label>
              <button
                type="button"
                onClick={() => append({ title: '', description: '', points: 10, must_do: false })}
                className="flex items-center gap-1 rounded-soft px-2 py-1 text-xs font-medium text-accent hover:bg-accent/10 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add mission
              </button>
            </div>

            {fields.length > 0 && (
              <div className="space-y-3 rounded-soft bg-surface-sunken p-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="space-y-2 rounded-soft bg-surface p-3">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <Input
                          {...register(`missions.${index}.title`)}
                          placeholder="Mission name"
                          className={cn('text-sm', errors.missions?.[index]?.title && 'border-danger')}
                        />
                        {errors.missions?.[index]?.title && (
                          <p className="mt-1 text-xs text-danger">{errors.missions[index]?.title?.message}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="flex-shrink-0 rounded-soft p-1 text-content-muted hover:bg-surface-sunken hover:text-danger transition-colors"
                        aria-label="Remove mission"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <Input
                      {...register(`missions.${index}.description`)}
                      placeholder="Description (optional)"
                      className="text-sm"
                    />

                    <div className="flex gap-2">
                      <Input
                        {...register(`missions.${index}.points`)}
                        type="number"
                        placeholder="Points (default 10)"
                        min="0"
                        className="text-sm w-1/2"
                      />
                      <label className="flex items-center gap-2 flex-1 px-3 py-2 rounded-soft bg-surface-sunken cursor-pointer hover:bg-surface-sunken/80 transition-colors">
                        <input
                          type="checkbox"
                          {...register(`missions.${index}.must_do`)}
                          className="h-4 w-4 cursor-pointer"
                        />
                        <span className="text-sm text-content-secondary">Must do</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {fields.length === 0 && (
              <p className="text-xs text-content-muted">No missions yet. Add one to get started.</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isSubmitting || createGoal.isPending}
            >
              {isSubmitting || createGoal.isPending ? 'Creating...' : 'Create goal'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
