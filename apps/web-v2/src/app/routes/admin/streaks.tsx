'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/toaster'
import { PageHeader } from '@/components/shared/page-header'
import { getStreaks, createStreak } from '@/services/streaks'
import type { StreakWithState } from '@/types/database'

const TEMPLATE_KEY_OPTIONS = [
  { value: 'daily_exercise', label: 'Daily Exercise' },
  { value: 'meditation', label: 'Meditation' },
  { value: 'water_intake', label: 'Water Intake' },
  { value: 'sleep_quality', label: 'Sleep Quality' },
  { value: 'medication_adherence', label: 'Medication Adherence' },
]

interface BonusMilestone {
  days: string
  coins: string
}

export default function StreaksAdmin() {
  const [streaks, setStreaks] = useState<StreakWithState[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [form, setForm] = useState({
    name: '',
    emoji: '',
    template_key: 'daily_exercise',
    period: 'daily',
    coin_reward: '',
    description: '',
    break_behavior: 'break' as 'break' | 'use_token_if_available' | 'prompt_to_use_token',
  })

  const [milestones, setMilestones] = useState<BonusMilestone[]>([
    { days: '', coins: '' },
  ])

  useEffect(() => {
    loadStreaks()
  }, [])

  const loadStreaks = async () => {
    try {
      setLoading(true)
      const data = await getStreaks()
      setStreaks(data)
    } catch (error) {
      console.error('Failed to load streaks:', error)
      toast({
        title: 'Error',
        description: 'Failed to load streaks',
        variant: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddMilestone = () => {
    setMilestones([...milestones, { days: '', coins: '' }])
  }

  const handleRemoveMilestone = (index: number) => {
    setMilestones(milestones.filter((_, i) => i !== index))
  }

  const handleMilestoneChange = (
    index: number,
    field: 'days' | 'coins',
    value: string
  ) => {
    const updated = [...milestones]
    updated[index][field] = value
    setMilestones(updated)
  }

  const handleCreateStreak = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.emoji || !form.coin_reward) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in required fields: name, emoji, coin_reward',
        variant: 'error',
      })
      return
    }

    try {
      setIsSubmitting(true)

      // Build bonus milestones
      const bonusMilestones = milestones
        .filter((m) => m.days && m.coins)
        .map((m) => ({
          days: parseInt(m.days),
          coins: parseInt(m.coins),
        }))

      await createStreak({
        name: form.name,
        emoji: form.emoji,
        template_key: form.template_key as any,
        period: form.period as 'daily' | 'weekly',
        coin_reward: parseInt(form.coin_reward),
        description: form.description || null,
        bonus_milestones: bonusMilestones.length > 0 ? bonusMilestones : null,
        break_behavior: form.break_behavior,
      })

      toast({
        title: 'Success',
        description: `Streak "${form.name}" created`,
      })

      setForm({
        name: '',
        emoji: '',
        template_key: 'daily_exercise',
        period: 'daily',
        coin_reward: '',
        description: '',
        break_behavior: 'break',
      })
      setMilestones([{ days: '', coins: '' }])
      setShowCreate(false)
      await loadStreaks()
    } catch (error) {
      console.error('Failed to create streak:', error)
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to create streak',
        variant: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Streak Definitions"
        subtitle="Create and manage streak definitions"
        action={
          <Button onClick={() => setShowCreate(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            New Streak
          </Button>
        }
      />

      {/* Create Streak Form */}
      {showCreate && (
        <Card className="border-accent/20 bg-accent/5">
          <CardHeader>
            <CardTitle>Create Streak Definition</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateStreak} className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="streak-name">Name</Label>
                  <Input
                    id="streak-name"
                    placeholder="e.g., Daily Exercise"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="streak-emoji">Emoji</Label>
                  <Input
                    id="streak-emoji"
                    placeholder="🔥"
                    maxLength={2}
                    value={form.emoji}
                    onChange={(e) => setForm({ ...form, emoji: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="streak-reward">Coin Reward</Label>
                  <Input
                    id="streak-reward"
                    type="number"
                    min="0"
                    placeholder="10"
                    value={form.coin_reward}
                    onChange={(e) =>
                      setForm({ ...form, coin_reward: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="streak-template">Template Key</Label>
                  <select
                    id="streak-template"
                    className={cn(
                      'flex h-10 w-full rounded-soft border border-border bg-surface px-3 py-2 text-sm text-content',
                      'focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20'
                    )}
                    value={form.template_key}
                    onChange={(e) =>
                      setForm({ ...form, template_key: e.target.value })
                    }
                  >
                    {TEMPLATE_KEY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="streak-period">Period</Label>
                  <select
                    id="streak-period"
                    className={cn(
                      'flex h-10 w-full rounded-soft border border-border bg-surface px-3 py-2 text-sm text-content',
                      'focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20'
                    )}
                    value={form.period}
                    onChange={(e) => setForm({ ...form, period: e.target.value })}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="streak-description">Description</Label>
                <Textarea
                  id="streak-description"
                  placeholder="Optional description of the streak"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="space-y-3">
                <Label>Break Behavior</Label>
                <div className="space-y-2">
                  {(['break', 'use_token_if_available', 'prompt_to_use_token'] as const).map((behavior) => (
                    <label key={behavior} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="break_behavior"
                        value={behavior}
                        checked={form.break_behavior === behavior}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            break_behavior: e.target.value as 'break' | 'use_token_if_available' | 'prompt_to_use_token',
                          })
                        }
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-content">
                        {behavior === 'break'
                          ? 'Break the streak'
                          : behavior === 'use_token_if_available'
                            ? 'Use shield token'
                            : 'Prompt user'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Bonus Milestones */}
              <div className="space-y-3 border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <Label>Bonus Milestones (optional)</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleAddMilestone}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Milestone
                  </Button>
                </div>
                <div className="space-y-2">
                  {milestones.map((milestone, index) => (
                    <div key={index} className="flex gap-2 items-end">
                      <div className="flex-1 space-y-1">
                        <Label htmlFor={`days-${index}`} className="text-xs">
                          Days
                        </Label>
                        <Input
                          id={`days-${index}`}
                          type="number"
                          min="1"
                          placeholder="7"
                          value={milestone.days}
                          onChange={(e) =>
                            handleMilestoneChange(index, 'days', e.target.value)
                          }
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <Label htmlFor={`coins-${index}`} className="text-xs">
                          Bonus Coins
                        </Label>
                        <Input
                          id={`coins-${index}`}
                          type="number"
                          min="0"
                          placeholder="50"
                          value={milestone.coins}
                          onChange={(e) =>
                            handleMilestoneChange(index, 'coins', e.target.value)
                          }
                        />
                      </div>
                      {milestones.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveMilestone(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 justify-end border-t border-border pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreate(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Streak'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Streaks List */}
      <div>
        <h2 className="text-lg font-semibold text-content mb-4">Streak Definitions</h2>
        {loading ? (
          <p className="text-content-secondary">Loading streaks...</p>
        ) : streaks.length === 0 ? (
          <p className="text-content-secondary">No streaks defined yet</p>
        ) : (
          <div className="overflow-x-auto rounded-soft border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-content">Emoji</th>
                  <th className="px-4 py-3 text-left font-medium text-content">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-content">Period</th>
                  <th className="px-4 py-3 text-left font-medium text-content">Coin Reward</th>
                  <th className="px-4 py-3 text-left font-medium text-content">Template</th>
                  <th className="px-4 py-3 text-left font-medium text-content">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-content">Count</th>
                </tr>
              </thead>
              <tbody>
                {streaks.map((streak) => (
                  <tr key={streak.streak_definition_id} className="border-b border-border hover:bg-surface-sunken/50 transition-colors">
                    <td className="px-4 py-3 text-lg">{streak.emoji}</td>
                    <td className="px-4 py-3 font-medium text-content">{streak.name}</td>
                    <td className="px-4 py-3 text-content-secondary capitalize">
                      {streak.period}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{streak.coin_reward} coins</Badge>
                    </td>
                    <td className="px-4 py-3 text-content-secondary text-xs">
                      {streak.template_key}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={streak.status === 'active' ? 'success' : 'secondary'}
                      >
                        {streak.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-content">
                      {streak.state?.current_count || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
