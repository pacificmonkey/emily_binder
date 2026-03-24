'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/components/ui/toaster'
import { PageHeader } from '@/components/shared/page-header'
import { useAuthStore } from '@/stores/auth-store'
import { adminCreateNotification } from '@/services/notifications'

const NOTIFICATION_TYPES = [
  { value: 'info', label: 'Info' },
  { value: 'reminder', label: 'Reminder' },
  { value: 'custom', label: 'Custom' },
]

export default function SendNotificationAdmin() {
  const { isImpersonating } = useAuthStore()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [form, setForm] = useState({
    title: '',
    body: '',
    type: 'info',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.title) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in the notification title',
        variant: 'error',
      })
      return
    }

    if (!isImpersonating) {
      toast({
        title: 'Not Impersonating',
        description: 'You must be impersonating a patient to send notifications',
        variant: 'error',
      })
      return
    }

    try {
      setIsSubmitting(true)
      await adminCreateNotification({
        title: form.title,
        body: form.body || null,
        type: form.type,
      })

      toast({
        title: 'Success',
        description: 'Notification sent to patient',
      })

      setForm({
        title: '',
        body: '',
        type: 'info',
      })
    } catch (error) {
      console.error('Failed to send notification:', error)
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to send notification',
        variant: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Send Notification"
        subtitle="Send a notification to the impersonated patient"
      />

      {/* Warning if not impersonating */}
      {!isImpersonating && (
        <Card className="border-warning/20 bg-warning/5">
          <CardContent className="p-4">
            <p className="text-sm text-warning-dark font-medium">
              ⚠️ You are not currently impersonating a patient. Start impersonating
              to send notifications.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Notification Form */}
      <Card>
        <CardHeader>
          <CardTitle>Create Notification</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="notif-title">Title (required)</Label>
              <Input
                id="notif-title"
                placeholder="e.g., Great job on your workout!"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                disabled={!isImpersonating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notif-body">Body (optional)</Label>
              <Textarea
                id="notif-body"
                placeholder="Additional message to display in the notification"
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                rows={4}
                disabled={!isImpersonating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notif-type">Notification Type</Label>
              <select
                id="notif-type"
                className={cn(
                  'flex h-10 w-full rounded-soft border border-border bg-surface px-3 py-2 text-sm text-content',
                  'focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20',
                  !isImpersonating && 'opacity-50 cursor-not-allowed'
                )}
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                disabled={!isImpersonating}
              >
                {NOTIFICATION_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <Button
              type="submit"
              disabled={!isImpersonating || isSubmitting}
              size="lg"
              className="w-full"
            >
              {isSubmitting ? 'Sending...' : 'Send Notification'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Preview Card */}
      {form.title && (
        <Card className="border-accent/20 bg-accent/5">
          <CardHeader>
            <CardTitle className="text-base">Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 p-4 bg-surface rounded-soft border border-border">
              <div className="flex items-start gap-3">
                <div className="text-2xl">🔔</div>
                <div className="flex-1">
                  <h4 className="font-semibold text-content">{form.title}</h4>
                  {form.body && (
                    <p className="text-sm text-content-secondary mt-1">{form.body}</p>
                  )}
                  <p className="text-xs text-content-muted mt-2 capitalize">
                    {form.type}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
