import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-soft bg-surface-sunken',
        className
      )}
    />
  )
}

export function CardSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('rounded-soft bg-surface shadow-soft p-4 space-y-3', className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="h-6 w-6 rounded" />
        <Skeleton className="h-5 w-48" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-5 w-16 rounded-pill" />
        <Skeleton className="h-5 w-12 rounded-pill" />
      </div>
    </div>
  )
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}

export function LoadingScreen() {
  return (
    <div className="flex items-center justify-center p-12">
      <div className="space-y-4 w-full max-w-md">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  )
}
