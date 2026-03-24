import { useEffect, useState } from 'react'
import { useWorkspaceConfig, useUpdateWorkspaceConfig } from '@/hooks/use-admin'
import { toast } from '@/components/ui/toaster'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Settings, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled: boolean
}

function ToggleSwitch({ checked, onChange, disabled }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={cn(
        'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        checked ? 'bg-success' : 'bg-surface-sunken'
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
          checked ? 'translate-x-6' : 'translate-x-0.5'
        )}
      />
    </button>
  )
}

export default function WorkspaceSettingsPage() {
  const { data: config, isLoading } = useWorkspaceConfig()
  const { mutate: updateConfig, isPending } = useUpdateWorkspaceConfig()

  const [dailyWinVpTarget, setDailyWinVpTarget] = useState('')
  const [dailyWinEnabled, setDailyWinEnabled] = useState(false)
  const [dailyWinStreakEnabled, setDailyWinStreakEnabled] = useState(false)
  const [difficultyMultiplierEasy, setDifficultyMultiplierEasy] = useState('')
  const [difficultyMultiplierMedium, setDifficultyMultiplierMedium] = useState('')
  const [difficultyMultiplierHard, setDifficultyMultiplierHard] = useState('')

  useEffect(() => {
    if (config) {
      setDailyWinVpTarget(config.daily_win_vp_target?.toString() || '')
      setDailyWinEnabled(config.daily_win_enabled || false)
      setDailyWinStreakEnabled(config.daily_win_streak_enabled || false)
      setDifficultyMultiplierEasy(config.difficulty_multiplier_easy?.toString() || '')
      setDifficultyMultiplierMedium(config.difficulty_multiplier_medium?.toString() || '')
      setDifficultyMultiplierHard(config.difficulty_multiplier_hard?.toString() || '')
    }
  }, [config])

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()

    updateConfig(
      {
        daily_win_vp_target: dailyWinVpTarget ? parseInt(dailyWinVpTarget, 10) : undefined,
        daily_win_enabled: dailyWinEnabled,
        daily_win_streak_enabled: dailyWinStreakEnabled,
        difficulty_multiplier_easy: difficultyMultiplierEasy
          ? parseFloat(difficultyMultiplierEasy)
          : undefined,
        difficulty_multiplier_medium: difficultyMultiplierMedium
          ? parseFloat(difficultyMultiplierMedium)
          : undefined,
        difficulty_multiplier_hard: difficultyMultiplierHard
          ? parseFloat(difficultyMultiplierHard)
          : undefined,
      },
      {
        onSuccess: () => {
          toast({
            title: 'Success',
            description: 'Settings saved.',
            variant: 'success',
          })
        },
        onError: (error) => {
          toast({
            title: 'Error',
            description: error instanceof Error ? error.message : 'Failed to save settings',
            variant: 'error',
          })
        },
      }
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 bg-surface-sunken rounded animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-accent-light rounded-soft">
            <Settings className="h-5 w-5 text-accent" />
          </div>
          <h2 className="text-lg font-semibold text-content">Workspace Settings</h2>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Daily Win Settings */}
          <div className="space-y-4 pb-6 border-b border-border">
            <h3 className="text-sm font-semibold text-content">Daily Win Configuration</h3>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="daily-win-enabled" className="text-sm font-medium">
                  Enable Daily Win
                </Label>
                <ToggleSwitch
                  checked={dailyWinEnabled}
                  onChange={setDailyWinEnabled}
                  disabled={isPending}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="daily-win-vp-target" className="text-sm font-medium">
                VP Target
              </Label>
              <Input
                id="daily-win-vp-target"
                type="number"
                value={dailyWinVpTarget}
                onChange={(e) => setDailyWinVpTarget(e.target.value)}
                placeholder="100"
                disabled={isPending}
                min="1"
                className="bg-surface"
              />
              <p className="text-xs text-content-muted">
                Required victory points to achieve daily win
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="daily-win-streak-enabled" className="text-sm font-medium">
                  Enable Streak Tracking
                </Label>
                <ToggleSwitch
                  checked={dailyWinStreakEnabled}
                  onChange={setDailyWinStreakEnabled}
                  disabled={isPending}
                />
              </div>
            </div>
          </div>

          {/* Difficulty Multipliers */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-content">Difficulty Multipliers</h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="difficulty-easy" className="text-sm font-medium">
                  Easy
                </Label>
                <Input
                  id="difficulty-easy"
                  type="number"
                  step="0.1"
                  value={difficultyMultiplierEasy}
                  onChange={(e) => setDifficultyMultiplierEasy(e.target.value)}
                  placeholder="0.8"
                  disabled={isPending}
                  min="0"
                  className="bg-surface"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="difficulty-medium" className="text-sm font-medium">
                  Medium
                </Label>
                <Input
                  id="difficulty-medium"
                  type="number"
                  step="0.1"
                  value={difficultyMultiplierMedium}
                  onChange={(e) => setDifficultyMultiplierMedium(e.target.value)}
                  placeholder="1.0"
                  disabled={isPending}
                  min="0"
                  className="bg-surface"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="difficulty-hard" className="text-sm font-medium">
                  Hard
                </Label>
                <Input
                  id="difficulty-hard"
                  type="number"
                  step="0.1"
                  value={difficultyMultiplierHard}
                  onChange={(e) => setDifficultyMultiplierHard(e.target.value)}
                  placeholder="1.2"
                  disabled={isPending}
                  min="0"
                  className="bg-surface"
                />
              </div>
            </div>
            <p className="text-xs text-content-muted">
              Applied as multipliers to task point values
            </p>
          </div>

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Settings
          </Button>
        </form>
      </Card>
    </div>
  )
}
