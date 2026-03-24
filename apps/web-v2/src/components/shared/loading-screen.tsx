import { Skeleton } from './loading-skeleton'

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
