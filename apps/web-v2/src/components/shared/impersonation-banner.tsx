import { useAuthStore } from '@/stores/auth-store'
import { X } from 'lucide-react'

export function ImpersonationBanner() {
  const { impersonatedPatientName, setImpersonation } = useAuthStore()

  return (
    <div
      className="flex items-center justify-center gap-2 bg-warning px-4 py-2 text-sm font-medium text-warning-dark"
      role="status"
      aria-live="polite"
    >
      <span>Viewing as {impersonatedPatientName ?? 'patient'}</span>
      <button
        onClick={() => setImpersonation(null)}
        className="rounded-pill p-1 hover:bg-warning-dark/10"
        aria-label="Stop impersonation"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
