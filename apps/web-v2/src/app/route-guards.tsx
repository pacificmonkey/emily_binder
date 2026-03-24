import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth-store'

export function ProtectedRoute() {
  const { user, loading } = useAuthStore()

  if (loading) return null // Layout handles loading state
  if (!user) return <Navigate to="/login" replace />

  return <Outlet />
}

export function AdminRoute() {
  const { role } = useAuthStore()

  if (role !== 'admin') return <Navigate to="/" replace />

  return <Outlet />
}

export function MemberRoute() {
  const { role, isImpersonating } = useAuthStore()

  // Admins, members, and support can all access member routes
  if (role === 'admin' || role === 'member' || role === 'support' || isImpersonating) {
    return <Outlet />
  }

  return <Navigate to="/" replace />
}

export function SupportRoute() {
  const { role } = useAuthStore()

  if (role !== 'support' && role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
