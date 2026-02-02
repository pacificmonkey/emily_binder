import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { LoadingScreen } from '@/components/ui'
import type { Role } from '@/types/database'

export interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: Role | Role[]
  fallback?: React.ReactNode
}

export function ProtectedRoute({
  children,
  requiredRole,
  fallback,
}: ProtectedRouteProps) {
  const { user, profile, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <LoadingScreen message="Loading..." />
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requiredRole && profile) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
    if (!roles.includes(profile.role_global)) {
      if (fallback) {
        return <>{fallback}</>
      }
      return <Navigate to="/" replace />
    }
  }

  return <>{children}</>
}
