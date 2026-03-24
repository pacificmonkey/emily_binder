import { useState } from 'react'
import { useBadges } from '@/hooks/use-badges'
import { cn } from '@/lib/utils'

export function BadgeGrid() {
  const { data: badges = [], isLoading } = useBadges()
  const [hoveredBadgeId, setHoveredBadgeId] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square rounded-soft bg-surface-sunken animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (badges.length === 0) {
    return (
      <div className="rounded-soft bg-surface-sunken border border-border p-8 text-center">
        <p className="text-content-secondary">No badges yet. Start your missions to earn your first badge!</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
      {badges.map((badge) => {
        const badgeId = badge.badge_id
        const isHovered = hoveredBadgeId === badgeId
        const earnedDate = badge.earned_at ? new Date(badge.earned_at).toLocaleDateString() : null

        return (
          <div
            key={badgeId}
            className="relative group"
            onMouseEnter={() => setHoveredBadgeId(badgeId)}
            onMouseLeave={() => setHoveredBadgeId(null)}
          >
            <div
              className={cn(
                'aspect-square rounded-soft flex items-center justify-center cursor-help transition-all duration-200 relative',
                badge.earned
                  ? 'bg-surface-sunken shadow-soft hover:shadow-raised hover:scale-105'
                  : 'bg-surface-sunken opacity-50'
              )}
            >
              <span className="text-2xl sm:text-3xl">{badge.emoji}</span>

              {/* Lock overlay for unearned badges */}
              {!badge.earned && (
                <div className="absolute inset-0 rounded-soft flex items-center justify-center bg-black/30">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm6-10V7a3 3 0 00-3-3H9a3 3 0 00-3 3v4h12V7z"
                    />
                  </svg>
                </div>
              )}

              {/* Earned indicator dot */}
              {badge.earned && badge.earned_at && (
                <div className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full" />
              )}

              {/* Tooltip - shown on hover */}
              {isHovered && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-max max-w-xs">
                  <div className="rounded-soft bg-content text-surface text-xs p-2 shadow-raised">
                    <p className="font-semibold text-sm">{badge.name}</p>
                    <p className="text-content-secondary mt-1">{badge.description}</p>
                    {badge.earned && earnedDate && (
                      <p className="text-content-muted mt-2 text-xs">Earned {earnedDate}</p>
                    )}
                    {!badge.earned && (
                      <p className="text-content-muted mt-2 text-xs">Locked - Keep earning to unlock!</p>
                    )}
                  </div>
                  {/* Arrow */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -translate-y-1 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-content" />
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
