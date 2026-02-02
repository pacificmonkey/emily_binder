import { Card, CardContent } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import styles from './MissionCardSkeleton.module.css'

interface MissionCardSkeletonProps {
  count?: number
}

/**
 * Skeleton loading state for mission cards
 */
export function MissionCardSkeleton({ count = 1 }: MissionCardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className={styles.card}>
          <CardContent className={styles.content}>
            <div className={styles.header}>
              <Skeleton variant="circular" width={24} height={24} />
              <div className={styles.titleArea}>
                <Skeleton variant="text" width="70%" height={18} />
                <Skeleton variant="text" width="40%" height={14} />
              </div>
            </div>
            <div className={styles.actions}>
              <Skeleton variant="rectangular" width={60} height={28} />
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  )
}
