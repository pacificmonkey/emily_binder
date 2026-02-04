import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { Login } from '@/pages/Login'
import { Home } from '@/pages/Home'

// Lazy load less frequently accessed pages for better initial load
const Calendar = lazy(() => import('@/pages/Calendar').then(m => ({ default: m.Calendar })))
const Health = lazy(() => import('@/pages/Health').then(m => ({ default: m.Health })))
const Wellbeing = lazy(() => import('@/pages/Wellbeing').then(m => ({ default: m.Wellbeing })))
const Budget = lazy(() => import('@/pages/Budget').then(m => ({ default: m.Budget })))
const Recipes = lazy(() => import('@/pages/Recipes').then(m => ({ default: m.Recipes })))
const Shopping = lazy(() => import('@/pages/Shopping').then(m => ({ default: m.Shopping })))
const Store = lazy(() => import('@/pages/Store').then(m => ({ default: m.Store })))
const StickerWall = lazy(() => import('@/pages/StickerWall').then(m => ({ default: m.StickerWall })))
const Admin = lazy(() => import('@/pages/Admin').then(m => ({ default: m.Admin })))

// Loading fallback component
function PageLoader() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div>Loading...</div>
    </div>
  )
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return null
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      {/* Placeholder routes for future pages */}
      <Route
        path="/tasks"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/calendar"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <Calendar />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/health"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <Health />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/wellbeing"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <Wellbeing />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/budget"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <Budget />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/recipes"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <Recipes />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/shopping"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <Shopping />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/shop"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <Store />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/sticker-wall"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <StickerWall />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <Admin />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
