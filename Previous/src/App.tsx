import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { AppLayout, ProtectedRoute } from '@/components/layout'

// Lazy load all pages for code splitting
const HomePage = lazy(() => import('@/pages/Home').then(m => ({ default: m.HomePage })))
const TodayPage = lazy(() => import('@/pages/Today').then(m => ({ default: m.TodayPage })))
const CalendarPage = lazy(() => import('@/pages/Calendar').then(m => ({ default: m.CalendarPage })))
const HealthPage = lazy(() => import('@/pages/Health').then(m => ({ default: m.HealthPage })))
const GoalsPage = lazy(() => import('@/pages/Goals').then(m => ({ default: m.GoalsPage })))
const ShopPage = lazy(() => import('@/pages/Shop').then(m => ({ default: m.ShopPage })))
const LoginPage = lazy(() => import('@/pages/Login').then(m => ({ default: m.LoginPage })))
const AdminPage = lazy(() => import('@/pages/Admin').then(m => ({ default: m.AdminPage })))
const BudgetPage = lazy(() => import('@/pages/Budget').then(m => ({ default: m.BudgetPage })))

function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{
        width: 40,
        height: 40,
        border: '3px solid #e5e7eb',
        borderTopColor: '#6366f1',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      console.error('[Query Error]', query.queryKey, error)
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      console.error('[Mutation Error]', error)
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />

            {/* Protected routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <HomePage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/today"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <TodayPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/calendar"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <CalendarPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/health"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <HealthPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/goals"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <GoalsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/shop"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <ShopPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/budget"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <BudgetPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole="joey">
                  <AppLayout>
                    <AdminPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
              </Routes>
            </Suspense>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
