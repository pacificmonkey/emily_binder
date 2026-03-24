'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toaster'
import { useCreateDiscussionItem } from '@/hooks/use-wellbeing'
import type { CreateDiscussionItemInput } from '@/types/database'

const discussionFormSchema = z.object({
  title: z
    .string()
    .min(1, 'Topic is required')
    .max(200, 'Topic must be 200 characters or less'),
  details: z.string().optional(),
})

type DiscussionFormData = z.infer<typeof discussionFormSchema>

interface DiscussionFormProps {
  onSuccess?: () => void
}

export const DiscussionForm = ({ onSuccess }: DiscussionFormProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const createDiscussion = useCreateDiscussionItem()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DiscussionFormData>({
    resolver: zodResolver(discussionFormSchema),
  })

  const onSubmit = async (data: DiscussionFormData) => {
    try {
      const input: CreateDiscussionItemInput = {
        title: data.title,
        details: data.details || null,
      }

      await createDiscussion.mutateAsync(input)
      toast({ title: 'Discussion item added.' })
      reset()
      setIsOpen(false)
      onSuccess?.()
    } catch (error) {
      toast({ title: 'Failed to add discussion item. Please try again.' })
      console.error('Error creating discussion item:', error)
    }
  }

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)} className="w-full sm:w-auto">
        Add Discussion Item
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-soft bg-surface shadow-raised">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-content">
            Add Discussion Item
          </h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6">
          {/* Title/Topic */}
          <div>
            <Label htmlFor="title" className="mb-2 block text-sm font-medium">
              Topic to Discuss
            </Label>
            <Input
              id="title"
              placeholder="e.g., Medication side effects, Sleep issues"
              {...register('title')}
              className={cn(errors.title && 'border-red-500')}
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-500">{errors.title.message}</p>
            )}
          </div>

          {/* Details */}
          <div>
            <Label htmlFor="details" className="mb-2 block text-sm font-medium">
              Details <span className="text-text-content-muted">Optional</span>
            </Label>
            <Textarea
              id="details"
              placeholder="Any additional context or information..."
              {...register('details')}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsOpen(false)
                reset()
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || createDiscussion.isPending}
              className="flex-1"
            >
              {isSubmitting || createDiscussion.isPending
                ? 'Adding...'
                : 'Add Item'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
