/**
 * GraceTokenModal - Confirmation modal for using a grace token to protect a streak
 */

import { useState } from 'react'
import { Modal, Button } from '@/components/ui'
import { useGraceTokens, useUseGraceToken } from '@/hooks/useStreaks'
import styles from './GraceTokenModal.module.css'

interface GraceTokenModalProps {
  isOpen: boolean
  onClose: () => void
  missionId: string
  missionTitle: string
  currentStreak: number
}

export function GraceTokenModal({
  isOpen,
  onClose,
  missionId,
  missionTitle,
  currentStreak,
}: GraceTokenModalProps) {
  const { data: graceTokens } = useGraceTokens()
  const useToken = useUseGraceToken()
  const [isUsing, setIsUsing] = useState(false)

  const tokenCount = graceTokens?.quantity ?? 0
  const hasTokens = tokenCount > 0

  const handleUseToken = async () => {
    setIsUsing(true)
    try {
      await useToken.mutateAsync(missionId)
      onClose()
    } catch (error) {
      console.error('Failed to use grace token:', error)
    } finally {
      setIsUsing(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Protect Your Streak">
      <div className={styles.content}>
        <div className={styles.streakInfo}>
          <span className={styles.streakIcon}>🔥</span>
          <div className={styles.streakDetails}>
            <span className={styles.streakTitle}>{missionTitle}</span>
            <span className={styles.streakCount}>{currentStreak} week streak</span>
          </div>
        </div>

        <p className={styles.description}>
          Your streak is at risk! Use a grace token to protect it for this week.
        </p>

        <div className={styles.tokenInfo}>
          <div className={styles.tokenBalance}>
            <span className={styles.tokenIcon}>🛡️</span>
            <span>You have <strong>{tokenCount}</strong> grace token{tokenCount !== 1 ? 's' : ''}</span>
          </div>
          {!hasTokens && (
            <p className={styles.noTokens}>
              You don't have any grace tokens. Visit the Shop to purchase some.
            </p>
          )}
        </div>

        <div className={styles.actions}>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleUseToken}
            disabled={!hasTokens || isUsing}
          >
            {isUsing ? 'Using...' : 'Use 1 Token'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
