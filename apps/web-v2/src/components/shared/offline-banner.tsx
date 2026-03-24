import { useOnlineStatus } from '@/hooks/use-online-status'
import { WifiOff } from 'lucide-react'

export function OfflineBanner() {
  const isOnline = useOnlineStatus()

  if (isOnline) return null

  return (
    <div
      className="flex items-center justify-center gap-2 bg-info-light px-4 py-2 text-sm font-medium text-info-dark"
      role="status"
      aria-live="polite"
    >
      <WifiOff className="h-4 w-4" aria-hidden="true" />
      <span>You're offline. Changes will save when you reconnect.</span>
    </div>
  )
}
