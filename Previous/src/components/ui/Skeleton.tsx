import { type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import styles from './Skeleton.module.css'

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
  animation?: 'pulse' | 'wave' | 'none'
}

/**
 * Skeleton loading placeholder component
 */
export function Skeleton({
  variant = 'text',
  width,
  height,
  animation = 'pulse',
  className,
  style,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        styles.skeleton,
        styles[variant],
        animation !== 'none' && styles[animation],
        className
      )}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        ...style,
      }}
      {...props}
    />
  )
}

/**
 * Pre-configured text line skeleton
 */
export function SkeletonText({
  lines = 1,
  className,
  ...props
}: SkeletonProps & { lines?: number }) {
  return (
    <div className={cn(styles.textContainer, className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          width={i === lines - 1 && lines > 1 ? '60%' : '100%'}
          {...props}
        />
      ))}
    </div>
  )
}
