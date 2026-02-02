import { type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import styles from './FloatingActionButton.module.css'

export interface FloatingActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
}

/**
 * Floating action button (FAB) for primary actions
 */
export function FloatingActionButton({
  icon,
  children,
  position = 'bottom-right',
  className,
  ...props
}: FloatingActionButtonProps) {
  return (
    <button
      type="button"
      className={cn(styles.fab, styles[position], className)}
      {...props}
    >
      {icon || children || (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      )}
    </button>
  )
}
