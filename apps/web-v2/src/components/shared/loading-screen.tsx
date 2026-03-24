import { Skeleton } from './loading-skeleton'

/**
 * Full-viewport loading screen.
 * Used by ProtectedRoute to block all content until auth state is resolved.
 * Must cover the entire viewport so no protected content leaks through.
 */
export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface">
      <div className="space-y-4 w-full max-w-md p-12">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  )
}
