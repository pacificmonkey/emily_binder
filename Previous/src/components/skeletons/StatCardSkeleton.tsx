import { Card, CardContent } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import styles from './StatCardSkeleton.module.css'

interface StatCardSkeletonProps {
  count?: number
}

/**
 * Skeleton loading state for stat cards on Home page
 */
export function StatCardSkeleton({ count = 1 }: StatCardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className={styles.card}>
          <CardContent className={styles.content}>
            <div className={styles.iconArea}>
              <Skeleton variant="circular" width={40} height={40} />
            </div>
            <div className={styles.textArea}>
              <Skeleton variant="text" width={80} height={14} />
              <Skeleton variant="text" width={50} height={24} />
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  )
}
