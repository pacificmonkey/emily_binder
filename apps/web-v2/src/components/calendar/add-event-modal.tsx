import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateEvent } from '@/hooks/use-events'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

const EVENT_TYPES = [
  { value: 'appointment', label: 'Appointment' },
  { value: 'social', label: 'Social' },
  { value: 'errand', label: 'Errand' },
  { value: 'class', label: 'Class' },
  { value: 'therapy', label: 'Therapy' },
  { value: 'work', label: 'Work' },
  { value: 'other', label: 'Other' },
] as const

const addEventSchema = z.object({
  title: z.string().min(1, 'Give your event a name'),
  type: z.enum(['appointment', 'social', 'errand', 'class', 'therapy', 'work', 'other']).default('other'),
  starts_at: z.string().min(1, 'Start date/time is required'),
  ends_at: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
})

type AddEventForm = z.infer<typeof addEventSchema>

interface AddEventModalProps {
  open: boolean
  onClose: () => void
  defaultDate?: Date | null
}

export function AddEventModal({ open, onClose, defaultDate }: AddEventModalProps) {
  const createEvent = useCreateEvent()

  // Format default date for datetime-local input
  const defaultDateStr = defaultDate
    ? new Date(defaultDate.getTime() - defaultDate.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
    : ''

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddEventForm>({
    resolver: zodResolver(addEventSchema),
    defaultValues: {
      type: 'other',
      starts_at: defaultDateStr,
    },
  })

  const onSubmit = async (data: AddEventForm) => {
    await createEvent.mutateAsync({
      title: data.title,
      type: data.type,
      starts_at: new Date(data.starts_at).toISOString(),
      ends_at: data.ends_at ? new Date(data.ends_at).toISOString() : null,
      location: data.location || null,
      notes: data.notes || null,
    })
    reset()
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative z-50 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl bg-surface p-6 sm:rounded-soft"
        role="dialog"
        aria-modal="true"
        aria-label="Add event"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-content">Add event</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-surface-sunken" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Title */}
          <div>
            <Label htmlFor="event-title">Title</Label>
            <Input
              id="event-title"
              {...register('title')}
              placeholder="What's happening?"
              className={cn('mt-1', errors.title && 'border-danger')}
              autoFocus
            />
            {errors.title && (
              <p className="mt-1 text-xs text-danger">{errors.title.message}</p>
            )}
          </div>

          {/* Type */}
          <div>
            <Label htmlFor="event-type">Type</Label>
            <select
              id="event-type"
              {...register('type')}
              className="mt-1 w-full rounded-soft border border-border bg-surface px-3 py-2 text-sm text-content focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            >
              {EVENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Start / End */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="event-start">Starts at</Label>
              <Input
                id="event-start"
                type="datetime-local"
                {...register('starts_at')}
                className={cn('mt-1', errors.starts_at && 'border-danger')}
              />
              {errors.starts_at && (
                <p className="mt-1 text-xs text-danger">{errors.starts_at.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="event-end">Ends at (optional)</Label>
              <Input
                id="event-end"
                type="datetime-local"
                {...register('ends_at')}
                className="mt-1"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <Label htmlFor="event-location">Location (optional)</Label>
            <Input
              id="event-location"
              {...register('location')}
              placeholder="Where?"
              className="mt-1"
            />
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="event-notes">Notes (optional)</Label>
            <Textarea
              id="event-notes"
              {...register('notes')}
              placeholder="Any extra details..."
              className="mt-1"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={createEvent.isPending} className="flex-1">
              {createEvent.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
