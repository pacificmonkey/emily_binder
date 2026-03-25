import { Card, CardContent } from '@/components/ui/card'
import { useUserProgress } from '@/hooks/use-user-progress'
import { useCoinBalance } from '@/hooks/use-store'
import { useStreaks } from '@/hooks/use-streaks'
import { useBadges } from '@/hooks/use-badges'
import { cn } from '@/lib/utils'

function StarIcon({ tier }: { tier: 'bronze' | 'silver' | 'gold' | 'diamond' }) {
  const colors = {
    bronze: 'text-yellow-700',
    silver: 'text-gray-400',
    gold: 'text-yellow-400',
    diamond: 'text-cyan-300',
  }

  return (
    <svg
      className={cn('w-6 h-6', colors[tier])}
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}

function getTierAndStars(level: number): { tier: 'bronze' | 'silver' | 'gold' | 'diamond'; stars: number } {
  if (level <= 3) return { tier: 'bronze', stars: level }
  if (level <= 6) return { tier: 'silver', stars: level - 3 }
  if (level <= 9) return { tier: 'gold', stars: level - 6 }
  return { tier: 'diamond', stars: Math.min(10 - level + 1, 3) }
}

export function ProfileStats() {
  const { data: progress, isLoading: progressLoading } = useUserProgress()
  const { data: balance = 0 } = useCoinBalance()
  const { data: streaks = [] } = useStreaks()
  const { data: badges = [] } = useBadges()

  if (progressLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4 animate-pulse">
            <div className="h-8 bg-surface-sunken rounded-soft w-32" />
            <div className="h-6 bg-surface-sunken rounded-soft w-24" />
            <div className="h-6 bg-surface-sunken rounded-soft w-24" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const level = progress?.level ?? 1
  const totalVp = progress?.total_vp ?? 0
  const currentLevelVp = progress?.current_level_vp ?? 0
  const nextLevelVp = progress?.next_level_vp ?? 100

  const earnedBadgesCount = badges.filter((b) => b.earned).length
  const activeStreaks = streaks.filter((s) => s.state?.status === 'ongoing')
  const currentStreak = activeStreaks.length > 0 ? Math.max(...activeStreaks.map((s) => s.state?.current_count ?? 0)) : 0
  const bestStreak = activeStreaks.length > 0 ? Math.max(...activeStreaks.map((s) => s.state?.best_count ?? 0)) : 0

  const { tier, stars } = getTierAndStars(level)
  const vpProgress = nextLevelVp > 0 ? (currentLevelVp / nextLevelVp) * 100 : 0

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-6">
          {/* Level with stars */}
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <div className="flex items-center gap-1">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'transition-opacity',
                      i < stars ? 'opacity-100' : 'opacity-30'
                    )}
                  >
                    <StarIcon tier={tier} />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm text-content-secondary">Level {level}</p>
              <p className="text-sm font-semibold text-content capitalize">{tier}</p>
            </div>
          </div>

          {/* VP Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-content-secondary">Victory Points</p>
              <p className="text-sm font-medium text-content">{totalVp} VP</p>
            </div>
            <div className="w-full bg-surface-sunken rounded-pill h-2 overflow-hidden">
              <div
                className="h-full bg-accent rounded-pill transition-all duration-300"
                style={{ width: `${vpProgress}%` }}
                role="progressbar"
                aria-valuenow={vpProgress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            <p className="text-xs text-content-muted">
              {currentLevelVp} / {nextLevelVp} points to next level
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            {/* Coins */}
            <div className="rounded-soft bg-surface-sunken p-3">
              <p className="text-xs text-content-secondary mb-1">Coins</p>
              <p className="text-lg font-bold text-accent">{balance}</p>
            </div>

            {/* Current Streak */}
            <div className="rounded-soft bg-surface-sunken p-3">
              <p className="text-xs text-content-secondary mb-1">Streak</p>
              <p className="text-lg font-bold text-content">{currentStreak}</p>
            </div>

            {/* Best Streak */}
            <div className="rounded-soft bg-surface-sunken p-3">
              <p className="text-xs text-content-secondary mb-1">Best</p>
              <p className="text-lg font-bold text-content">{bestStreak}</p>
            </div>

            {/* Badges */}
            <div className="rounded-soft bg-surface-sunken p-3">
              <p className="text-xs text-content-secondary mb-1">Badges</p>
              <p className="text-lg font-bold text-content">{earnedBadgesCount}</p>
            </div>

            {/* Total Streaks */}
            <div className="rounded-soft bg-surface-sunken p-3">
              <p className="text-xs text-content-secondary mb-1">Streaks</p>
              <p className="text-lg font-bold text-content">{activeStreaks.length}</p>
            </div>

            {/* Available Badges */}
            <div className="rounded-soft bg-surface-sunken p-3">
              <p className="text-xs text-content-secondary mb-1">Available</p>
              <p className="text-lg font-bold text-content">{badges.length}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
