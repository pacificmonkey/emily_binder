import { cn } from '@/lib/utils'
import styles from './LoadingSpinner.module.css'

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  return (
    <div className={cn(styles.spinner, styles[size], className)} role="status" aria-label="Loading">
      <span className="visually-hidden">Loading...</span>
    </div>
  )
}

export interface LoadingScreenProps {
  message?: string
}

export function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  return (
    <div className={styles.screen}>
      <LoadingSpinner size="lg" />
      <p className={styles.message}>{message}</p>
    </div>
  )
}
