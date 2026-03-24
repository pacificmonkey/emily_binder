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
import { useCreateSymptom } from '@/hooks/use-wellbeing'
import type {
  SymptomDomain,
  SymptomSeverity,
  CreateSymptomEntryInput,
} from '@/types/database'

const SYMPTOM_DOMAINS: { value: SymptomDomain; label: string }[] = [
  { value: 'physical', label: 'Physical' },
  { value: 'mental', label: 'Mental' },
  { value: 'sensory', label: 'Sensory' },
  { value: 'sleep', label: 'Sleep' },
  { value: 'other', label: 'Other' },
]

const SYMPTOM_SEVERITIES: { value: SymptomSeverity; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'mild', label: 'Mild' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'severe', label: 'Severe' },
]

const severityColors: Record<SymptomSeverity, string> = {
  none: 'bg-gray-100 text-gray-900 border-gray-300 hover:bg-gray-50',
  mild: 'bg-blue-50 text-blue-900 border-blue-300 hover:bg-blue-100',
  moderate: 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100',
  severe: 'bg-red-50 text-red-900 border-red-300 hover:bg-red-100',
}

const severityColorsFilled: Record<SymptomSeverity, string> = {
  none: 'bg-gray-200 text-gray-900 border-gray-300',
  mild: 'bg-blue-200 text-blue-900 border-blue-300',
  moderate: 'bg-amber-200 text-amber-900 border-amber-300',
  severe: 'bg-red-200 text-red-900 border-red-300',
}

const symptomFormSchema = z.object({
  domain: z.enum(['physical', 'mental', 'sensory', 'sleep', 'other']),
  label: z
    .string()
    .min(1, 'Symptom name is required')
    .max(100, 'Symptom name must be 100 characters or less'),
  severity: z.enum(['none', 'mild', 'moderate', 'severe']),
  occurred_at: z.string().optional(),
  duration_minutes: z
    .union([z.string(), z.number()])
    .optional()
    .refine(
      (val) => {
        if (!val) return true
        const num = typeof val === 'string' ? parseInt(val) : val
        return !isNaN(num) && num >= 0
      },
      { message: 'Duration must be a positive number' }
    ),
  possible_trigger: z.string().optional(),
  what_helped: z.string().optional(),
  notes: z.string().optional(),
})

type SymptomFormData = z.infer<typeof symptomFormSchema>

interface SymptomFormProps {
  onSuccess?: () => void
}

export const SymptomForm = ({ onSuccess }: SymptomFormProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const createSymptom = useCreateSymptom()

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SymptomFormData>({
    resolver: zodResolver(symptomFormSchema),
    defaultValues: {
      severity: 'mild',
      occurred_at: new Date().toISOString().split('T')[0],
    },
  })

  const selectedSeverity = watch('severity') as SymptomSeverity

  const onSubmit = async (data: SymptomFormData) => {
    try {
      const input: CreateSymptomEntryInput = {
        domain: data.domain,
        label: data.label,
        severity: data.severity,
        occurred_at: data.occurred_at || new Date().toISOString(),
        duration_minutes: data.duration_minutes
          ? typeof data.duration_minutes === 'string'
            ? parseInt(data.duration_minutes)
            : data.duration_minutes
          : null,
        possible_trigger: data.possible_trigger || null,
        what_helped: data.what_helped || null,
        notes: data.notes || null,
      }

      await createSymptom.mutateAsync(input)
      toast({ title: 'Symptom logged.' })
      reset()
      setIsOpen(false)
      onSuccess?.()
    } catch (error) {
      toast({ title: 'Failed to log symptom. Please try again.' })
      console.error('Error creating symptom:', error)
    }
  }

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)} className="w-full sm:w-auto">
        Log Symptom
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-soft bg-surface shadow-raised">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-content">Log a Symptom</h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-6">
          {/* Domain Select */}
          <div>
            <Label htmlFor="domain" className="mb-2 block text-sm font-medium">
              Type of Symptom
            </Label>
            <select
              id="domain"
              {...register('domain')}
              className={cn(
                'w-full rounded-soft border bg-white px-3 py-2 text-sm',
                'border-gray-300 text-content',
                'focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
                errors.domain && 'border-red-500'
              )}
            >
              <option value="">Select a category</option>
              {SYMPTOM_DOMAINS.map((domain) => (
                <option key={domain.value} value={domain.value}>
                  {domain.label}
                </option>
              ))}
            </select>
            {errors.domain && (
              <p className="mt-1 text-sm text-red-500">{errors.domain.message}</p>
            )}
          </div>

          {/* Symptom Name/Label */}
          <div>
            <Label htmlFor="label" className="mb-2 block text-sm font-medium">
              Symptom Name
            </Label>
            <Input
              id="label"
              placeholder="e.g., Headache, Fatigue, Anxiety"
              {...register('label')}
              className={cn(errors.label && 'border-red-500')}
            />
            {errors.label && (
              <p className="mt-1 text-sm text-red-500">{errors.label.message}</p>
            )}
          </div>

          {/* Severity */}
          <div>
            <Label className="mb-3 block text-sm font-medium">Severity</Label>
            <div className="grid grid-cols-4 gap-2">
              {SYMPTOM_SEVERITIES.map((sev) => (
                <label key={sev.value} className="flex items-center">
                  <input
                    type="radio"
                    value={sev.value}
                    {...register('severity')}
                    className="sr-only"
                  />
                  <span
                    className={cn(
                      'block w-full cursor-pointer rounded-soft border-2 px-3 py-2 text-center text-sm font-medium transition-colors',
                      selectedSeverity === sev.value
                        ? severityColorsFilled[sev.value as SymptomSeverity]
                        : severityColors[sev.value as SymptomSeverity]
                    )}
                  >
                    {sev.label}
                  </span>
                </label>
              ))}
            </div>
            {errors.severity && (
              <p className="mt-1 text-sm text-red-500">
                {errors.severity.message}
              </p>
            )}
          </div>

          {/* Date */}
          <div>
            <Label htmlFor="occurred_at" className="mb-2 block text-sm font-medium">
              Date
            </Label>
            <Input
              id="occurred_at"
              type="date"
              {...register('occurred_at')}
            />
          </div>

          {/* Duration */}
          <div>
            <Label htmlFor="duration_minutes" className="mb-2 block text-sm font-medium">
              Duration (minutes) <span className="text-text-content-muted">Optional</span>
            </Label>
            <Input
              id="duration_minutes"
              type="number"
              min="0"
              placeholder="e.g., 30"
              {...register('duration_minutes')}
              className={cn(errors.duration_minutes && 'border-red-500')}
            />
            {errors.duration_minutes && (
              <p className="mt-1 text-sm text-red-500">
                {errors.duration_minutes.message}
              </p>
            )}
          </div>

          {/* Possible Trigger */}
          <div>
            <Label htmlFor="possible_trigger" className="mb-2 block text-sm font-medium">
              What might have triggered it? <span className="text-text-content-muted">Optional</span>
            </Label>
            <Input
              id="possible_trigger"
              placeholder="e.g., Stress, lack of sleep, certain foods"
              {...register('possible_trigger')}
            />
          </div>

          {/* What Helped */}
          <div>
            <Label htmlFor="what_helped" className="mb-2 block text-sm font-medium">
              What helped? <span className="text-text-content-muted">Optional</span>
            </Label>
            <Input
              id="what_helped"
              placeholder="e.g., Rest, medication, breathing exercises"
              {...register('what_helped')}
            />
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes" className="mb-2 block text-sm font-medium">
              Additional Notes <span className="text-text-content-muted">Optional</span>
            </Label>
            <Textarea
              id="notes"
              placeholder="Any other details about this symptom..."
              {...register('notes')}
              rows={3}
            />
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-4">
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
              disabled={isSubmitting || createSymptom.isPending}
              className="flex-1"
            >
              {isSubmitting || createSymptom.isPending ? 'Logging...' : 'Log Symptom'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
