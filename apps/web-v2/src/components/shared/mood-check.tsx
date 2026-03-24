import { useState } from 'react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { toast } from '@/components/ui/toaster'

const moods = [
  { value: 5, emoji: '😊', label: 'Great' },
  { value: 4, emoji: '🙂', label: 'Good' },
  { value: 3, emoji: '😐', label: 'Okay' },
  { value: 2, emoji: '😔', label: 'Low' },
  { value: 1, emoji: '😰', label: 'Rough' },
]

interface MoodCheckProps {
  todaysMood?: number | null
  className?: string
}

export function MoodCheck({ todaysMood, className }: MoodCheckProps) {
  const [selected, setSelected] = useState<number | null>(todaysMood ?? null)
  const [saving, setSaving] = useState(false)

  const handleSelect = async (value: number) => {
    if (saving) return
    setSaving(true)
    setSelected(value)

    try {
      await supabase.rpc('log_mood', { p_score: value })
      toast({ title: 'Mood logged.', variant: 'success' })
    } catch {
      setSelected(todaysMood ?? null)
      toast({ title: "Couldn't save that. Try again?", variant: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={cn('flex items-center gap-3', className)} role="radiogroup" aria-label="How are you feeling?">
      <span className="text-sm text-content-secondary">How are you feeling?</span>
      <div className="flex gap-1">
        {moods.map((mood) => (
          <button
            key={mood.value}
            onClick={() => handleSelect(mood.value)}
            disabled={saving}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-full text-xl transition-transform hover:scale-110',
              'focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
              selected === mood.value && 'bg-accent-light ring-2 ring-accent scale-110'
            )}
            role="radio"
            aria-checked={selected === mood.value}
            aria-label={mood.label}
          >
            {mood.emoji}
          </button>
        ))}
      </div>
    </div>
  )
}
