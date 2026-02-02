import { type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from './Card'
import { Button } from './Button'
import styles from './ErrorCard.module.css'

export interface ErrorCardProps extends HTMLAttributes<HTMLDivElement> {
  error: Error | unknown
  resourceName?: string
  onRetry?: () => void
}

/**
 * Standardized error display component with optional retry
 */
export function ErrorCard({ error, resourceName, onRetry, className, ...props }: ErrorCardProps) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error'
  const title = resourceName ? `Error loading ${resourceName}` : 'Error'

  return (
    <Card className={cn(styles.errorCard, className)} {...props}>
      <CardContent>
        <div className={styles.content}>
          <strong className={styles.title}>{title}:</strong>
          <span className={styles.message}>{errorMessage}</span>
          {onRetry && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onRetry}
              className={styles.retryButton}
            >
              Try Again
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
