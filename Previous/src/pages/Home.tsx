import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, Button, FloatingActionButton, Skeleton } from '@/components/ui'
import { StickerCanvas, StickerPicker } from '@/components/stickers'
import { ThemeSettings } from '@/components/settings'
import { useEconomyDisplay } from '@/hooks/useEconomy'
import { useTodayMissions } from '@/hooks/useMissions'
import { useMoodCheckinStatus } from '@/hooks/useMood'
import { useRecentBadges, BADGE_INFO } from '@/hooks/useBadges'
import { useTopStreaks } from '@/hooks/useStreaks'
import { usePermissions } from '@/hooks/usePermissions'
import { runRollover, needsRollover } from '@/services/rollover'
import styles from './Home.module.css'

export function HomePage() {
  const { profile, user } = useAuth()
  const navigate = useNavigate()
  const { isEmily, isJoey } = usePermissions()
  const [showStickerPicker, setShowStickerPicker] = useState(false)
  const [showThemeSettings, setShowThemeSettings] = useState(false)

  const canChangeTheme = isEmily || isJoey

  // Run rollover on app load
  useEffect(() => {
    if (user && needsRollover()) {
      runRollover(user.id).catch(console.error)
    }
  }, [user])

  // Data fetching
  const { state: economyState, levelProgress, isLoading: economyLoading } = useEconomyDisplay()
  const { data: todayMissions, isLoading: missionsLoading } = useTodayMissions()
  const { data: moodStatus } = useMoodCheckinStatus()
  const { data: recentBadges } = useRecentBadges(3)
  const { data: topStreaks } = useTopStreaks(2)

  // Calculate today stats
  const completedCount = todayMissions?.filter(m => m.isCompleted).length ?? 0
  const remainingCount = todayMissions?.filter(m => !m.isCompleted).length ?? 0

  return (
    <div className={styles.container}>
      {/* Sticker Canvas (background layer) */}
      <StickerCanvas />

      <header className={styles.header}>
        <div className={styles.headerTop}>
          <h1 className={styles.greeting}>
            Hi, {profile?.display_name || 'there'}!
          </h1>
          {canChangeTheme && (
            <button
              className={styles.settingsButton}
              onClick={() => setShowThemeSettings(true)}
              aria-label="Theme settings"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          )}
        </div>
        <p className={styles.subtitle}>How are you doing today?</p>
      </header>

      {/* Today Status */}
      <Card variant="elevated" className={styles.statusCard}>
        <CardContent>
          {missionsLoading ? (
            <div className={styles.stats}>
              <div className={styles.stat}>
                <Skeleton variant="text" width={40} height={32} />
                <Skeleton variant="text" width={30} height={14} />
              </div>
              <div className={styles.statDivider} />
              <div className={styles.stat}>
                <Skeleton variant="text" width={40} height={32} />
                <Skeleton variant="text" width={30} height={14} />
              </div>
            </div>
          ) : (
            <div className={styles.stats}>
              <div className={styles.stat}>
                <span className={styles.statValue}>{completedCount}</span>
                <span className={styles.statLabel}>done</span>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.stat}>
                <span className={styles.statValue}>{remainingCount}</span>
                <span className={styles.statLabel}>left</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gamification Summary */}
      <div className={styles.gamificationRow}>
        <Card className={styles.gamificationCard}>
          <CardContent>
            <span className={styles.gamificationIcon}>✨</span>
            {economyLoading ? (
              <Skeleton variant="text" width={36} height={24} />
            ) : (
              <span className={styles.gamificationValue}>{economyState?.total_vp ?? 0}</span>
            )}
            <span className={styles.gamificationLabel}>VP</span>
          </CardContent>
        </Card>
        <Card className={styles.gamificationCard}>
          <CardContent>
            <span className={styles.gamificationIcon}>⭐</span>
            {economyLoading ? (
              <Skeleton variant="text" width={24} height={24} />
            ) : (
              <span className={styles.gamificationValue}>{economyState?.current_level ?? 1}</span>
            )}
            <span className={styles.gamificationLabel}>Level</span>
          </CardContent>
        </Card>
        <Card className={styles.gamificationCard}>
          <CardContent>
            <span className={styles.gamificationIcon}>🪙</span>
            {economyLoading ? (
              <Skeleton variant="text" width={30} height={24} />
            ) : (
              <span className={styles.gamificationValue}>{economyState?.coins ?? 0}</span>
            )}
            <span className={styles.gamificationLabel}>Coins</span>
          </CardContent>
        </Card>
      </div>

      {/* Level Progress */}
      {levelProgress && !economyLoading && (
        <div className={styles.levelProgress}>
          <div className={styles.levelProgressLabel}>
            <span>Level {levelProgress.currentLevel}</span>
            <span>{levelProgress.vpProgress}/{levelProgress.vpForNextLevel - levelProgress.vpForCurrentLevel} VP</span>
          </div>
          <div className={styles.levelProgressTrack}>
            <div
              className={styles.levelProgressFill}
              style={{ width: `${levelProgress.progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Recent Badges */}
      {recentBadges && recentBadges.length > 0 && (
        <div className={styles.badgesSection}>
          <h3 className={styles.sectionTitle}>Recent Badges</h3>
          <div className={styles.badgesList}>
            {recentBadges.map(badge => {
              const info = BADGE_INFO[badge.badge_type as keyof typeof BADGE_INFO]
              return (
                <div key={badge.id} className={styles.badge}>
                  <span className={styles.badgeIcon}>{info?.icon || '🏅'}</span>
                  <span className={styles.badgeName}>{badge.badge_name}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Top Streaks */}
      {topStreaks && topStreaks.length > 0 && (
        <div className={styles.streaksSection}>
          <h3 className={styles.sectionTitle}>Streaks</h3>
          <div className={styles.streaksList}>
            {topStreaks.map(streak => (
              <div key={streak.id} className={styles.streak}>
                <span className={styles.streakIcon}>🔥</span>
                <span className={styles.streakCount}>{streak.current_streak} weeks</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mood Check-in Widget */}
      <Card variant="outlined" className={styles.moodCard}>
        <CardContent>
          <h2 className={styles.moodTitle}>How are you feeling?</h2>
          {moodStatus?.canCheckin ? (
            <>
              <p className={styles.moodSubtitle}>Tap to check in</p>
              <Button variant="secondary" className={styles.moodButton}>
                Check In
              </Button>
            </>
          ) : moodStatus?.cooldownMinutes ? (
            <p className={styles.moodSubtitle}>
              Available in {moodStatus.cooldownMinutes} minutes
            </p>
          ) : (
            <p className={styles.moodSubtitle}>
              You've checked in {moodStatus?.checkinsToday}/{moodStatus?.maxCheckins} times today
            </p>
          )}
        </CardContent>
      </Card>

      {/* Add Sticker Button */}
      <button
        className={styles.stickerButton}
        aria-label="Add sticker"
        onClick={() => setShowStickerPicker(true)}
      >
        <span className={styles.stickerButtonIcon}>🎨</span>
      </button>

      {/* Add Mission Button */}
      <FloatingActionButton
        aria-label="Add new mission"
        onClick={() => navigate('/today')}
      />

      {/* Sticker Picker Modal */}
      <StickerPicker
        isOpen={showStickerPicker}
        onClose={() => setShowStickerPicker(false)}
      />

      {/* Theme Settings Modal */}
      <ThemeSettings
        isOpen={showThemeSettings}
        onClose={() => setShowThemeSettings(false)}
      />
    </div>
  )
}
