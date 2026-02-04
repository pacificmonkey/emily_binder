import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useOnboarding } from '@/hooks/useOnboarding'
import { type ReactNode } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth()
  const { isLoading: onboardingLoading, error: onboardingError } = useOnboarding()

  const isLoading = authLoading || (user && onboardingLoading)

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'var(--color-background)',
          gap: '1rem',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            border: '3px solid var(--color-border)',
            borderTopColor: 'var(--color-primary)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <div style={{ color: 'var(--color-text-muted)' }}>
          {onboardingLoading ? 'Setting up your workspace...' : 'Loading...'}
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (onboardingError) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'var(--color-background)',
          padding: '2rem',
          textAlign: 'center',
        }}
      >
        <h2 style={{ color: 'var(--color-error)', marginBottom: '1rem' }}>
          Setup Failed
        </h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
          {onboardingError.message}
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'var(--color-primary)',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer',
          }}
        >
          Try Again
        </button>
      </div>
    )
  }

  return <>{children}</>
}
