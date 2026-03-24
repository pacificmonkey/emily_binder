import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'

interface Toast {
  id: string
  title: string
  description?: string
  variant?: 'default' | 'success' | 'error' | 'info'
  action?: { label: string; onClick: () => void }
  duration?: number
}

interface ToastContextValue {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within ToastProvider')
  return context
}

// Simple global toast function
let globalAddToast: ((toast: Omit<Toast, 'id'>) => void) | null = null

export function toast(params: Omit<Toast, 'id'>) {
  globalAddToast?.(params)
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { ...toast, id }])

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, toast.duration ?? 4000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  useEffect(() => {
    globalAddToast = addToast
    return () => { globalAddToast = null }
  }, [addToast])

  const variantStyles = {
    default: 'bg-surface border-border',
    success: 'bg-success-light border-success',
    error: 'bg-danger-light border-danger',
    info: 'bg-info-light border-info',
  }

  const variantIcons = {
    default: null,
    success: <CheckCircle className="h-5 w-5 text-success" />,
    error: <AlertCircle className="h-5 w-5 text-danger" />,
    info: <Info className="h-5 w-5 text-info" />,
  }

  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-2 sm:bottom-4" role="region" aria-label="Notifications">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          aria-live="polite"
          className={cn(
            'flex items-start gap-3 rounded-soft border p-4 shadow-raised animate-slide-up max-w-sm',
            variantStyles[t.variant ?? 'default']
          )}
        >
          {variantIcons[t.variant ?? 'default']}
          <div className="flex-1">
            <p className="text-sm font-medium text-content">{t.title}</p>
            {t.description && <p className="mt-1 text-xs text-content-secondary">{t.description}</p>}
            {t.action && (
              <button
                onClick={t.action.onClick}
                className="mt-2 text-xs font-medium text-accent hover:underline"
              >
                {t.action.label}
              </button>
            )}
          </div>
          <button
            onClick={() => removeToast(t.id)}
            className="rounded p-1 hover:bg-surface-sunken"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4 text-content-muted" />
          </button>
        </div>
      ))}
    </div>
  )
}
