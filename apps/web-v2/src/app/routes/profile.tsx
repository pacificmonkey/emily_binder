import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/shared/page-header'
import { ProfileStats } from '@/components/profile/profile-stats'
import { BadgeGrid } from '@/components/profile/badge-grid'
import { useAuthStore } from '@/stores/auth-store'
import { useStreaks } from '@/hooks/use-streaks'
import { Button } from '@/components/ui/button'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { displayName, role } = useAuthStore()
  const { data: streaks = [] } = useStreaks()

  const activeStreaks = streaks.filter((s) => s.state?.status === 'ongoing')

  return (
    <div className="space-y-6 pb-20">
      {/* Header with name and role */}
      <div>
        <PageHeader
          title={displayName || 'Profile'}
          subtitle={role ? `${role.charAt(0).toUpperCase() + role.slice(1)}` : undefined}
        />
      </div>

      {/* Quick Links */}
      <div className="flex flex-wrap gap-3">
        <Button
          variant="secondary"
          className="rounded-pill text-sm"
          onClick={() => navigate('/store')}
        >
          🛍️ Shop
        </Button>
        <Button
          variant="secondary"
          className="rounded-pill text-sm"
          onClick={() => navigate('/goals')}
        >
          🎯 Goals
        </Button>
        <Button
          variant="secondary"
          className="rounded-pill text-sm"
          onClick={() => navigate('/settings')}
        >
          ⚙️ Settings
        </Button>
      </div>

      {/* Profile Stats Card */}
      <ProfileStats />

      {/* Active Streaks Section */}
      {activeStreaks.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-content">Active Streaks</h2>
          <div className="flex flex-wrap gap-3">
            {activeStreaks.map((streak) => (
              <div
                key={streak.streak_definition_id}
                className={cn(
                  'inline-flex items-center gap-2 rounded-pill px-4 py-2',
                  'bg-surface-sunken text-content font-medium text-sm',
                  'shadow-soft'
                )}
              >
                <span className="text-lg">{streak.emoji || '🔥'}</span>
                <span>
                  {streak.name}{' '}
                  <span className="text-accent font-bold">
                    {streak.state?.current_count ?? 0}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Badges Section */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-content">Badges</h2>
        <BadgeGrid />
      </div>
    </div>
  )
}
