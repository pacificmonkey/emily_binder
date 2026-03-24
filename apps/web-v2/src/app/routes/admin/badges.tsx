'use client'

import { useState, useEffect } from 'react'
import { Plus, Gift, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/toaster'
import { PageHeader } from '@/components/shared/page-header'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import {
  getBadgeDefinitionsAdmin,
  adminCreateBadge,
  manuallyAwardBadge,
  adminRevokeBadge,
} from '@/services/badges'
import { useAuthStore } from '@/stores/auth-store'
import type { BadgeDefinitionAdmin } from '@/services/badges'

const BADGE_CATEGORIES = [
  'general',
  'achievement',
  'milestone',
  'special',
  'seasonal',
]

export default function BadgesAdmin() {
  const { isImpersonating } = useAuthStore()
  const [badges, setBadges] = useState<BadgeDefinitionAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [awardingBadgeId, setAwardingBadgeId] = useState<string | null>(null)
  const [revokingBadgeId, setRevokingBadgeId] = useState<string | null>(null)
  const [revokeConfirm, setRevokeConfirm] = useState<{ open: boolean; slug: string | null }>({
    open: false,
    slug: null,
  })

  const [form, setForm] = useState({
    slug: '',
    name: '',
    description: '',
    emoji: '',
    category: 'general',
  })

  useEffect(() => {
    loadBadges()
  }, [])

  const loadBadges = async () => {
    try {
      setLoading(true)
      const data = await getBadgeDefinitionsAdmin()
      setBadges(data)
    } catch (error) {
      console.error('Failed to load badges:', error)
      toast({
        title: 'Error',
        description: 'Failed to load badges',
        variant: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBadge = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.slug || !form.name || !form.emoji) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in required fields: slug, name, emoji',
        variant: 'error',
      })
      return
    }

    try {
      setIsSubmitting(true)
      await adminCreateBadge({
        slug: form.slug,
        name: form.name,
        description: form.description,
        emoji: form.emoji,
        category: form.category,
      })

      toast({
        title: 'Success',
        description: `Badge "${form.name}" created`,
      })

      setForm({
        slug: '',
        name: '',
        description: '',
        emoji: '',
        category: 'general',
      })
      setShowCreate(false)
      await loadBadges()
    } catch (error) {
      console.error('Failed to create badge:', error)
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to create badge',
        variant: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAwardBadge = async (badgeSlug: string) => {
    if (!isImpersonating) {
      toast({
        title: 'Not Impersonating',
        description: 'You must be impersonating a patient to award badges',
        variant: 'error',
      })
      return
    }

    try {
      setAwardingBadgeId(badgeSlug)
      const badgeName = await manuallyAwardBadge(badgeSlug)
      toast({
        title: 'Success',
        description: `Badge "${badgeName}" awarded to patient`,
      })
      await loadBadges()
    } catch (error) {
      console.error('Failed to award badge:', error)
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to award badge',
        variant: 'error',
      })
    } finally {
      setAwardingBadgeId(null)
    }
  }

  const handleRevokeBadge = async (badgeSlug: string) => {
    try {
      setRevokingBadgeId(badgeSlug)
      await adminRevokeBadge(badgeSlug)
      toast({
        title: 'Success',
        description: 'Badge revoked from patient',
      })
      setRevokeConfirm({ open: false, slug: null })
      await loadBadges()
    } catch (error) {
      console.error('Failed to revoke badge:', error)
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to revoke badge',
        variant: 'error',
      })
    } finally {
      setRevokingBadgeId(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Badge Management"
        subtitle={
          isImpersonating
            ? 'Create badges and award/revoke them to the impersonated patient'
            : 'Create badges. You must be impersonating a patient to award/revoke.'
        }
        action={
          <Button onClick={() => setShowCreate(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            New Badge
          </Button>
        }
      />

      {/* Warning if not impersonating */}
      {!isImpersonating && (
        <Card className="border-warning/20 bg-warning/5">
          <CardContent className="p-4">
            <p className="text-sm text-warning-dark">
              Start impersonating a patient to award or revoke badges.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Create Badge Form */}
      {showCreate && (
        <Card className="border-accent/20 bg-accent/5">
          <CardHeader>
            <CardTitle>Create Badge</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateBadge} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="badge-slug">Slug (unique ID)</Label>
                  <Input
                    id="badge-slug"
                    placeholder="e.g., first_exercise"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="badge-emoji">Emoji</Label>
                  <Input
                    id="badge-emoji"
                    placeholder="🏆"
                    maxLength={2}
                    value={form.emoji}
                    onChange={(e) => setForm({ ...form, emoji: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="badge-name">Name</Label>
                <Input
                  id="badge-name"
                  placeholder="e.g., First Exercise"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="badge-description">Description</Label>
                <Textarea
                  id="badge-description"
                  placeholder="Optional description of the badge"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="badge-category">Category</Label>
                <select
                  id="badge-category"
                  className={cn(
                    'flex h-10 w-full rounded-soft border border-border bg-surface px-3 py-2 text-sm text-content',
                    'focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20'
                  )}
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {BADGE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreate(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Badge'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Badges Grid */}
      <div>
        <h2 className="text-lg font-semibold text-content mb-4">Badge Definitions</h2>
        {loading ? (
          <p className="text-content-secondary">Loading badges...</p>
        ) : badges.length === 0 ? (
          <p className="text-content-secondary">No badges yet</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {badges.map((badge) => (
              <Card key={badge.badge_id} className="overflow-hidden flex flex-col">
                <CardContent className="p-6 flex-1">
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-6xl mb-2">{badge.emoji}</div>
                      <h3 className="font-semibold text-content text-lg">{badge.name}</h3>
                      <p className="text-xs text-content-muted mt-1">{badge.slug}</p>
                    </div>

                    {badge.description && (
                      <p className="text-sm text-content-secondary text-center">
                        {badge.description}
                      </p>
                    )}

                    <div className="border-t border-border pt-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-content-muted">Category</span>
                        <Badge variant="outline" className="font-normal">
                          {badge.category}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs mt-2">
                        <span className="text-content-muted">Earned</span>
                        <span className="font-medium text-content">{badge.earned_count}</span>
                      </div>
                    </div>

                    {isImpersonating && (
                      <div className="flex gap-2 pt-2 border-t border-border">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleAwardBadge(badge.slug)}
                          disabled={awardingBadgeId === badge.slug}
                          className="flex-1"
                        >
                          <Gift className="h-3 w-3 mr-1" />
                          Award
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() =>
                            setRevokeConfirm({ open: true, slug: badge.slug })
                          }
                          disabled={revokingBadgeId === badge.slug}
                          className="flex-1"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Revoke
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Revoke Confirmation Dialog */}
      <ConfirmDialog
        open={revokeConfirm.open}
        onOpenChange={(open) =>
          setRevokeConfirm({ open, slug: open ? revokeConfirm.slug : null })
        }
        title="Revoke Badge"
        description="Are you sure you want to revoke this badge from the patient?"
        confirmLabel="Revoke"
        cancelLabel="Cancel"
        onConfirm={() => {
          if (revokeConfirm.slug) {
            handleRevokeBadge(revokeConfirm.slug)
          }
        }}
        variant="danger"
      />
    </div>
  )
}
